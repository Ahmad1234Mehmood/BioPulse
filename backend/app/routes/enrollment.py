"""
Enrollment routes for registering new users in the system.
Handles face enrollment, image upload, and template generation.
"""

from fastapi import APIRouter, File, UploadFile, Form, HTTPException
from fastapi.responses import FileResponse
from typing import Dict, Any, List
import logging
import cv2
import numpy as np

from app.services.enrollment_service import EnrollmentService

router = APIRouter()
logger = logging.getLogger(__name__)

# Initialize the enrollment service
enrollment_service = EnrollmentService()

@router.post("/enroll")
async def enroll_subject(
    subject_name: str = Form(...),
    images: List[UploadFile] = File(...)
) -> Dict[str, Any]:
    """
    Enroll a new subject with multiple face images.
    """
    if not images:
        raise HTTPException(status_code=400, detail="No images provided")
        
    # Read images into numpy arrays for OpenCV
    cv_images = []
    for file in images:
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is not None:
            cv_images.append(img)
            
    if not cv_images:
        raise HTTPException(status_code=400, detail="Could not read any of the provided images")
        
    try:
        # Sanitize subject_name to use as an ID
        subject_id = subject_name.strip().replace(" ", "_").lower()
        if not subject_id:
            raise ValueError("Subject name cannot be empty")
            
        # Perform enrollment
        result = enrollment_service.enroll_subject(subject_id, cv_images)
        
        return {
            "status": "success",
            "message": f"Successfully enrolled {subject_name}",
            "data": result
        }
    except ValueError as e:
        logger.warning(f"Validation error during enrollment: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Enrollment failed: {e}")
        raise HTTPException(status_code=500, detail="Internal server error during enrollment")

@router.get("/enrolled")
async def get_enrolled_users() -> Dict[str, Any]:
    """
    Get list of all enrolled users.
    """
    try:
        subjects = enrollment_service.list_enrolled_subjects()
        return {
            "status": "success",
            "enrolled_users": subjects,
            "total_users": len(subjects)
        }
    except Exception as e:
        logger.error(f"Failed to list users: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.delete("/enrolled/{subject_id}")
async def delete_user(subject_id: str) -> Dict[str, Any]:
    """
    Delete an enrolled user from the system.
    """
    success = enrollment_service.delete_subject(subject_id)
    if not success:
        raise HTTPException(status_code=404, detail=f"User {subject_id} not found")
        
    # Also delete custom image if exists
    custom_jpg = enrollment_service.enrollment_dir / f"{subject_id}.jpg"
    if custom_jpg.exists():
        try:
            custom_jpg.unlink()
        except Exception as e:
            logger.error(f"Failed to delete custom image {custom_jpg}: {e}")
            
    return {
        "status": "success",
        "message": f"User {subject_id} deleted successfully",
        "user_id": subject_id
    }

@router.get("/enrolled/{subject_id}/image")
async def get_user_image(subject_id: str):
    """
    Get the preview image of an enrolled user.
    """
    image_path = enrollment_service.get_subject_image_path(subject_id)
    if not image_path:
        raise HTTPException(status_code=404, detail=f"Image for user {subject_id} not found")
    return FileResponse(image_path)
