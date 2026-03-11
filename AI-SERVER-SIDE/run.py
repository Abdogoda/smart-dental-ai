# run.py  (project root)
import uvicorn, os
from dotenv import load_dotenv
 
load_dotenv()
 
if __name__ == '__main__':
    uvicorn.run(
        'app.main:app',
        host=os.getenv('AI_HOST', '0.0.0.0'),
        port=int(os.getenv('AI_PORT', 8000)),
        reload=False,  # True during development only
        workers=1,     # 1 per GPU; scale horizontally with a load balancer
    )