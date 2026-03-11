# app/gemini_report.py
import google.generativeai as genai
import os, json, re
from dotenv import load_dotenv
from app.schemas import DetectionResult
 
load_dotenv()
genai.configure(api_key=os.getenv('GEMINI_API_KEY'))
GEMINI_MODEL = os.getenv('GEMINI_MODEL', 'gemini-pro')
_model = genai.GenerativeModel(GEMINI_MODEL)
 
 
def generate_report(detection: DetectionResult) -> dict:
    # Build detected items list
    detected_items = []
    if detection.detections:
        for det in detection.detections:
            detected_items.append(f"{det.label} ({det.confidence:.0%})")
    detected_str = ", ".join(detected_items) if detected_items else "No significant findings"
    
    prompt = f'''You are a dental professional. Analyze these findings and respond ONLY with valid JSON.

Findings:
- Classification: {detection.classification_label} ({detection.classification_confidence:.0%})
- Detected: {detected_str}

Respond with ONLY this JSON:
{{
  "report": "5-10 sentence professional summary of findings and recommendations",
  "urgency_level": "low" or "medium" or "high",
  "action_plan": ["step 1", "step 2", "step 3"]
}}'''
    
    try:
        response = _model.generate_content(prompt)
        raw = response.text.strip()
        # Strip markdown fences if Gemini adds them
        raw = re.sub(r'^```json\s*|^```\s*|\s*```$', '', raw,
                     flags=re.MULTILINE).strip()
        data = json.loads(raw)
        return {
            'report': data.get('report', ''),
            'urgency_level': data.get('urgency_level', 'medium'),
            'action_plan': data.get('action_plan', []),
        }
    except Exception as e:
        # Graceful fallback if Gemini unavailable
        return {
            'report': f'The analysis indicates {detection.classification_label} with {detection.classification_confidence:.0%} confidence. Detected conditions: {detected_str}. Recommend professional evaluation.',
            'urgency_level': 'medium',
            'action_plan': [
                'Schedule dental consultation',
                'Discuss findings with dentist',
                'Follow professional recommendations'
            ],
        }
 
 
def chat_with_context(question: str, context: str) -> str:
    prompt = f'''You are a helpful dental AI assistant.
Answer the patient question based only on the report below.
Be concise and reassuring.
 
Report: {context}
 
Patient question: {question}'''
    
    try:
        response = _model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        # Graceful fallback if Gemini unavailable
        return f"Based on the report ('{context[:50]}...'), your question was: {question}. Please consult with your dentist for detailed discussion."