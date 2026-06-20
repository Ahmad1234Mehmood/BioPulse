"""
Batch Enrollment Script for LFW Dataset
Enrolls all subjects automatically using the EnrollmentService.
"""

import os
import sys
import json
import logging
from pathlib import Path
import numpy as np
import cv2
from tqdm import tqdm
from sklearn.datasets import fetch_lfw_people

# Add the backend directory to python path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.append(str(backend_dir))

from app.services.enrollment_service import EnrollmentService

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def main():
    logger.info("Initializing Enrollment Service...")
    enrollment_service = EnrollmentService()
    
    logger.info("Loading LFW dataset (color)...")
    # Load color images since FaceDetector and FeatureExtractor need RGB/BGR
    data_home = str(backend_dir / 'data' / 'lfw_data')
    try:
        data = fetch_lfw_people(
            min_faces_per_person=5,
            resize=0.5,
            data_home=data_home,
            color=True
        )
    except Exception as e:
        logger.error(f"Failed to load dataset: {e}")
        return
        
    db_dir = backend_dir / "data" / "Face_Database"
    
    subject_dirs = list(db_dir.glob("subject_*"))
    logger.info(f"Found {len(subject_dirs)} subjects. Starting batch enrollment...")
    
    success_count = 0
    fail_count = 0
    
    for subject_dir in tqdm(subject_dirs, desc="Enrolling subjects"):
        meta_path = subject_dir / "metadata.json"
        if not meta_path.exists():
            continue
            
        with open(meta_path, "r") as f:
            metadata = json.load(f)
            
        subject_id = metadata["subject_name"].replace(" ", "_").lower()
        enrollment_indices = metadata["enrollment_indices"]
        
        # Get the actual images
        images = []
        for idx in enrollment_indices:
            img = data.images[idx]
            
            # sklearn fetch_lfw_people color=True returns RGB. 
            # Values are typically floats in [0, 1] or [0, 255]
            if img.max() <= 1.0:
                img = (img * 255).astype(np.uint8)
            else:
                img = img.astype(np.uint8)
                
            # FaceDetector expects BGR
            img_bgr = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)
            images.append(img_bgr)
            
        if not images:
            logger.warning(f"No enrollment images found for {subject_id}")
            fail_count += 1
            continue
            
        try:
            enrollment_service.enroll_subject(subject_id, images, bypass_detection=True)
            success_count += 1
        except Exception as e:
            logger.error(f"Failed to enroll {subject_id}: {e}")
            fail_count += 1
            
    summary = {
        "total_attempted": len(subject_dirs),
        "successful_enrollments": success_count,
        "failed_enrollments": fail_count
    }
    
    with open(backend_dir / "data" / "enrollment_summary.json", "w") as f:
        json.dump(summary, f, indent=2)
        
    logger.info("\n=== Batch Enrollment Complete ===")
    logger.info(f"Total Attempted: {summary['total_attempted']}")
    logger.info(f"Successful:      {summary['successful_enrollments']}")
    logger.info(f"Failed:          {summary['failed_enrollments']}")

if __name__ == "__main__":
    main()
