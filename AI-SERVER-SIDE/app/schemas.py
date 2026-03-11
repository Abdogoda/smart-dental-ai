# app/schemas.py
from pydantic import BaseModel, Field
from typing import List


class Detection(BaseModel):
    label: str              # What was detected (e.g., 'Dental Caries')
    confidence: float       # Confidence score (0-1)


class DetectionResult(BaseModel):
    detections: List[Detection]     # YOLO detected objects with confidence
    classification: dict  # All class probabilities {class_name: probability}
    detection_image: str  # Base64 encoded image with YOLO detections drawn


class DiagnosisResponse(BaseModel):
    status: str = 'success'
    report: str                      # Professional clinical summary
    urgency_level: str               # 'low' | 'medium' | 'high'
    action_plan: List[str]           # Recommended steps
    detection: DetectionResult


class BatchDiagnosisItem(BaseModel):
    filename: str                    # Original filename
    report: str                      # Professional clinical summary
    urgency_level: str               # 'low' | 'medium' | 'high'
    action_plan: List[str]           # Recommended steps
    detection: DetectionResult


class BatchDiagnosisResponse(BaseModel):
    status: str = 'success'
    count: int                       # Number of images processed
    results: List[BatchDiagnosisItem]  # Results for each image


class ChatRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=1000)
    context: str     # the original report text passed back from Node.js


class ChatResponse(BaseModel):
    answer: str
