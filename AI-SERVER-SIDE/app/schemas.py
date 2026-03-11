# app/schemas.py
from pydantic import BaseModel, Field
from typing import List


class DetectionResult(BaseModel):
    classification_label: str        # ResNet top-1 class name
    classification_confidence: float
    classification_probabilities: dict  # All class probabilities {class_name: probability}
    detection_image: str  # Base64 encoded image with YOLO detections drawn


class DiagnosisResponse(BaseModel):
    status: str = 'success'
    detection: DetectionResult
    report: str                      # plain-language medical summary
    urgency_level: str               # 'low' | 'medium' | 'high'
    action_plan: List[str]           # list of recommended steps


class ChatRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=1000)
    context: str     # the original report text passed back from Node.js


class ChatResponse(BaseModel):
    answer: str
