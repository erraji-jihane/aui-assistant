const ML_URL = process.env.ML_URL || "http://localhost:8000";

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
