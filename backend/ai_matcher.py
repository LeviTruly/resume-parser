import json
from google import genai

client = genai.Client()


def get_ai_match(resume, job):
    prompt = f"""
You are a resume and job matching assistant.

Compare this resume with this job.

RESUME:
{json.dumps(resume, indent=2)}

JOB:
{json.dumps(job, indent=2)}

Give:
1. A semantic match score from 0 to 100
2. Three strengths
3. Three weaknesses
4. A short explanation

Return ONLY valid JSON in this format:

{{
    "score": 0,
    "strengths": [],
    "weaknesses": [],
    "explanation": ""
}}
"""

    response = client.models.generate_content(
        model="gemini-3.6-flash",
        contents=prompt
    )

    return json.loads(response.text)
with open("test_resume.json", "r") as file:
    resume = json.load(file)

with open("test_job.json", "r") as file:
    job = json.load(file)

result = get_ai_match(resume, job)

print(json.dumps(result, indent=2))