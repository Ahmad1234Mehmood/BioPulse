"""
Metrics routes for system performance monitoring and analytics.
Triggers evaluation pipeline and serves biometric curves (ROC, DET, CMC).

New endpoints (Phase 3 improvements):
  GET /operating-points      — FAR-targeted threshold analysis
  GET /metric-comparison     — Cosine vs. Euclidean distance comparison
  GET /rotation-robustness   — Rotation robustness evaluation
"""

from fastapi import APIRouter, HTTPException
from typing import Dict, Any
import logging
import json
from pathlib import Path

from app.services.metrics_service import BiometricMetricsService
from app.services.enrollment_service import EnrollmentService

router = APIRouter()
logger = logging.getLogger(__name__)

metrics_service = BiometricMetricsService()

# Cache for the main pipeline — prevents re-running on every request
cached_metrics: Dict[str, Any] = {}


# =============================================================================
# Main evaluation pipeline
# =============================================================================

@router.get("/run")
async def run_metrics_evaluation(force: bool = False, bypass_detection: bool = False) -> Dict[str, Any]:
    """
    Triggers the full biometric evaluation pipeline on the probe set.
    Computes ROC, DET, CMC, EER, FTA rate, operating points, and metric comparison.
    Results are cached until the server restarts.
    """
    global cached_metrics
    if cached_metrics and not force and cached_metrics.get("bypass_detection") == bypass_detection:
        return {
            "status": "success",
            "message": "Evaluation retrieved from cache",
            "data": cached_metrics
        }

    try:
        results = metrics_service.generate_all_metrics(bypass_detection=bypass_detection)
        if "error" in results:
            raise HTTPException(status_code=400, detail=results["error"])
        cached_metrics = results
        return {
            "status": "success",
            "message": "Evaluation completed successfully",
            "data": cached_metrics
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Metrics evaluation failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Evaluation error: {str(e)}")


async def _ensure_cached():
    """Run evaluation if not yet cached."""
    if not cached_metrics:
        await run_metrics_evaluation()


# =============================================================================
# Individual curve/summary endpoints (backward-compatible)
# =============================================================================

@router.get("/summary")
async def get_summary() -> Dict[str, Any]:
    """Returns summary statistics (EER, FTA rate, Rank-N, effective Rank-1)."""
    await _ensure_cached()
    return {"status": "success", "data": cached_metrics["summary"]}


@router.get("/roc")
async def get_roc_curve() -> Dict[str, Any]:
    """Returns ROC curve data (FPR, TPR, thresholds, AUC)."""
    await _ensure_cached()
    return {"status": "success", "data": cached_metrics["roc"]}


@router.get("/det")
async def get_det_curve() -> Dict[str, Any]:
    """Returns DET curve data (FAR, FRR, thresholds)."""
    await _ensure_cached()
    return {"status": "success", "data": cached_metrics["det"]}


@router.get("/cmc")
async def get_cmc_curve() -> Dict[str, Any]:
    """Returns CMC curve data (ranks, identification rates)."""
    await _ensure_cached()
    return {"status": "success", "data": cached_metrics["cmc"]}


# =============================================================================
# New endpoints — Improvements 3, 4, 5
# =============================================================================

@router.get("/operating-points")
async def get_operating_points() -> Dict[str, Any]:
    """
    [Improvement 3] Returns verification thresholds at standard FAR operating points.

    Reports the threshold, actual FAR, and FRR at:
      - FAR = 0.1%  (high-security deployment)
      - FAR = 1.0%  (medium-security deployment)
      - FAR = 10.0% (permissive / watchlist deployment)

    Follows NIST FRVT reporting conventions.
    """
    await _ensure_cached()
    return {
        "status": "success",
        "description": "Threshold analysis at standard FAR operating points (NIST FRVT format)",
        "data": cached_metrics.get("operating_points", [])
    }


@router.get("/metric-comparison")
async def get_metric_comparison() -> Dict[str, Any]:
    """
    [Improvement 4] Returns side-by-side comparison of Cosine Similarity vs. Euclidean distance.

    Both metrics are evaluated on the same score distributions.
    Reports EER and ROC-AUC for each, and recommends the better metric.
    """
    await _ensure_cached()
    return {
        "status": "success",
        "description": "Cosine Similarity vs. Euclidean (L2) distance metric ablation",
        "data": cached_metrics.get("metric_comparison", {})
    }


@router.get("/rotation-robustness")
async def get_rotation_robustness() -> Dict[str, Any]:
    """
    [Improvement 5] Runs and returns the rotation robustness evaluation.

    Tests the system under 5 conditions:
      1. Upright (baseline) — auto_orient ON
      2. 90° CW  — auto_orient ON  (tests correction capability)
      3. 180°    — auto_orient ON  (tests correction capability)
      4. 90° CCW — auto_orient ON  (tests correction capability)
      5. 90° CW  — auto_orient OFF (degraded baseline, shows what correction fixes)

    Reports FTA rate, EER, Rank-1, Rank-5, and Effective Rank-1 per condition.
    NOTE: This is an independent heavy experiment — always runs fresh (not cached).
    """
    try:
        enrollment_service = EnrollmentService()
        enrolled_templates = enrollment_service.load_all_templates()
        if not enrolled_templates:
            raise HTTPException(status_code=400, detail="No enrolled templates found.")

        results = metrics_service.run_rotation_robustness_experiment(
            enrolled_templates, subject_limit=25
        )
        return {
            "status": "success",
            "data": results
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Rotation robustness experiment failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Experiment error: {str(e)}")

@router.get("/dataset-stats")
async def get_dataset_stats() -> Dict[str, Any]:
    """
    Returns actual dataset stats loaded from dataset_stats.json.
    """
    base_dir = Path(__file__).resolve().parent.parent.parent
    stats_file = base_dir / "data" / "dataset_stats.json"
    if not stats_file.exists():
        raise HTTPException(status_code=404, detail="dataset_stats.json not found")
    try:
        with open(stats_file, "r") as f:
            data = json.load(f)
        return {"status": "success", "data": data}
    except Exception as e:
        logger.error(f"Failed to read dataset_stats.json: {e}")
        raise HTTPException(status_code=500, detail="Error reading stats file")
