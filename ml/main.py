from fastapi import FastAPI

app = FastAPI(title="AUI Assistant - ML Service")

@app.get("/health")

def health_check():
    return {"status": "healthy"}

@app.get("/jihane")
def jihane():
    return {"message": "Hello, Jihane!"}