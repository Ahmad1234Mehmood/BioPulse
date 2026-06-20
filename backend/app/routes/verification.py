"""
Verification routes for 1:1 facial verification.
Compares a probe face against a known enrolled user's template or a provided claim image.
"""

from fastapi import APIRouter, File, UploadFile, Form, HTTPException
from typing import Dict, Any, Optional
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

@router.post("/verify")
async def verify_user(
    claimed_subject_id: str = Form(...),
    probe_image: UploadFile = File(...),
    claim_image: Optional[UploadFile] = File(None),
    threshold: float = Form(0.70)
) -> Dict[str, Any]:
    """
    Verify if a provided face belongs to a specific enrolled user.
    1:1 comparison mode.
    """
    try:
        # Get probe image
        contents = await probe_image.read()
        nparr = np.frombuffer(contents, np.uint8)
        probe_cv = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if probe_cv is None:
            raise HTTPException(status_code=400, detail="Invalid probe image")
            
        # Process probe image
        probe_preview = face_detector.visualize_detection(probe_cv)
        processed_probe = face_detector.preprocess(probe_cv)
        probe_emb = feature_extractor.extract_embedding(processed_probe)
        
        # Quality assessment on probe
        probe_bgr = cv2.cvtColor(processed_probe, cv2.COLOR_RGB2BGR)
        probe_quality = face_detector.assess_crop_quality(probe_bgr)
        
        claim_preview = None
        claim_quality = None
        template_emb = None
        
        # If claim_image is provided, extract from it directly
        if claim_image:
            claim_contents = await claim_image.read()
            claim_nparr = np.frombuffer(claim_contents, np.uint8)
            claim_cv = cv2.imdecode(claim_nparr, cv2.IMREAD_COLOR)
            if claim_cv is None:
                raise HTTPException(status_code=400, detail="Invalid claim image")
                
            claim_preview = face_detector.visualize_detection(claim_cv)
            processed_claim = face_detector.preprocess(claim_cv)
            template_emb = feature_extractor.extract_embedding(processed_claim)
            
            # Quality assessment on claim
            claim_bgr = cv2.cvtColor(processed_claim, cv2.COLOR_RGB2BGR)
            claim_quality = face_detector.assess_crop_quality(claim_bgr)
        else:
            # Load template from disk
            templates = enrollment_service.load_all_templates()
            if claimed_subject_id not in templates:
                raise HTTPException(status_code=404, detail=f"Subject '{claimed_subject_id}' not found in database")
            template_emb = templates[claimed_subject_id]
            
        # Verify
        result = matcher.verify(probe_emb, template_emb, threshold=threshold)
        
        return {
            "status": "success",
            "match": result["match"],
            "score": result["score"],
            "decision": result["decision"],
            "claimed_subject_id": claimed_subject_id,
            "probe_preview": probe_preview,
            "claim_preview": claim_preview,
            "probe_quality": probe_quality,
            "claim_quality": claim_quality
        }
        
    except NoFaceDetectedError as e:
        logger.warning(f"Verification face detection failed: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Verification error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
