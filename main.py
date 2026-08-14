from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware

import tempfile
import os

from pdf_parser import extract_text_from_pdf
from ai_parser import parse_resume_with_ai
from matcher import match_resume_to_job
from db import init_db, get_all_jobs, add_job_posting
from chatbot import router as chatbot_router


app = FastAPI(
    title="AI Resume Parser"
)


@app.on_event("startup")
def startup_event():
    init_db()


app.include_router(chatbot_router)


MAX_FILE_SIZE = 5 * 1024 * 1024


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://192.168.1.6:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def home():
    return {
        "message": "Resume Parser API is running"
    }


@app.post("/resume/parse")
async def upload_resume(
    file: UploadFile = File(...)
):
    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="No file was provided."
        )

    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="Only PDF files are allowed."
        )

    content = await file.read()

    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail="File is too large. Maximum size is 5 MB."
        )

    temp_file_path = None

    try:
        with tempfile.NamedTemporaryFile(
            delete=False,
            suffix=".pdf"
        ) as temp_file:
            temp_file.write(content)
            temp_file_path = temp_file.name

        text = extract_text_from_pdf(
            temp_file_path
        )

        if not text.strip():
            raise HTTPException(
                status_code=400,
                detail="Could not extract any text from the PDF."
            )

        resume_data = parse_resume_with_ai(text)

        return {
            "filename": file.filename,
            "resume": resume_data
        }

    except HTTPException:
        raise

    except Exception as e:
        print(
            "Resume processing error:",
            str(e)
        )

        raise HTTPException(
            status_code=500,
            detail=f"Resume processing failed: {str(e)}"
        )

    finally:
        if (
            temp_file_path
            and os.path.exists(temp_file_path)
        ):
            os.remove(temp_file_path)


@app.post("/jobs/match")
async def match_jobs(data: dict):
    resume = data.get("resume")

    if not resume:
        raise HTTPException(
            status_code=400,
            detail="Resume data is required."
        )

    try:
        jobs = get_all_jobs()
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch jobs from database: {str(e)}"
        )

    matches = []

    for job in jobs:
        result = match_resume_to_job(
            resume,
            job
        )

        matches.append({
            "job_id": job["job_id"],
            "title": job["title"],
            "company": job["company"],
            "location": job["location"],
            "description": job["description"],
            "match_score": result["score"],
            "breakdown": {
                "required_skills": result["required_score"],
                "preferred_skills": result["preferred_score"],
                "experience": result["experience_score"],
                "education": result["education_score"]
            },
            "matched_skills": result["matched_skills"],
            "missing_skills": result["missing_skills"]
        })

    matches.sort(
        key=lambda job: job["match_score"],
        reverse=True
    )

    return {
        "matches": matches
    }


@app.get("/jobs")
def get_jobs():
    try:
        return {
            "jobs": get_all_jobs()
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch jobs: {str(e)}"
        )


@app.post("/jobs")
def add_job(job: dict):
    title = job.get("title")
    company = job.get("company")
    location = job.get("location")
    description = job.get("description", "")
    min_experience = job.get("min_experience", 0)

    if not title or not company or not location:
        raise HTTPException(
            status_code=400,
            detail="Title, company, and location are required fields."
        )

    required_skills = job.get("required_skills", [])

    if isinstance(required_skills, str):
        required_skills = [
            skill.strip()
            for skill in required_skills.split(",")
            if skill.strip()
        ]

    preferred_skills = job.get("preferred_skills", [])

    if isinstance(preferred_skills, str):
        preferred_skills = [
            skill.strip()
            for skill in preferred_skills.split(",")
            if skill.strip()
        ]

    try:
        added = add_job_posting({
            "title": title,
            "company": company,
            "location": location,
            "description": description,
            "required_skills": required_skills,
            "preferred_skills": preferred_skills,
            "min_experience": int(min_experience)
        })

        return added

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to add job posting: {str(e)}"
        )
