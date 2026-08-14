import json
import os

from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from google import genai
from google.genai import types


load_dotenv()


router = APIRouter()

sessions = {}

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not GEMINI_API_KEY:
    raise RuntimeError(
        "GEMINI_API_KEY was not found in the backend .env file."
    )


client = genai.Client(
    api_key=GEMINI_API_KEY
)

MODEL = "gemini-3.6-flash"


class StartRequest(BaseModel):
    session_id: str
    parsed_resume: str


class AnswerRequest(BaseModel):
    session_id: str
    user_answer: str


def get_session(session_id: str):
    session = sessions.get(session_id)

    if not session:
        raise HTTPException(
            status_code=404,
            detail="Interview session expired. Please start a new interview."
        )

    return session


async def generate_response(
    prompt: str,
    response_json: bool = False
):
    config = types.GenerateContentConfig(
        temperature=0.7,
        max_output_tokens=1200,
        response_mime_type=(
            "application/json"
            if response_json
            else "text/plain"
        ),
    )

    response = await client.aio.models.generate_content(
        model=MODEL,
        contents=prompt,
        config=config,
    )

    if not response.text:
        raise RuntimeError(
            "Gemini returned an empty response."
        )

    return response.text.strip()


@router.post("/api/start")
async def start_interview(data: StartRequest):
    try:
        sessions[data.session_id] = {
            "resume": data.parsed_resume,
            "history": [],
        }

        prompt = f"""
You are an expert technical job interviewer.

The candidate's parsed resume is:

{data.parsed_resume}

Start a realistic technical mock interview based specifically
on this candidate's resume.

Your task is to ask exactly ONE complete interview question.

IMPORTANT RULES:

1. The question MUST be grammatically complete.
2. Never stop in the middle of a sentence.
3. Never end the response with an unfinished phrase.
4. Ask only ONE question.
5. Keep the question concise.
6. The question should be directly related to the candidate's resume.
7. Do not introduce yourself.
8. Do not provide the answer.
9. Do not provide feedback.
10. Return ONLY the complete question.

Before returning your response, make sure the question ends
naturally with a question mark.
"""

        question = await generate_response(prompt)

        sessions[data.session_id]["history"].append(
            {
                "role": "assistant",
                "content": question,
            }
        )

        return {
            "question": question
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Could not start interview: {str(e)}",
        )


@router.post("/api/respond")
async def respond_interview(data: AnswerRequest):
    session = get_session(data.session_id)

    session["history"].append(
        {
            "role": "user",
            "content": data.user_answer,
        }
    )

    try:
        transcript = "\n".join(
            f"{item['role'].upper()}: {item['content']}"
            for item in session["history"]
        )

        prompt = f"""
You are an expert technical interviewer conducting a realistic
mock job interview.

Candidate resume:

{session["resume"]}

Interview transcript:

{transcript}

The candidate has just answered the latest interview question.

Ask the next logical interview question.

IMPORTANT RULES:

1. Ask exactly ONE question.
2. The question MUST be grammatically complete.
3. Never stop in the middle of a sentence.
4. Never end with an unfinished phrase.
5. End naturally with a question mark.
6. Keep it concise.
7. Make it relevant to the candidate's resume.
8. Make it relevant to the candidate's latest answer.
9. Probe deeper into their technical knowledge when appropriate.
10. You may ask about architecture, implementation,
   debugging, trade-offs, decisions, performance, or projects.
11. Do not answer the candidate.
12. Do not give feedback yet.
13. Do not ask multiple questions.
14. Return ONLY the complete interview question.

Before returning the response, check that the entire question
is complete and readable.
"""

        next_question = await generate_response(prompt)

        session["history"].append(
            {
                "role": "assistant",
                "content": next_question,
            }
        )

        return {
            "question": next_question
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Could not generate the next question: {str(e)}",
        )


@router.post("/api/evaluate")
async def evaluate_interview(session_id: str):
    session = get_session(session_id)

    try:
        transcript = "\n".join(
            f"{item['role'].upper()}: {item['content']}"
            for item in session["history"]
        )

        prompt = f"""
You are an expert technical interview evaluator.

Candidate resume:

{session["resume"]}

Mock interview transcript:

{transcript}

Evaluate the candidate's interview performance.

Return ONLY valid JSON using exactly this structure:

{{
    "score": 85,
    "strengths": [
        "specific strength",
        "specific strength"
    ],
    "improvements": [
        "specific improvement",
        "specific improvement"
    ]
}}

Rules:

- score must be an integer from 0 to 100.
- strengths must contain 2 to 4 specific points.
- improvements must contain 2 to 4 specific points.
- Evaluate technical knowledge.
- Evaluate clarity.
- Evaluate correctness.
- Evaluate reasoning.
- Evaluate communication.
- Evaluate the candidate's ability to explain projects.
- Base everything on the actual interview transcript.
- Do not invent achievements or answers.
- Return ONLY the JSON object.
"""

        content = await generate_response(
            prompt,
            response_json=True
        )

        evaluation = json.loads(content)

        if not isinstance(
            evaluation.get("score"),
            (int, float)
        ):
            raise ValueError(
                "Invalid score returned by Gemini."
            )

        evaluation["score"] = max(
            0,
            min(
                100,
                int(evaluation["score"])
            )
        )

        if not isinstance(
            evaluation.get("strengths"),
            list
        ):
            evaluation["strengths"] = []

        if not isinstance(
            evaluation.get("improvements"),
            list
        ):
            evaluation["improvements"] = []

        return evaluation

    except json.JSONDecodeError:
        raise HTTPException(
            status_code=500,
            detail="Gemini returned an invalid evaluation format.",
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Could not evaluate interview: {str(e)}",
        )