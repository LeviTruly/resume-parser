from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware

import tempfile
import os

from pdf_parser import extract_text_from_pdf
from ai_parser import parse_resume_with_ai


app = FastAPI(
    title="CareerMatch Resume Parser API"
)


# Maximum uploaded file size: 5 MB
MAX_FILE_SIZE = 5 * 1024 * 1024


# --------------------------------------------------
# CORS
# --------------------------------------------------

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


# --------------------------------------------------
# Home
# --------------------------------------------------

@app.get("/")
def home():
    return {
        "message": "Resume Parser API is running"
    }


# --------------------------------------------------
# Resume Parser
# --------------------------------------------------

@app.post("/resume/parse")
async def upload_resume(
    file: UploadFile = File(...)
):

    # Check file exists
    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="No file was provided."
        )

    # Check file type
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="Only PDF files are allowed."
        )

    # Read uploaded file
    content = await file.read()

    # Check file size
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail="File is too large. Maximum size is 5 MB."
        )

    temp_file_path = None

    try:

        # --------------------------------------------------
        # Save PDF temporarily
        # --------------------------------------------------

        with tempfile.NamedTemporaryFile(
            delete=False,
            suffix=".pdf"
        ) as temp_file:

            temp_file.write(content)

            temp_file_path = temp_file.name


        # --------------------------------------------------
        # Extract text from PDF
        # --------------------------------------------------

        text = extract_text_from_pdf(
            temp_file_path
        )

        if not text.strip():
            raise HTTPException(
                status_code=400,
                detail="Could not extract any text from the PDF."
            )


        # --------------------------------------------------
        # Send extracted text to Gemini
        # --------------------------------------------------

        resume_data = parse_resume_with_ai(
            text
        )


        # --------------------------------------------------
        # Return structured resume
        # --------------------------------------------------

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

        # --------------------------------------------------
        # Delete temporary PDF
        # --------------------------------------------------

        if (
            temp_file_path
            and os.path.exists(temp_file_path)
        ):
            os.remove(temp_file_path)