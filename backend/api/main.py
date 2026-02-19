"""FastAPI main application."""
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import io

from backend.utils.csv_parser import parse_csv
from backend.services.detection_engine import run_detection

app = FastAPI(
    title="Money Muling Detection Engine",
    description="Graph-based financial crime detection system",
    version="1.0.0"
)

# CORS middleware for frontend access
app.add_middleware(
    CORSMiddleware,
    # Allow all origins in deployments to avoid CORS issues; restrict in production if needed
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """Health check endpoint."""
    return {"status": "ok", "message": "Money Muling Detection Engine API"}


@app.post("/api/detect")
async def detect_money_muling(file: UploadFile = File(...)):
    """
    Accept CSV upload and run detection algorithms.
    
    Expected CSV format:
    - transaction_id (String)
    - sender_id (String)
    - receiver_id (String)
    - amount (Float)
    - timestamp (YYYY-MM-DD HH:MM:SS)
    """
    try:
        # Read file content
        contents = await file.read()
        file_content = contents.decode('utf-8')
        
        # Parse CSV
        try:
            transactions = parse_csv(file_content)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=f"CSV parsing error: {str(e)}")
        
        if not transactions:
            raise HTTPException(status_code=400, detail="No transactions found in CSV")
        
        # Run detection
        try:
            result = run_detection(transactions)
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Detection error: {str(e)}"
            )
        
        # Return JSON response (Pydantic model automatically serializes)
        return JSONResponse(content=result.model_dump())
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")


@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}
