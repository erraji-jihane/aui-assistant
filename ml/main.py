import logging
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from sentence_transformers import SentenceTransformer

from search_index import EMBEDDING_DIMS, VectorIndex

load_dotenv()

logger = logging.getLogger("uvicorn.error")

# Load once at startup, not on every request (loading takes seconds)
model = SentenceTransformer("all-MiniLM-L6-v2")
index = VectorIndex()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    # Embedding still works without the database, so a failure here doesn't stop the service
    try:
        logger.info("Search index loaded with %d chunks", index.rebuild())
    except Exception:
        logger.exception("Search index not loaded: /search answers 503 until /reindex succeeds")
    yield


app = FastAPI(title="AUI Assistant - ML Service", lifespan=lifespan)


class EmbedRequest(BaseModel):
    texts: list[str]


class EmbedResponse(BaseModel):
    embeddings: list[list[float]]


class SearchRequest(BaseModel):
    vectors: list[list[float]] = Field(min_length=1)
    k: int = Field(default=5, ge=1, le=50)


class SearchHit(BaseModel):
    chunk_id: str
    score: float


class SearchResponse(BaseModel):
    results: list[list[SearchHit]]  # one ranked list per input vector
    indexed: int


class ReindexResponse(BaseModel):
    indexed: int


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


@app.post("/search", response_model=SearchResponse)
def search(request: SearchRequest):
    if index.size is None:
        raise HTTPException(status_code=503, detail="Search index is not loaded")
    if any(len(vector) != EMBEDDING_DIMS for vector in request.vectors):
        raise HTTPException(status_code=422, detail=f"Vectors must have {EMBEDDING_DIMS} numbers")
    return {"results": index.search(request.vectors, request.k), "indexed": index.size}


@app.post("/reindex", response_model=ReindexResponse)
def reindex():
    return {"indexed": index.rebuild()}
