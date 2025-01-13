from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from transformers import AutoTokenizer, AutoModelForCausalLM
import torch
import uvicorn
import logging

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Define input schema
class ChatRequest(BaseModel):
    prompt: str

# Initialize FastAPI app
app = FastAPI(title="AI16Sm Chat API")

# CORS configuration
origins = [
    "https://ai16sm.com",
    "https://www.ai16sm.com",
    "http://localhost:5500",
    "http://localhost:8000"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"]
)

# Load the tokenizer and model
try:
    logger.info("Loading model and tokenizer...")
    model_directory = "/home/ubuntu/project/fine_tuned_gpt2"
    tokenizer = AutoTokenizer.from_pretrained(model_directory, local_files_only=True)
    model = AutoModelForCausalLM.from_pretrained(model_directory, local_files_only=True)
    
    if tokenizer.pad_token is None:
        tokenizer.add_special_tokens({'pad_token': '[PAD]'})
        model.resize_token_embeddings(len(tokenizer))
    logger.info("Model and tokenizer loaded successfully")
except Exception as e:
    logger.error(f"Error loading model: {str(e)}")
    raise

@app.get("/")
async def root():
    return {
        "message": "Welcome to the Fine-Tuned GPT-2 Chat API! Use /chat to interact.",
        "status": "healthy",
        "endpoints": {
            "chat": "/chat",
            "schema": "/schema",
            "docs": "/docs"
        }
    }

@app.post("/chat")
async def chat(req: ChatRequest):
    try:
        logger.info(f"Received chat request with prompt: {req.prompt[:50]}...")
        
        if not req.prompt.strip():
            raise HTTPException(status_code=400, detail="Empty prompt provided")
        
        inputs = tokenizer(
            req.prompt,
            return_tensors="pt",
            padding=True,
            truncation=True,
            max_length=256
        )
        
        outputs = model.generate(
            inputs["input_ids"],
            max_length=50,
            pad_token_id=tokenizer.pad_token_id,
            do_sample=True,
            temperature=0.7,
            top_k=50,
            top_p=0.9,
            repetition_penalty=1.2,
        )
        response = tokenizer.decode(outputs[0], skip_special_tokens=True)
        logger.info(f"Generated response: {response[:50]}...")
        
        return {"response": response}
            
    except Exception as e:
        logger.error(f"Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/schema")
async def schema():
    return ChatRequest.schema_json()

# Add OPTIONS handler for CORS preflight requests
@app.options("/chat")
async def options_chat():
    return {"message": "OK"}

if __name__ == "__main__":
    logger.info("Starting server with SSL...")
    try:
        uvicorn.run(
            app,
            host="0.0.0.0",
            port=8000,
            ssl_keyfile="/etc/letsencrypt/live/api.ai16sm.com/privkey.pem",
            ssl_certfile="/etc/letsencrypt/live/api.ai16sm.com/fullchain.pem",
            log_level="info"
        )
    except Exception as e:
        logger.error(f"Failed to start server: {str(e)}")
        raise 