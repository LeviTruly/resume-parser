from fastapi import FastAPI, UploadFile, File, HTTPException
import tempfile
import os
from fastapi.middleware.cors import CORSMiddleware
from pdf_parser import extract_text_from_pdf
from ai_parser import parse_resume_with_ai

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
#the 

MAX_FILE_SIZE = 5 * 1024 * 1024


@app.get("/")
def home():
    return {
        "message": "Resume Parser API is running"
    }


@app.post("/resume/parse")
async def upload_resume(file: UploadFile = File(...)):

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

    with tempfile.NamedTemporaryFile(
        delete=False,
        suffix=".pdf"
    ) as temp_file:

        temp_file.write(content)
        temp_file_path = temp_file.name

    try:
        text = extract_text_from_pdf(temp_file_path)

        resume_data = parse_resume_with_ai(text)

        return {
            "filename": file.filename,
            "resume": resume_data
        }

    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Resume processing failed."
        )

    finally:
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)