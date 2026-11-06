export const ML_URL = process.env.ML_URL || "http://localhost:8000";

// Sends texts to the ML service and returns one 384-number vector per text
export async function embedTexts(texts: string[]): Promise<number[][]> {
  const res = await fetch(`${ML_URL}/embed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ texts }),
  });

  if (!res.ok) {
    throw new Error(`ML service /embed failed with status ${res.status}`);
  }

  const data = (await res.json()) as { embeddings: number[][] };
  return data.embeddings;
}

// Exact token counts from the model's own tokenizer, and the most tokens it reads per text
export async function countTokens(texts: string[]): Promise<{ counts: number[]; maxTokens: number }> {
  const res = await fetch(`${ML_URL}/tokenize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ texts }),
  });

  if (!res.ok) {
    throw new Error(`ML service /tokenize failed with status ${res.status}`);
  }

  const data = (await res.json()) as { counts: number[]; max_tokens: number };
  return { counts: data.counts, maxTokens: data.max_tokens };
}

export type SearchHit = { chunk_id: string; score: number };

// Finds the k closest chunks for each vector. Returns one ranked list per vector
export async function searchVectors(
  vectors: number[][],
  k: number
): Promise<{ results: SearchHit[][]; indexed: number }> {
  const res = await fetch(`${ML_URL}/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ vectors, k }),
  });

  if (!res.ok) {
    throw new Error(`ML service /search failed with status ${res.status}`);
  }

  return (await res.json()) as { results: SearchHit[][]; indexed: number };
}

// Rebuilds the in-memory search index after chunks change. Doesn't throw: the database write
// already succeeded, and the index catches up on the next rebuild or ML restart
export async function refreshIndex() {
  try {
    const res = await fetch(`${ML_URL}/reindex`, { method: "POST" });
    if (!res.ok) throw new Error(`status ${res.status}`);
  } catch (err) {
    console.warn("Search index not refreshed:", err);
  }
}
