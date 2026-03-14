# app/gemini_report.py
import os
import json
import re
from dotenv import load_dotenv
from app.schemas import DetectionResult
from app.urgency_analyzer import analyze_urgency, get_urgency_action_plan

HAS_NEW_GENAI = False
HAS_LEGACY_GENAI = False

try:
    from google import genai as new_genai
    HAS_NEW_GENAI = True
except Exception:
    new_genai = None

try:
    import google.generativeai as legacy_genai
    HAS_LEGACY_GENAI = True
except Exception:
    legacy_genai = None

load_dotenv()
api_key = os.getenv('GEMINI_API_KEY')
if not api_key:
    raise ValueError("GEMINI_API_KEY not found in .env")

MODEL = os.getenv('GEMINI_MODEL', 'gemini-2.5-flash')

if HAS_NEW_GENAI:
    client = new_genai.Client(api_key=api_key)
elif HAS_LEGACY_GENAI:
    legacy_genai.configure(api_key=api_key)
    client = None
else:
    raise ImportError(
        "No Gemini SDK available. Install either 'google-genai' or 'google-generativeai'."
    )


def _generate_content_text(prompt: str) -> str:
    if HAS_NEW_GENAI and client is not None:
        response = client.models.generate_content(model=MODEL, contents=prompt)
        return (response.text or "").strip()

    if HAS_LEGACY_GENAI:
        model = legacy_genai.GenerativeModel(MODEL)
        response = model.generate_content(prompt)
        return (response.text or "").strip()

    return ""
 
 
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
        generated_text = _generate_content_text(prompt)
        raw = re.sub(r'^```json\s*|^```\s*|\s*```$', '', generated_text, flags=re.MULTILINE).strip()
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
        generated_text = _generate_content_text(prompt)
        if generated_text:
            return {
                'ai_available': True,
                'answer': generated_text,
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