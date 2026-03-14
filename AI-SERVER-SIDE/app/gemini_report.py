# app/gemini_report.py
import os
import json
import re
from dotenv import load_dotenv
from google import genai
from app.schemas import DetectionResult
from app.urgency_analyzer import analyze_urgency, get_urgency_action_plan

load_dotenv()
api_key = os.getenv('GEMINI_API_KEY')
if not api_key:
    raise ValueError("GEMINI_API_KEY not found in .env")

client = genai.Client(api_key=api_key)
MODEL = os.getenv('GEMINI_MODEL', 'gemini-2.5-flash')
 
 
def generate_report(detection: DetectionResult) -> dict:
    detected_items = [f"{det.label} ({det.confidence:.0%})" for det in (detection.detections or [])]
    detected_str = ", ".join(detected_items) if detected_items else "No significant findings"
    classification_str = ", ".join([f"{cls}: {prob:.0%}" for cls, prob in detection.classification.items()])
    
    prompt = f'''You are a dental professional. Analyze these findings and respond ONLY with valid JSON.

Findings:
- Classification Probabilities: {classification_str}
- Detected: {detected_str}

Respond with ONLY this JSON:
{{
  "report": "5-10 sentence professional summary of findings and recommendations",
  "urgency_level": "low" or "medium" or "high",
  "action_plan": ["step 1", "step 2", "step 3"]
}}'''
    
    try:
        response = client.models.generate_content(model=MODEL, contents=prompt)
        raw = re.sub(r'^```json\s*|^```\s*|\s*```$', '', response.text.strip(), flags=re.MULTILINE).strip()
        data = json.loads(raw)
        return {
            'report': data.get('report', ''),
            'urgency_level': data.get('urgency_level', 'medium'),
            'action_plan': data.get('action_plan', []),
        }
    except Exception as e:
        print(f"❌ AI generation failed: {str(e)}")
        urgency = analyze_urgency(detection)
        action_plan = get_urgency_action_plan(urgency, detection)
        top_classification = max(detection.classification.items(), key=lambda x: x[1]) if detection.classification else ('Unknown', 0)
        return {
            'report': f'The analysis indicates {top_classification[0]} with {top_classification[1]:.0%} confidence. Detected conditions: {detected_str}. Recommend professional evaluation.',
            'urgency_level': urgency,
            'action_plan': action_plan,
        }
 
 
def chat_with_context(question: str, context: str) -> dict:
    prompt = f'''STRICT INSTRUCTIONS (follow exactly):
- You are a dental assistant in an ongoing conversation.
- The patient ALREADY KNOWS their diagnosis. Do NOT restate, summarize, or reference it unless they explicitly ask.
- Answer ONLY what the patient is asking in their latest message.
- If the patient sends a short social message (e.g. "ok", "thanks", "great"), reply briefly and politely - nothing medical.
- Keep answers concise and conversational.

Hidden Context (use only if needed; do not mention unless asked):
{context}

Patient Message:
{question}

Assistant Reply:'''
    
    try:
        response = client.models.generate_content(model=MODEL, contents=prompt)
        if response and response.text and response.text.strip():
            return {
                'ai_available': True,
                'answer': response.text.strip(),
            }
        return {
            'ai_available': False,
            'answer': 'AI service is not available right now.',
        }
    except Exception as e:
        print(f"❌ Chat generation failed: {str(e)}")
        return {
            'ai_available': False,
            'answer': 'AI service is not available right now.',
        }