from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import tempfile
from pdf_parser import extract_text_from_pdf

app = FastAPI()

app.add_middleware (
    CORSMiddleware,
    allow_origins=[
        "https://localhost:5173",
        "https://127.0.0.1:5173",
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
async def upload_resume(file: UploadFile = File(...)):
    with tempfile.NamedTemporaryFile(delete = False, suffix = ".pdf") as temp_file:
        content = await file.read()
        temp_file.write(content)
        temp_file_path = temp_file.name
    text = extract_text_from_pdf(temp_file_path) 
    return {
        "filename": file.filename,
        "text": text,
        "message": "Resume uploaded successfully"
    }