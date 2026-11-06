import os
import threading
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

import faiss
import numpy as np
import psycopg

EMBEDDING_DIMS = 384


def postgres_dsn(url: str) -> str:
    # Prisma's ?schema=public is not a Postgres option, and psycopg rejects it
    parts = urlsplit(url)
    query = [(key, value) for key, value in parse_qsl(parts.query) if key != "schema"]
    return urlunsplit(parts._replace(query=urlencode(query)))


class VectorIndex:
    """Exact nearest-neighbor search over every embedded chunk, held in memory."""

    def __init__(self):
        self._state = None  # (faiss index, chunk ids): replaced as one, so a search never sees a mix
        self._rebuild_lock = threading.Lock()

    def rebuild(self) -> int:
        with self._rebuild_lock:
            with psycopg.connect(postgres_dsn(os.environ["DATABASE_URL"])) as conn:
                rows = conn.execute(
                    'SELECT id, embedding FROM "Chunk" WHERE cardinality(embedding) = %s',
                    (EMBEDDING_DIMS,),
                ).fetchall()

            # Normalized vectors, so inner product (IP) is cosine similarity
            index = faiss.IndexFlatIP(EMBEDDING_DIMS)
            if rows:
                index.add(np.array([embedding for _, embedding in rows], dtype=np.float32))

            self._state = (index, [chunk_id for chunk_id, _ in rows])
            return len(rows)

    @property
    def size(self) -> int | None:
        return None if self._state is None else len(self._state[1])

    def search(self, vectors: list[list[float]], k: int) -> list[list[dict]]:
        index, ids = self._state
        if not ids:
            return [[] for _ in vectors]

        scores, positions = index.search(np.array(vectors, dtype=np.float32), min(k, len(ids)))
        return [
            [{"chunk_id": ids[p], "score": float(s)} for p, s in zip(row_positions, row_scores)]
            for row_positions, row_scores in zip(positions, scores)
        ]
