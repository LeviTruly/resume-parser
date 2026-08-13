from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware

import tempfile
import os

from pdf_parser import extract_text_from_pdf
from ai_parser import parse_resume_with_ai
from matcher import match_resume_to_job


app = FastAPI(
    title="AI Resume Parser lol"
)

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

    jobs = [
        {
            "job_id": "accountant-001",
            "title": "Junior Accountant",
            "company": "CareerMatch Demo",
            "location": "Ahmedabad, Gujarat",
            "description": "Assist with accounting, billing, financial records and day-to-day administrative operations.",
            "required_skills": [
                "Tally ERP",
                "MS Excel",
                "Accounts",
                "Billing"
            ],
            "preferred_skills": [
                "Payroll",
                "EPF",
                "ESI"
            ],
            "min_experience": 0
        },
        {
            "job_id": "accounts-002",
            "title": "Accounts Executive",
            "company": "CareerMatch Demo",
            "location": "Ahmedabad, Gujarat",
            "description": "Handle accounting records, billing support, Excel reporting and financial documentation.",
            "required_skills": [
                "Tally ERP",
                "MS Excel",
                "Accounts",
                "Documentation"
            ],
            "preferred_skills": [
                "Billing",
                "Payroll",
                "Compliance"
            ],
            "min_experience": 1
        },
        {
            "job_id": "hr-003",
            "title": "HR & Accounts Assistant",
            "company": "CareerMatch Demo",
            "location": "Ahmedabad, Gujarat",
            "description": "Support recruitment coordination, employee documentation, payroll processing and administrative operations.",
            "required_skills": [
                "MS Excel",
                "Documentation",
                "Recruitment",
                "Payroll"
            ],
            "preferred_skills": [
                "EPF",
                "ESI",
                "Tally ERP"
            ],
            "min_experience": 0
        },
        {
            "job_id": "admin-004",
            "title": "Administrative Assistant",
            "company": "CareerMatch Demo",
            "location": "Ahmedabad, Gujarat",
            "description": "Manage documentation, office administration, reports, records and general operational support.",
            "required_skills": [
                "MS Word",
                "MS Excel",
                "Documentation",
                "Administrative"
            ],
            "preferred_skills": [
                "MS PowerPoint",
                "Accounts",
                "Recruitment"
            ],
            "min_experience": 0
        }
    ]

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