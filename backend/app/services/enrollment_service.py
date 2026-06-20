import json
import numpy as np
import cv2
from datetime import datetime
from pathlib import Path
import logging

from app.services.face_detector import FaceDetector, NoFaceDetectedError
from app.services.feature_extractor import FeatureExtractor

logger = logging.getLogger(__name__)

class EnrollmentService:
    """
    Orchestrates face detection and feature extraction to enroll users.
    """
    def __init__(self):
        self.face_detector = FaceDetector()
        self.feature_extractor = FeatureExtractor()
        
        # Determine enrollment directory
        base_dir = Path(__file__).resolve().parent.parent.parent
        self.enrollment_dir = base_dir / "data" / "enrollment"
        self.enrollment_dir.mkdir(parents=True, exist_ok=True)
        
    def enroll_subject(self, subject_id: str, images: list[np.ndarray], bypass_detection: bool = False) -> dict:
        """
        Enroll a new subject using a list of images.
        Extracts embeddings, averages them, and saves to JSON.
        
        Args:
            subject_id: Unique identifier for the subject.
            images: List of BGR numpy arrays (OpenCV format).
            bypass_detection: If True, bypasses face detection and alignment.
            
        Returns:
            dict: Enrollment metadata including preview image.
        """
        embeddings = []
        preview_image = None
        first_processed_img = None
        quality_failures = []
        
        for img in images:
            try:
                if bypass_detection:
                    # Bypasses face detection/alignment: just resize directly to 160x160 RGB
                    img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
                    processed_img = cv2.resize(img_rgb, (160, 160))
                else:
                    # Store the first successfully detected face for the UI preview
                    if preview_image is None:
                        # visualize_detection returns base64 string
                        preview_image = self.face_detector.visualize_detection(img)
                        
                    processed_img = self.face_detector.preprocess(img)
                    
                    # Run image quality check on the face crop
                    processed_bgr = cv2.cvtColor(processed_img, cv2.COLOR_RGB2BGR)
                    quality = self.face_detector.assess_crop_quality(processed_bgr)
                    if not quality["is_acceptable"]:
                        reasons_str = ", ".join(quality["reasons"])
                        quality_failures.append(reasons_str)
                        logger.warning(f"Skipping image for {subject_id} due to low quality: {reasons_str}")
                        continue
                
                emb = self.feature_extractor.extract_embedding(processed_img)
                embeddings.append(emb)
                if first_processed_img is None:
                    first_processed_img = processed_img
            except NoFaceDetectedError as e:
                logger.warning(f"Skipping image for {subject_id}: {e}")
                continue
            except Exception as e:
                logger.error(f"Error processing image for {subject_id}: {e}")
                continue
                
        if not embeddings:
            if quality_failures:
                raise ValueError(f"All enrollment images rejected due to low quality: {'; '.join(set(quality_failures))}")
            raise ValueError(f"No faces could be detected in any of the provided images for {subject_id}.")
            
        # Average embeddings
        avg_embedding = np.mean(embeddings, axis=0)
        # Re-normalize the averaged embedding to unit length
        avg_embedding = avg_embedding / np.linalg.norm(avg_embedding)
        
        # Save to file
        file_path = self.enrollment_dir / f"{subject_id}.json"
        metadata = {
            "subject_id": subject_id,
            "image_count": len(embeddings),
            "timestamp": datetime.utcnow().isoformat(),
            "quality_checked": not bypass_detection,
            "embedding": avg_embedding.tolist()
        }
        
        with open(file_path, "w") as f:
            json.dump(metadata, f, indent=2)
            
        # Save face crop image to disk
        if first_processed_img is not None:
            crop_path = self.enrollment_dir / f"{subject_id}.jpg"
            cv2.imwrite(str(crop_path), cv2.cvtColor(first_processed_img, cv2.COLOR_RGB2BGR))
            
        logger.info(f"Successfully enrolled {subject_id} with {len(embeddings)} images.")
        
        return {
            "subject_id": subject_id,
            "image_count": len(embeddings),
            "timestamp": metadata["timestamp"],
            "quality_checked": metadata["quality_checked"],
            "preview_image": preview_image
        }
        
    def load_all_templates(self) -> dict:
        """ 
        Load all enrolled templates into memory. 
        Returns dict of {subject_id: embedding_array} 
        """
        templates = {}
        for file_path in self.enrollment_dir.glob("*.json"):
            try:
                with open(file_path, "r") as f:
                    data = json.load(f)
                    templates[data["subject_id"]] = np.array(data["embedding"], dtype=np.float32)
            except Exception as e:
                logger.error(f"Failed to load template {file_path}: {e}")
        return templates
        
    def delete_subject(self, subject_id: str) -> bool:
        """ 
        Delete a subject's template.
        """
        file_path = self.enrollment_dir / f"{subject_id}.json"
        if file_path.exists():
            file_path.unlink()
            return True
        return False
        
    def list_enrolled_subjects(self) -> list:
        """ 
        List metadata for all enrolled subjects without loading the heavy embeddings. 
        """
        subjects = []
        for file_path in self.enrollment_dir.glob("*.json"):
            try:
                with open(file_path, "r") as f:
                    data = json.load(f)
                    subjects.append({
                        "subject_id": data.get("subject_id"),
                        "image_count": data.get("image_count"),
                        "timestamp": data.get("timestamp")
                    })
            except Exception as e:
                logger.error(f"Failed to read metadata for {file_path}: {e}")
        return subjects

    def get_subject_image_path(self, subject_id: str) -> Path or None:
        """
        Get the image file path for an enrolled subject.
        Checks custom enrollment directory first, then fallbacks to LFW dataset.
        """
        # 1. Check custom enrollment jpg first
        custom_jpg = self.enrollment_dir / f"{subject_id}.jpg"
        if custom_jpg.exists():
            return custom_jpg
            
        # 2. Check case-insensitive LFW directory
        base_dir = Path(__file__).resolve().parent.parent.parent
        lfw_dir = base_dir / "data" / "lfw_data" / "lfw_home" / "lfw_funneled"
        if lfw_dir.exists():
            for p in lfw_dir.iterdir():
                if p.is_dir() and p.name.lower() == subject_id.lower():
                    img_files = list(p.glob("*.jpg")) + list(p.glob("*.png"))
                    if img_files:
                        return img_files[0]
                        
        return None
