"""
Identification routes for 1:N facial identification.
Searches a probe face against all enrolled users in the database.
"""

from fastapi import APIRouter, File, UploadFile, HTTPException
from typing import Dict, Any
import logging
import cv2
import numpy as np

from app.services.face_detector import FaceDetector, NoFaceDetectedError
from app.services.feature_extractor import FeatureExtractor
from app.services.matcher import BiometricMatcher
from app.services.enrollment_service import EnrollmentService

router = APIRouter()
logger = logging.getLogger(__name__)

face_detector = FaceDetector()
feature_extractor = FeatureExtractor()
matcher = BiometricMatcher()
enrollment_service = EnrollmentService()

@router.post("/identify")
async def identify_user(
    probe_image: UploadFile = File(...)
) -> Dict[str, Any]:
    """
    Identify a person by searching their face against all enrolled templates.
    1:N comparison mode.
    """
    try:
        # Load image
        contents = await probe_image.read()
        nparr = np.frombuffer(contents, np.uint8)
        probe_cv = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if probe_cv is None:
            raise HTTPException(status_code=400, detail="Invalid probe image")
            
        # Process face
        probe_preview = face_detector.visualize_detection(probe_cv)
        processed_probe = face_detector.preprocess(probe_cv)
        probe_emb = feature_extractor.extract_embedding(processed_probe)
        
        # Quality assessment on probe
        probe_bgr = cv2.cvtColor(processed_probe, cv2.COLOR_RGB2BGR)
        probe_quality = face_detector.assess_crop_quality(probe_bgr)
        
        # Load all enrolled templates
        templates = enrollment_service.load_all_templates()
        if not templates:
            raise HTTPException(status_code=400, detail="No enrolled templates found in database. Please enroll subjects first.")
            
        # Identify top matches
        top_matches = matcher.identify(probe_emb, templates, top_k=5)
        
        return {
            "status": "success",
            "matches": top_matches,
            "probe_preview": probe_preview,
            "probe_quality": probe_quality
        }
        
    except NoFaceDetectedError as e:
        logger.warning(f"Identification face detection failed: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Identification error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
