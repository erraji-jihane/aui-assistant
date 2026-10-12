from fastapi import  FastAPI

app: FastAPI = FastAPI(title="AUI Assistant - ML Service")
@app.get("/health")
def health():
    return { "status" : "ok" }
