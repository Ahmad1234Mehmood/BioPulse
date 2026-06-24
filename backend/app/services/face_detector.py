import cv2
import numpy as np
import base64
import mediapipe as mp
import mediapipe.python.solutions.face_detection
import logging
from typing import List, Tuple, Dict, Any

logger = logging.getLogger(__name__)

class NoFaceDetectedError(Exception):
    """Exception raised when no face is detected in an image."""
    pass

class FaceDetector:
    """
    Face detection and alignment service using MediaPipe.
    """
    def __init__(self, min_detection_confidence: float = 0.5):
        self.mp_face_detection = mp.solutions.face_detection
        # model_selection=1 is suitable for faces within 5 meters
        self.detector = self.mp_face_detection.FaceDetection(
            model_selection=1, 
            min_detection_confidence=min_detection_confidence
        )
    
    def detect_faces(self, image: np.ndarray) -> List[Dict[str, Any]]:
        """
        Detect faces in a BGR image.
        Returns a list of dicts containing bbox and landmarks.
        """
        h, w = image.shape[:2]
        
        # Apply padding if image is small/close-cropped (standard for LFW 125x94 or 250x250 crops)
        # MediaPipe face detection is trained on full-context images and fails on tight close-up crops.
        # Adding a replicated border of 30% dynamically resolves the missing context.
        if w < 300 or h < 300:
            pad_h = int(h * 0.3)
            pad_w = int(w * 0.3)
            padded_image = cv2.copyMakeBorder(
                image, pad_h, pad_h, pad_w, pad_w,
                cv2.BORDER_REPLICATE
            )
        else:
            pad_h = 0
            pad_w = 0
            padded_image = image

        # MediaPipe requires RGB input
        image_rgb = cv2.cvtColor(padded_image, cv2.COLOR_BGR2RGB)
        results = self.detector.process(image_rgb)
        
        if not results.detections:
            return []
            
        faces = []
        padded_h, padded_w, _ = padded_image.shape
        for detection in results.detections:
            bboxC = detection.location_data.relative_bounding_box
            xmin_pad = int(bboxC.xmin * padded_w)
            ymin_pad = int(bboxC.ymin * padded_h)
            width_pad = int(bboxC.width * padded_w)
            height_pad = int(bboxC.height * padded_h)
            
            # Map back to original image coordinates and clip to boundaries
            xmin = max(0, xmin_pad - pad_w)
            ymin = max(0, ymin_pad - pad_h)
            xmax = min(w, xmin_pad - pad_w + width_pad)
            ymax = min(h, ymin_pad - pad_h + height_pad)
            
            width = xmax - xmin
            height = ymax - ymin
            
            # Extract landmarks: 0: Right eye, 1: Left eye, 2: Nose tip, 
            # 3: Mouth center, 4: Right ear tragion, 5: Left ear tragion
            landmarks = []
            for keypoint in detection.location_data.relative_keypoints:
                lx_pad = int(keypoint.x * padded_w)
                ly_pad = int(keypoint.y * padded_h)
                # Map back landmarks and clip to boundaries
                lx = max(0, min(w - 1, lx_pad - pad_w))
                ly = max(0, min(h - 1, ly_pad - pad_h))
                landmarks.append((lx, ly))
                
            faces.append({
                'bbox': (xmin, ymin, width, height),
                'landmarks': landmarks,
                'score': detection.score[0]
            })
            
        return faces

    def auto_orient(self, image: np.ndarray) -> np.ndarray:
        """
        Detect if the image is rotated and orient it upright.
        If no face is detected in the original, tries rotating by 90, 180, and 270 degrees.
        Returns the oriented image.
        """
        # Try original orientation
        faces = self.detect_faces(image)
        if faces:
            return image

        # Rotations to try: 90 degrees CW, 180 degrees, 90 degrees CCW
        rotations = [
            (cv2.ROTATE_90_CLOCKWISE, "90 CW"),
            (cv2.ROTATE_180, "180"),
            (cv2.ROTATE_90_COUNTERCLOCKWISE, "90 CCW")
        ]

        for rot_code, label in rotations:
            rotated = cv2.rotate(image, rot_code)
            faces = self.detect_faces(rotated)
            if faces:
                logger.info(f"Detected face after rotating image by {label}")
                return rotated

        # If no face detected, return original image
        return image
        
    def align_face(self, image: np.ndarray, landmarks: List[Tuple[int, int]]) -> np.ndarray:
        """
        Align the face so the eyes are horizontal.
        MediaPipe indices: 0 is the person's right eye (left side of image),
        1 is the person's left eye (right side of image).
        """
        right_eye = landmarks[0]
        left_eye = landmarks[1]
        
        # Calculate the angle between the eyes
        dY = right_eye[1] - left_eye[1]
        dX = right_eye[0] - left_eye[0]
        # Angle relative to horizontal
        angle = np.degrees(np.arctan2(dY, dX)) - 180
        
        # Center of rotation is between the eyes
        eyes_center = ((left_eye[0] + right_eye[0]) // 2, (left_eye[1] + right_eye[1]) // 2)
        
        # Rotation matrix
        M = cv2.getRotationMatrix2D(eyes_center, angle, 1.0)
        
        # Warp the image
        h, w = image.shape[:2]
        aligned_img = cv2.warpAffine(image, M, (w, h), flags=cv2.INTER_CUBIC)
        
        return aligned_img

    def preprocess(self, image: np.ndarray) -> np.ndarray:
        """
        Detect, align, crop, and resize to 160x160.
        Returns an RGB numpy array ready for feature extraction.
        """
        # Auto-orient image first
        image = self.auto_orient(image)
        
        faces = self.detect_faces(image)
        if not faces:
            raise NoFaceDetectedError("No face detected in the image.")
            
        # Select the most confident face
        best_face = max(faces, key=lambda f: f['score'])
        
        # Align the face using the landmarks
        aligned = self.align_face(image, best_face['landmarks'])
        
        # Detect the face again in the aligned image to get an accurate bounding box
        aligned_faces = self.detect_faces(aligned)
        if aligned_faces:
            best_aligned_face = max(aligned_faces, key=lambda f: f['score'])
            x, y, w, h = best_aligned_face['bbox']
        else:
            x, y, w, h = best_face['bbox']
            
        img_h, img_w = aligned.shape[:2]
        
        # Add a 10% margin around the face
        margin_x = int(w * 0.1)
        margin_y = int(h * 0.1)
        
        x1 = max(0, x - margin_x)
        y1 = max(0, y - margin_y)
        x2 = min(img_w, x + w + margin_x)
        y2 = min(img_h, y + h + margin_y)
        
        # Crop the face
        cropped = aligned[y1:y2, x1:x2]
        
        if cropped.size == 0:
            raise NoFaceDetectedError("Face crop resulted in an empty image.")
            
        # Resize to 160x160 for InceptionResnetV1
        resized = cv2.resize(cropped, (160, 160))
        
        # Convert BGR to RGB
        resized_rgb = cv2.cvtColor(resized, cv2.COLOR_BGR2RGB)
        
        return resized_rgb
        
    def visualize_detection(self, image: np.ndarray) -> str:
        """
        Detect faces, draw bounding boxes and landmarks, and return as base64 string.
        """
        # Auto-orient image first
        image = self.auto_orient(image)
        
        img_copy = image.copy()
        faces = self.detect_faces(img_copy)
        
        for face in faces:
            x, y, w, h = face['bbox']
            # Draw bounding box
            cv2.rectangle(img_copy, (x, y), (x+w, y+h), (0, 255, 0), 2)
            
            # Draw landmarks
            for lx, ly in face['landmarks']:
                cv2.circle(img_copy, (lx, ly), 2, (0, 0, 255), -1)
                
        # Encode to JPEG
        _, buffer = cv2.imencode('.jpg', img_copy)
        # Convert to base64
        b64_str = base64.b64encode(buffer).decode('utf-8')
        
        return b64_str

    def assess_crop_quality(self, crop_bgr: np.ndarray) -> Dict[str, Any]:
        """
        Assess the quality of a cropped face image (BGR format).
        Measures blur, exposure, and contrast.
        Returns a dict of metrics and a boolean decision.
        """
        # Convert to grayscale
        gray = cv2.cvtColor(crop_bgr, cv2.COLOR_BGR2GRAY) if len(crop_bgr.shape) == 3 else crop_bgr
        
        # 1. Sharpness (Laplacian variance)
        blur_score = float(cv2.Laplacian(gray, cv2.CV_64F).var())
        is_sharp = blur_score >= 80.0
        
        # 2. Exposure (mean brightness)
        exposure_score = float(np.mean(gray))
        is_well_exposed = 50.0 <= exposure_score <= 220.0
        
        # 3. Contrast (standard deviation of gray values)
        contrast_score = float(np.std(gray))
        has_contrast = contrast_score >= 18.0
        
        is_acceptable = is_sharp and is_well_exposed and has_contrast
        
        reasons = []
        if not is_sharp:
            reasons.append("Image is too blurry")
        if not is_well_exposed:
            if exposure_score < 50.0:
                reasons.append("Image is under-exposed (too dark)")
            else:
                reasons.append("Image is over-exposed (too bright)")
        if not has_contrast:
            reasons.append("Image has low contrast")
            
        return {
            "is_acceptable": is_acceptable,
            "blur_score": round(blur_score, 2),
            "exposure_score": round(exposure_score, 2),
            "contrast_score": round(contrast_score, 2),
            "is_sharp": is_sharp,
            "is_well_exposed": is_well_exposed,
            "has_contrast": has_contrast,
            "reasons": reasons
        }
