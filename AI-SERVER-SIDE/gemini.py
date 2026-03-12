import os
from dotenv import load_dotenv
from google import genai

load_dotenv()
API_KEY = os.getenv("GEMINI_API_KEY")

client = genai.Client(api_key=API_KEY)

try:
    response = client.models.generate_content(
        model="gemini-2.0-flash", 
        contents="Test connection"
    )
    print("Success:", response.text)
except Exception as e:
    print(f"Failed again: {e}")