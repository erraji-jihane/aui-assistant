from fastapi import FastAPI
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer

app = FastAPI(title="AUI Assistant - ML Service")

# Load once at startup, not on every request (loading takes seconds)
model = SentenceTransformer("all-MiniLM-L6-v2")


class EmbedRequest(BaseModel):
    texts: list[str]


class EmbedResponse(BaseModel):
    embeddings: list[list[float]]


@app.get("/health")
def health_check():
    return {"status": "healthy"}

class TokenizeResponse(BaseModel):
    counts: list[int]
    max_tokens: int


@app.post("/tokenize", response_model=TokenizeResponse)
def tokenize(request: EmbedRequest):
    # Counts include the [CLS] and [SEP] tokens the model adds, so they compare directly to max_tokens
    ids = model.tokenizer(request.texts, add_special_tokens=True)["input_ids"]
    return {"counts": [len(x) for x in ids], "max_tokens": model.max_seq_length}


@app.post("/embed", response_model=EmbedResponse)
def embed(request: EmbedRequest):
    vectors = model.encode(request.texts, normalize_embeddings=True)
    return {"embeddings": vectors.tolist()}
