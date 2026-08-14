from fastapi import FastAPI
app = FastAPI()
from pydantic import BaseModel
from openai import AsyncOpenAI

sessions = {}

class AnswerRequest(BaseModel):
    session_id: str
    api_key: str
    user_answer: str

@app.post("/api/start_interview")
async def start_interview(session_id: str, api_key: str, parsed_text: str):
    """Takes the parsed PDF text from the team's code and starts the interview."""
    client = AsyncOpenAI(api_key=api_key)
    sessions[session_id] = {"resume": parsed_text, "history": []}
    
    sys_prompt = (
        f"You are an AI Technical Interviewer. Candidate Resume: '{parsed_text}'. "
        "Ask the candidate their first mock interview question based on their resume. "
        "Keep it concise. Ask ONLY ONE question."
    )
    
    response = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "system", "content": sys_prompt}]
    )
    question = response.choices[0].message.content.strip()
    sessions[session_id]["history"].append({"role": "assistant", "content": question})
    
    return {"question": question}

@app.post("/api/respond")
async def respond_interview(data: AnswerRequest):
    session = sessions.get(data.session_id)
    client = AsyncOpenAI(api_key=data.api_key)
    
    session["history"].append({"role": "user", "content": data.user_answer})
    sys_prompt = f"Resume: {session['resume']}. Ask the next logical follow-up question. Ask ONLY ONE question."
    
    messages = [{"role": "system", "content": sys_prompt}] + session["history"]
    response = await client.chat.completions.create(model="gpt-4o-mini", messages=messages)
    
    next_question = response.choices[0].message.content.strip()
    session["history"].append({"role": "assistant", "content": next_question})
    return {"question": next_question}

@app.post("/api/evaluate")
async def evaluate_interview(session_id: str, api_key: str):
    session = sessions.get(session_id)
    client = AsyncOpenAI(api_key=api_key)
    
    eval_prompt = """
    Evaluate the candidate using the transcript. 
    Return JSON ONLY: {"score": 85, "strengths": ["..."], "improvements": ["..."]}
    """
    messages = [{"role": "system", "content": eval_prompt}] + session["history"]
    
    response = await client.chat.completions.create(
        model="gpt-4o-mini", messages=messages, response_format={"type": "json_object"}
    )
    import json
    return json.loads(response.choices[0].message.content.strip())