"""
Metrics routes for system performance monitoring and analytics.
Triggers evaluation pipeline and serves biometric curves (ROC, DET, CMC).
"""

from fastapi import APIRouter, HTTPException
from typing import Dict, Any, Optional
import logging
import json
from pathlib import Path

from app.services.metrics_service import BiometricMetricsService
from app.services.enrollment_service import EnrollmentService

router = APIRouter()
logger = logging.getLogger(__name__)

metrics_service = BiometricMetricsService()

# Cache keyed by str(subject_limit): "25" for demo, "None" for full
cached_metrics: Dict[str, Any] = {}


# =============================================================================
# Main evaluation pipeline
# =============================================================================

@router.get("/run")
async def run_metrics_evaluation(force: bool = False, subject_limit: Optional[int] = None) -> Dict[str, Any]:
    global cached_metrics
    cache_key = str(subject_limit)
    if cache_key in cached_metrics and not force:
        return {"status": "success", "message": "Evaluation retrieved from cache", "data": cached_metrics[cache_key]}
    try:
        results = metrics_service.generate_all_metrics(subject_limit=subject_limit)
        if "error" in results:
            raise HTTPException(status_code=400, detail=results["error"])
        cached_metrics[cache_key] = results
        return {"status": "success", "message": "Evaluation completed successfully", "data": cached_metrics[cache_key]}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Metrics evaluation failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Evaluation error: {str(e)}")


async def _ensure_cached(subject_limit: Optional[int] = None):
    cache_key = str(subject_limit)
    if cache_key not in cached_metrics:
        await run_metrics_evaluation(subject_limit=subject_limit)


# =============================================================================
# Individual curve/summary endpoints
# =============================================================================

@router.get("/summary")
async def get_summary(subject_limit: Optional[int] = None) -> Dict[str, Any]:
    await _ensure_cached(subject_limit)
    return {"status": "success", "data": cached_metrics[str(subject_limit)]["summary"]}


@router.get("/roc")
async def get_roc_curve(subject_limit: Optional[int] = None) -> Dict[str, Any]:
    await _ensure_cached(subject_limit)
    return {"status": "success", "data": cached_metrics[str(subject_limit)]["roc"]}


@router.get("/det")
async def get_det_curve(subject_limit: Optional[int] = None) -> Dict[str, Any]:
    await _ensure_cached(subject_limit)
    return {"status": "success", "data": cached_metrics[str(subject_limit)]["det"]}


@router.get("/cmc")
async def get_cmc_curve(subject_limit: Optional[int] = None) -> Dict[str, Any]:
    await _ensure_cached(subject_limit)
    return {"status": "success", "data": cached_metrics[str(subject_limit)]["cmc"]}


@router.get("/operating-points")
async def get_operating_points(subject_limit: Optional[int] = None) -> Dict[str, Any]:
    await _ensure_cached(subject_limit)
    return {
        "status": "success",
        "description": "Threshold analysis at standard FAR operating points (NIST FRVT format)",
        "data": cached_metrics[str(subject_limit)].get("operating_points", [])
    }


@router.get("/metric-comparison")
async def get_metric_comparison(subject_limit: Optional[int] = None) -> Dict[str, Any]:
    await _ensure_cached(subject_limit)
    return {
        "status": "success",
        "description": "Cosine Similarity vs. Euclidean (L2) distance metric ablation",
        "data": cached_metrics[str(subject_limit)].get("metric_comparison", {})
    }


@router.get("/rotation-robustness")
async def get_rotation_robustness() -> Dict[str, Any]:
    try:
        enrollment_service = EnrollmentService()
        enrolled_templates = enrollment_service.load_all_templates()
        if not enrolled_templates:
            raise HTTPException(status_code=400, detail="No enrolled templates found.")
        results = metrics_service.run_rotation_robustness_experiment(
            enrolled_templates, subject_limit=25
        )
        return {"status": "success", "data": results}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Rotation robustness experiment failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Experiment error: {str(e)}")


@router.get("/dataset-stats")
async def get_dataset_stats() -> Dict[str, Any]:
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
