"""
LLM routes for Gemini API-assisted facial biometrics analysis.
Provides AI-powered insights, natural language conversation, and face analysis.
"""

from fastapi import APIRouter, File, UploadFile, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
import logging
from PIL import Image
import io
import google.generativeai as genai

from app.services.llm_service import LLMService

router = APIRouter()
logger = logging.getLogger(__name__)

llm_service = LLMService()

class ChatRequest(BaseModel):
    message: str
    history: Optional[List[Dict[str, str]]] = []


@router.post("/chat")
async def chat_assistant(request: ChatRequest) -> Dict[str, Any]:
    """
    Interactive biometric assistant endpoint.
    Accepts user message and history, returns generative answer from Gemini
    grounded on LFW dataset statistics and project evaluation metrics.
    """
    try:
        reply = llm_service.generate_chat_response(request.message, request.history)
        return {
            "status": "success",
            "reply": reply
        }
    except Exception as e:
        logger.error(f"LLM Chat failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"LLM Chat Error: {str(e)}")


@router.post("/analyze-face")
async def analyze_face(file: UploadFile = File(...)) -> Dict[str, Any]:
    """
    Analyze facial features and characteristics using Gemini LLM.
    Provides natural language description of detected features.
    
    Args:
        file: Face image file (JPEG/PNG)
        
    Returns:
        dict: Gemini AI analysis of facial characteristics
    """
    if not llm_service.is_configured:
        return {
            "status": "success",
            "face_detected": True,
            "analysis": "This is an offline placeholder face analysis. Please configure GEMINI_API_KEY in the backend .env file to enable actual multimodal face analysis.",
            "features": {
                "estimated_age": "N/A",
                "apparent_emotion": "N/A",
                "facial_landmarks": []
            },
            "placeholder": True
        }

    try:
        contents = await file.read()
        image = Image.open(io.BytesIO(contents))
        
        # Define generation parameters and prompt
        model = genai.GenerativeModel(llm_service.model_name)
        prompt = (
            "Analyze this face image. Estimate the apparent age, emotion, and "
            "provide a concise technical description of the facial characteristics, "
            "landmarks, and expression. Keep the response professional."
        )
        
        response = model.generate_content([prompt, image])
        analysis_text = response.text
        
        return {
            "status": "success",
            "face_detected": True,
            "analysis": analysis_text,
            "features": {
                "estimated_age": "Extracted in analysis",
                "apparent_emotion": "Extracted in analysis",
                "facial_landmarks": []
            }
        }
    except Exception as e:
        logger.error(f"Multimodal face analysis failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Analysis error: {str(e)}")


@router.post("/match-analysis")
async def match_analysis(
    user_id_1: str,
    user_id_2: str,
    similarity_score: float
) -> Dict[str, Any]:
    """
    Generate Gemini-powered analysis of face matching results.
    Explains why two faces match or don't match.
    
    Args:
        user_id_1: First user ID
        user_id_2: Second user ID
        similarity_score: Similarity score between 0-1
        
    Returns:
        dict: Natural language analysis of the match
    """
    if not llm_service.is_configured:
        decision = "Match" if similarity_score >= 0.70 else "Mismatch"
        return {
            "status": "success",
            "user_id_1": user_id_1,
            "user_id_2": user_id_2,
            "similarity_score": similarity_score,
            "analysis": f"Offline Match Analysis: The similarity score of {similarity_score:.4f} is {'ABOVE' if similarity_score >= 0.70 else 'BELOW'} the default threshold of 0.70. Decision: {decision}.",
            "confidence_explanation": f"Evaluation based on standard similarity threshold of 0.70.",
            "placeholder": True
        }

    try:
        model = genai.GenerativeModel(llm_service.model_name)
        prompt = (
            f"Analyze the matching result of Subject 1 ({user_id_1}) compared to Subject 2 ({user_id_2}). "
            f"The computed similarity score is {similarity_score:.4f} (where scores range from 0.0 to 1.0, and the acceptance threshold is 0.70). "
            f"Explain whether this indicates a genuine match or an impostor mismatch, the confidence level of this decision, "
            f"and list potential real-world factors (like pose angle or lighting variations) that could affect this score. Keep it concise."
        )
        response = model.generate_content(prompt)
        
        return {
            "status": "success",
            "user_id_1": user_id_1,
            "user_id_2": user_id_2,
            "similarity_score": similarity_score,
            "analysis": response.text,
            "confidence_explanation": f"The similarity score is {'above' if similarity_score >= 0.70 else 'below'} the decision threshold of 0.70."
        }
    except Exception as e:
        logger.error(f"Match analysis failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Match analysis error: {str(e)}")


@router.post("/batch-analysis")
async def batch_analysis(
    file: UploadFile = File(...),
    analyze_count: int = 5
) -> Dict[str, Any]:
    """
    Perform batch LLM analysis on multiple face comparisons.
    """
    return {
        "status": "success",
        "probe_analysis": "Batch analysis placeholder",
        "matches_analyzed": analyze_count,
        "combined_insights": "Batch matching insights are calculated based on metrics cache.",
        "placeholder": True
    }


@router.get("/llm-config")
async def get_llm_config() -> Dict[str, Any]:
    """
    Get current LLM configuration and model information.
    
    Returns:
        dict: LLM configuration details
    """
    return {
        "status": "success",
        "model": llm_service.model_name,
        "api_available": llm_service.is_configured,
        "max_tokens": 4096,
        "placeholder": not llm_service.is_configured
    }
