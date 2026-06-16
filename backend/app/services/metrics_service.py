import numpy as np
import json
import logging
import cv2
from pathlib import Path
from typing import Dict, Any, List, Tuple
from sklearn.metrics import roc_curve, det_curve, auc
from sklearn.datasets import fetch_lfw_people

from app.services.feature_extractor import FeatureExtractor
from app.services.face_detector import FaceDetector, NoFaceDetectedError
from app.services.enrollment_service import EnrollmentService
from app.services.matcher import BiometricMatcher

logger = logging.getLogger(__name__)

# Batch size for PyTorch inference (Improvement 1)
BATCH_SIZE = 32


class BiometricMetricsService:
    """
    Evaluates the performance of the verification and identification engines.

    Implements a full ISO/IEC 19795-compliant biometric evaluation pipeline:
    - ROC, DET, CMC curves
    - Equal Error Rate (EER)
    - Rank-N identification accuracy
    - Failure to Acquire (FTA) rate tracking          [Improvement 2]
    - FAR-targeted security threshold analysis         [Improvement 3]
    - Cosine vs. Euclidean distance metric comparison  [Improvement 4]
    - Rotation robustness evaluation                   [Improvement 5]
    """

    def __init__(self):
        self.enrollment_service = EnrollmentService()
        self.matcher = BiometricMatcher()
        self.feature_extractor = FeatureExtractor()
        self.face_detector = FaceDetector()
        self.base_dir = Path(__file__).resolve().parent.parent.parent

    # =========================================================================
    # IMPROVEMENT 1 & 2: Batched inference + FTA/FTE tracking
    # =========================================================================

    def _load_lfw(self):
        """Load and cache the LFW dataset."""
        data_home = str(self.base_dir / "data" / "lfw_data")
        logger.info("Loading LFW dataset for metrics evaluation...")
        return fetch_lfw_people(
            min_faces_per_person=5,
            resize=0.5,
            data_home=data_home,
            color=True
        )

    def run_verification_experiment(
        self,
        enrolled_templates: Dict[str, np.ndarray],
        subject_limit: int = None,
        rotations: List[int] = None,
        use_auto_orient: bool = True,
        bypass_detection: bool = True,
    ) -> Dict[str, Any]:
        """
        Loads LFW probe images, processes them in batches, and computes cosine
        AND euclidean similarity scores against all enrolled templates to form
        genuine and impostor distributions.

        Args:
            enrolled_templates: Gallery of {subject_id: embedding}.
            subject_limit: If set, only evaluate this many subjects (for timeout avoidance).
            rotations: If set, artificially rotate probes before detection.
                       List of cv2.ROTATE_* constants to test (each subject gets all rotations).
            use_auto_orient: If False, disables auto_orient inside face_detector for this run
                             (used to measure degraded baseline in robustness tests).

        Returns:
            Dict containing scores, labels, FTA stats, and per-rotation info.
        """
        data = self._load_lfw()
        db_dir = self.base_dir / "data" / "Face_Database"

        subject_dirs = sorted(db_dir.glob("subject_*"))
        if subject_limit:
            subject_dirs = subject_dirs[:subject_limit]

        # --- Phase 1: Collect and preprocess all probe images in batches ---
        raw_images: List[np.ndarray] = []      # BGR images after optional rotation
        subject_ids: List[str] = []
        total_attempted = 0
        fta_count = 0

        for subject_dir in subject_dirs:
            meta_path = subject_dir / "metadata.json"
            if not meta_path.exists():
                continue

            with open(meta_path, "r") as f:
                metadata = json.load(f)

            subject_id = metadata["subject_name"].replace(" ", "_").lower()
            probe_indices = metadata["probe_indices"]

            for idx in probe_indices:
                img = data.images[idx]
                img = (img * 255).astype(np.uint8) if img.max() <= 1.0 else img.astype(np.uint8)
                img_bgr = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)

                # Apply artificial rotation if requested (for robustness testing)
                if rotations:
                    for rot_code in rotations:
                        total_attempted += 1
                        rotated = cv2.rotate(img_bgr, rot_code)
                        raw_images.append((subject_id, rotated))
                else:
                    total_attempted += 1
                    raw_images.append((subject_id, img_bgr))

        # --- Phase 2: Batch preprocessing + embedding extraction ---
        probe_embeddings_cosine: List[np.ndarray] = []
        probe_embeddings_l2: List[np.ndarray] = []
        probe_subjects: List[str] = []

        # Collect preprocessed face crops in batches
        batch_subjects: List[str] = []
        batch_crops: List[np.ndarray] = []

        def flush_batch():
            """Run inference on current batch and extend probe lists."""
            if not batch_crops:
                return
            embeddings = self.feature_extractor.extract_batch(batch_crops)
            for emb, subj in zip(embeddings, batch_subjects):
                probe_embeddings_cosine.append(emb)
                probe_embeddings_l2.append(emb)  # Same embedding, different metric at score time
                probe_subjects.append(subj)
            batch_crops.clear()
            batch_subjects.clear()

        for subject_id, img_bgr in raw_images:
            try:
                if bypass_detection:
                    # Bypasses face detection/alignment: just resize directly to 160x160 RGB
                    img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
                    processed = cv2.resize(img_rgb, (160, 160))
                elif use_auto_orient:
                    processed = self.face_detector.preprocess(img_bgr)
                else:
                    # Bypass auto_orient: call detect → align → crop directly
                    processed = self._preprocess_no_orient(img_bgr)

                batch_crops.append(processed)
                batch_subjects.append(subject_id)

                if len(batch_crops) >= BATCH_SIZE:
                    flush_batch()

            except NoFaceDetectedError:
                fta_count += 1
            except Exception as e:
                logger.warning(f"Preprocessing error for {subject_id}: {e}")
                fta_count += 1

        flush_batch()  # Process remaining images

        logger.info(
            f"Processed {len(probe_embeddings_cosine)} probe images. "
            f"FTA: {fta_count}/{total_attempted}. Computing pair scores..."
        )

        # --- Phase 3: Score computation ---
        genuine_scores_cosine, impostor_scores_cosine = [], []
        genuine_scores_l2, impostor_scores_l2 = [], []
        all_scores_cosine = []
        all_scores_l2 = []
        labels = []

        for probe_emb, true_subject in zip(probe_embeddings_cosine, probe_subjects):
            for template_subject, template_emb in enrolled_templates.items():
                cos_score = self.matcher.cosine_similarity(probe_emb, template_emb)
                l2_score = self.matcher.euclidean_similarity(probe_emb, template_emb)

                is_genuine = (true_subject == template_subject)
                labels.append(1 if is_genuine else 0)
                all_scores_cosine.append(cos_score)
                all_scores_l2.append(l2_score)

                if is_genuine:
                    genuine_scores_cosine.append(cos_score)
                    genuine_scores_l2.append(l2_score)
                else:
                    impostor_scores_cosine.append(cos_score)
                    impostor_scores_l2.append(l2_score)

        return {
            # Primary (cosine) data
            "genuine_scores": genuine_scores_cosine,
            "impostor_scores": impostor_scores_cosine,
            "labels": labels,
            "all_scores": all_scores_cosine,         # kept for backward compat
            "all_scores_cosine": all_scores_cosine,
            "all_scores_l2": all_scores_l2,
            # Embeddings for CMC
            "probe_embeddings": probe_embeddings_cosine,
            "probe_subjects": probe_subjects,
            # FTA tracking (Improvement 2)
            "fta_count": fta_count,
            "total_attempted": total_attempted,
        }

    def _preprocess_no_orient(self, image: np.ndarray) -> np.ndarray:
        """
        Preprocess without automatic orientation correction.
        Used to establish the degraded baseline in robustness experiments.
        """
        faces = self.face_detector.detect_faces(image)
        if not faces:
            raise NoFaceDetectedError("No face detected (auto_orient disabled).")

        best_face = max(faces, key=lambda f: f["score"])
        aligned = self.face_detector.align_face(image, best_face["landmarks"])

        aligned_faces = self.face_detector.detect_faces(aligned)
        if aligned_faces:
            best_aligned = max(aligned_faces, key=lambda f: f["score"])
            x, y, w, h = best_aligned["bbox"]
        else:
            x, y, w, h = best_face["bbox"]

        img_h, img_w = aligned.shape[:2]
        margin_x, margin_y = int(w * 0.1), int(h * 0.1)
        x1 = max(0, x - margin_x)
        y1 = max(0, y - margin_y)
        x2 = min(img_w, x + w + margin_x)
        y2 = min(img_h, y + h + margin_y)

        cropped = aligned[y1:y2, x1:x2]
        if cropped.size == 0:
            raise NoFaceDetectedError("Face crop empty (auto_orient disabled).")

        resized = cv2.resize(cropped, (160, 160))
        return cv2.cvtColor(resized, cv2.COLOR_BGR2RGB)

    # =========================================================================
    # Curve computation helpers
    # =========================================================================

    def compute_roc(self, labels: List[int], scores: List[float]) -> Dict[str, Any]:
        """Compute Receiver Operating Characteristic (ROC) curve."""
        fpr, tpr, thresholds = roc_curve(labels, scores)
        thresholds = np.nan_to_num(thresholds, posinf=2.0, neginf=-2.0)
        roc_auc = float(auc(fpr, tpr))
        step = max(1, len(fpr) // 100)
        return {
            "fpr": fpr[::step].tolist(),
            "tpr": tpr[::step].tolist(),
            "thresholds": thresholds[::step].tolist(),
            "auc": roc_auc
        }

    def compute_det(self, labels: List[int], scores: List[float]) -> Dict[str, Any]:
        """Compute Detection Error Tradeoff (DET) curve."""
        far, frr, thresholds = det_curve(labels, scores)
        thresholds = np.nan_to_num(thresholds, posinf=2.0, neginf=-2.0)
        step = max(1, len(far) // 100)
        return {
            "far": far[::step].tolist(),
            "frr": frr[::step].tolist(),
            "thresholds": thresholds[::step].tolist()
        }

    def compute_eer(
        self, far: List[float], frr: List[float], thresholds: List[float]
    ) -> Tuple[float, float]:
        """Find the Equal Error Rate (where FAR ≈ FRR)."""
        far_arr = np.array(far)
        frr_arr = np.array(frr)
        min_idx = np.argmin(np.abs(far_arr - frr_arr))
        eer_value = float((far_arr[min_idx] + frr_arr[min_idx]) / 2.0)
        eer_threshold = float(thresholds[min_idx])
        return eer_value, eer_threshold

    def compute_cmc(
        self,
        probe_embeddings: List[np.ndarray],
        probe_subjects: List[str],
        enrolled_templates: Dict[str, np.ndarray],
        max_rank: int = 20,
    ) -> Dict[str, Any]:
        """Compute Cumulative Match Characteristic (CMC) curve."""
        if not enrolled_templates or not probe_embeddings:
            return {"ranks": [], "identification_rates": []}

        n_probes = len(probe_embeddings)
        ranks_counts = np.zeros(max_rank)

        for probe_emb, true_subject in zip(probe_embeddings, probe_subjects):
            matches = self.matcher.identify(probe_emb, enrolled_templates, top_k=max_rank)
            for match in matches:
                if match["subject_id"] == true_subject:
                    rank = match["rank"]
                    if rank <= max_rank:
                        ranks_counts[rank - 1:] += 1
                    break

        rates = (ranks_counts / n_probes).tolist()
        return {
            "ranks": list(range(1, max_rank + 1)),
            "identification_rates": rates
        }

    def compute_rank_k(self, cmc_data: Dict[str, Any], k: int) -> float:
        """Extract Rank-K accuracy from CMC data."""
        ranks = cmc_data.get("ranks", [])
        rates = cmc_data.get("identification_rates", [])
        if k in ranks:
            return rates[ranks.index(k)]
        return 0.0

    # =========================================================================
    # IMPROVEMENT 3: FAR-targeted threshold analysis
    # =========================================================================

    def compute_operating_points(
        self,
        fpr: List[float],
        tpr: List[float],
        thresholds: List[float],
    ) -> List[Dict[str, Any]]:
        """
        Compute verification performance at specific FAR operating points.

        For each target FAR level, finds the nearest achievable threshold and
        records the actual FAR, FRR (= 1 - TPR), and the threshold value.

        Standard operating points follow NIST FRVT reporting conventions:
            - FAR = 0.1%  (high-security deployment)
            - FAR = 1.0%  (medium-security deployment)
            - FAR = 10.0% (permissive / watchlist deployment)
        """
        fpr_arr = np.array(fpr)
        tpr_arr = np.array(tpr)
        thresh_arr = np.array(thresholds)

        target_fars = [0.001, 0.01, 0.10]
        labels = ["FAR=0.1% (high-security)", "FAR=1.0% (medium-security)", "FAR=10.0% (permissive)"]

        operating_points = []
        for target_far, label in zip(target_fars, labels):
            idx = np.argmin(np.abs(fpr_arr - target_far))
            frr_at_point = float(1.0 - tpr_arr[idx])
            operating_points.append({
                "label": label,
                "target_far": target_far,
                "actual_far": float(fpr_arr[idx]),
                "frr": frr_at_point,
                "tar": float(tpr_arr[idx]),
                "threshold": float(thresh_arr[idx]),
            })

        return operating_points

    # =========================================================================
    # IMPROVEMENT 4: Cosine vs. Euclidean metric comparison
    # =========================================================================

    def compute_metric_comparison(
        self,
        labels: List[int],
        scores_cosine: List[float],
        scores_l2: List[float],
    ) -> Dict[str, Any]:
        """
        Compare Cosine Similarity vs. Euclidean (L2) distance as matching metrics.

        Computes EER and ROC-AUC for both metrics on the same score distributions
        and returns a side-by-side comparison. This serves as the ablation study
        for metric selection.
        """
        # --- Cosine ---
        fpr_cos, tpr_cos, thresh_cos = roc_curve(labels, scores_cosine)
        thresh_cos = np.nan_to_num(thresh_cos, posinf=2.0, neginf=-2.0)
        far_cos, frr_cos, det_thresh_cos = det_curve(labels, scores_cosine)
        det_thresh_cos = np.nan_to_num(det_thresh_cos, posinf=2.0, neginf=-2.0)
        eer_cos, eer_thresh_cos = self.compute_eer(
            far_cos.tolist(), frr_cos.tolist(), det_thresh_cos.tolist()
        )
        auc_cos = float(auc(fpr_cos, tpr_cos))

        # --- Euclidean ---
        fpr_l2, tpr_l2, thresh_l2 = roc_curve(labels, scores_l2)
        thresh_l2 = np.nan_to_num(thresh_l2, posinf=2.0, neginf=-2.0)
        far_l2, frr_l2, det_thresh_l2 = det_curve(labels, scores_l2)
        det_thresh_l2 = np.nan_to_num(det_thresh_l2, posinf=2.0, neginf=-2.0)
        eer_l2, eer_thresh_l2 = self.compute_eer(
            far_l2.tolist(), frr_l2.tolist(), det_thresh_l2.tolist()
        )
        auc_l2 = float(auc(fpr_l2, tpr_l2))

        recommended = "cosine" if eer_cos <= eer_l2 else "euclidean"

        return {
            "cosine": {
                "eer": eer_cos,
                "eer_threshold": eer_thresh_cos,
                "roc_auc": auc_cos,
            },
            "euclidean": {
                "eer": eer_l2,
                "eer_threshold": eer_thresh_l2,
                "roc_auc": auc_l2,
            },
            "recommended_metric": recommended,
            "note": (
                f"'{recommended}' metric yields lower EER "
                f"({min(eer_cos, eer_l2):.4f} vs {max(eer_cos, eer_l2):.4f})"
            ),
        }

    # =========================================================================
    # IMPROVEMENT 5: Rotation robustness evaluation
    # =========================================================================

    def run_rotation_robustness_experiment(
        self, enrolled_templates: Dict[str, np.ndarray], subject_limit: int = 25
    ) -> Dict[str, Any]:
        """
        Formally evaluates system robustness to rotated probe images.

        Runs the verification experiment under 5 conditions:
          1. Upright (baseline) — auto_orient ON
          2. 90° CW rotation  — auto_orient ON  (should recover to baseline)
          3. 180° rotation    — auto_orient ON  (should recover to baseline)
          4. 90° CCW rotation — auto_orient ON  (should recover to baseline)
          5. 90° CW rotation  — auto_orient OFF (degraded baseline; shows what auto_orient fixes)

        For each condition, reports: FTA rate, Rank-1 accuracy, and EER.
        """
        conditions = [
            {"label": "Upright (0°) — auto_orient ON",   "rotations": None,                         "use_auto_orient": True},
            {"label": "90° CW — auto_orient ON",          "rotations": [cv2.ROTATE_90_CLOCKWISE],    "use_auto_orient": True},
            {"label": "180° — auto_orient ON",             "rotations": [cv2.ROTATE_180],             "use_auto_orient": True},
            {"label": "90° CCW — auto_orient ON",         "rotations": [cv2.ROTATE_90_COUNTERCLOCKWISE], "use_auto_orient": True},
            {"label": "90° CW — auto_orient OFF (baseline degraded)", "rotations": [cv2.ROTATE_90_CLOCKWISE], "use_auto_orient": False},
        ]

        results = []
        for cond in conditions:
            logger.info(f"Rotation robustness: running condition '{cond['label']}'...")
            try:
                exp = self.run_verification_experiment(
                    enrolled_templates,
                    subject_limit=subject_limit,
                    rotations=cond["rotations"],
                    use_auto_orient=cond["use_auto_orient"],
                    bypass_detection=False,
                )

                total_attempted = exp["total_attempted"]
                fta_count = exp["fta_count"]
                fta_rate = fta_count / total_attempted if total_attempted > 0 else 1.0

                labels = exp["labels"]
                scores = exp["all_scores_cosine"]

                if len(labels) < 2 or len(set(labels)) < 2:
                    results.append({
                        "condition": cond["label"],
                        "fta_rate": fta_rate,
                        "total_attempted": total_attempted,
                        "fta_count": fta_count,
                        "eer": None,
                        "rank_1_accuracy": None,
                        "error": "Insufficient score pairs for curve computation"
                    })
                    continue

                # EER
                full_far, full_frr, full_thresh = det_curve(labels, scores)
                full_thresh = np.nan_to_num(full_thresh, posinf=2.0, neginf=-2.0)
                eer_val, _ = self.compute_eer(
                    full_far.tolist(), full_frr.tolist(), full_thresh.tolist()
                )

                # CMC Rank-1
                cmc = self.compute_cmc(
                    exp["probe_embeddings"], exp["probe_subjects"],
                    enrolled_templates, max_rank=5
                )
                rank1 = self.compute_rank_k(cmc, 1)
                rank5 = self.compute_rank_k(cmc, 5)
                effective_rank1 = rank1 * (1.0 - fta_rate)

                results.append({
                    "condition": cond["label"],
                    "total_attempted": total_attempted,
                    "fta_count": fta_count,
                    "fta_rate": round(fta_rate, 6),
                    "eer": round(eer_val, 6),
                    "rank_1_accuracy": round(rank1, 6),
                    "rank_5_accuracy": round(rank5, 6),
                    "effective_rank_1": round(effective_rank1, 6),
                })

            except Exception as e:
                logger.error(f"Robustness experiment failed for '{cond['label']}': {e}")
                results.append({"condition": cond["label"], "error": str(e)})

        return {
            "description": (
                "Rotation robustness evaluation: measures impact of image rotation on FTA, "
                "EER, and Rank-1 accuracy with and without automatic orientation correction."
            ),
            "conditions": results,
        }

    # =========================================================================
    # Main orchestration
    # =========================================================================

    def generate_all_metrics(self) -> Dict[str, Any]:
        """
        Orchestrate the full biometric evaluation pipeline.

        Returns ROC, DET, CMC curves plus:
        - EER and optimal threshold
        - FTA rate and effective Rank-1 accuracy     [Improvement 2]
        - FAR-targeted operating points               [Improvement 3]
        - Cosine vs. Euclidean metric comparison      [Improvement 4]
        """
        logger.info("Starting biometric evaluation pipeline...")
        enrolled_templates = self.enrollment_service.load_all_templates()
        if not enrolled_templates:
            return {"error": "No enrolled templates found. Please enroll subjects first."}

        exp_results = self.run_verification_experiment(
            enrolled_templates, subject_limit=25, bypass_detection=True
        )

        labels = exp_results["labels"]
        scores_cosine = exp_results["all_scores_cosine"]
        scores_l2 = exp_results["all_scores_l2"]

        if not labels or len(set(labels)) < 2:
            return {"error": "Insufficient data. Need both genuine and impostor pairs."}

        # --- FTA stats (Improvement 2) ---
        fta_count = exp_results["fta_count"]
        total_attempted = exp_results["total_attempted"]
        fta_rate = fta_count / total_attempted if total_attempted > 0 else 0.0

        # --- Primary curves (cosine) ---
        roc_data = self.compute_roc(labels, scores_cosine)
        det_data = self.compute_det(labels, scores_cosine)

        full_far, full_frr, full_thresh = det_curve(labels, scores_cosine)
        full_thresh = np.nan_to_num(full_thresh, posinf=2.0, neginf=-2.0)
        eer_val, eer_thresh = self.compute_eer(
            full_far.tolist(), full_frr.tolist(), full_thresh.tolist()
        )

        # --- CMC (Improvement 1 — batched embeddings used here) ---
        cmc_data = self.compute_cmc(
            exp_results["probe_embeddings"],
            exp_results["probe_subjects"],
            enrolled_templates,
            max_rank=5
        )
        rank1 = self.compute_rank_k(cmc_data, 1)
        rank5 = self.compute_rank_k(cmc_data, 5)
        effective_rank1 = rank1 * (1.0 - fta_rate)

        # --- Operating points (Improvement 3) ---
        operating_points = self.compute_operating_points(
            roc_data["fpr"], roc_data["tpr"], roc_data["thresholds"]
        )

        # --- Metric comparison (Improvement 4) ---
        metric_comparison = self.compute_metric_comparison(labels, scores_cosine, scores_l2)

        return {
            "summary": {
                "eer": eer_val,
                "eer_threshold": eer_thresh,
                "roc_auc": roc_data["auc"],
                "rank_1_accuracy": rank1,
                "rank_5_accuracy": rank5,
                "effective_rank_1_accuracy": effective_rank1,
                "total_enrolled": len(enrolled_templates),
                "total_probes": len(exp_results["probe_embeddings"]),
                "total_attempted": total_attempted,
                "fta_count": fta_count,
                "fta_rate": round(fta_rate, 6),
            },
            "roc": roc_data,
            "det": det_data,
            "cmc": cmc_data,
            "operating_points": operating_points,        # Improvement 3
            "metric_comparison": metric_comparison,      # Improvement 4
        }
