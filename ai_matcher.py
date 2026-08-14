import json
import os

from dotenv import load_dotenv
from google import genai


env_path = os.path.join(
    os.path.dirname(__file__),
    "..",
    ".env"
)

load_dotenv(env_path)

api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    raise RuntimeError(
        "GEMINI_API_KEY is not configured."
    )

client = genai.Client(
    api_key=api_key
)


def get_ai_match(resume, job):
    prompt = f"""
You are a professional resume and job matching assistant.

Compare the candidate resume with the job.

RESUME:
{json.dumps(resume, indent=2)}

JOB:
{json.dumps(job, indent=2)}

Give:

1. A semantic match score from 0 to 100
2. Exactly three strengths
3. Exactly three weaknesses
4. A short explanation

Return ONLY valid JSON.

Use exactly:

{{
    "score": 0,
    "strengths": [],
    "weaknesses": [],
    "explanation": ""
}}

Do not include Markdown.
Do not include code fences.
"""

    response = client.models.generate_content(
        model="gemini-3.6-flash",
        contents=prompt,
        config={
            "response_mime_type": "application/json"
        }
    )

    if not response.text:
        raise ValueError(
            "AI matcher returned an empty response."
        )

    return json.loads(
        response.text
    )