import { prisma } from "../lib/prisma";
import { countTokens, embedTexts, searchVectors } from "../lib/embed";
import { chunkText } from "./documentService";

export async function searchPassages(query: string, k: number) {
  const startedAt = Date.now();

  // A question is embedded whole. Only text past the model's limit is chunked, because the
  // model would silently ignore the rest of it
  const { counts, maxTokens } = await countTokens([query]);
  const tokens = counts[0];
  const chunked = tokens > maxTokens;
  const parts = chunked ? chunkText(query) : [query];

  const vectors = await embedTexts(parts);
  const { results, indexed } = await searchVectors(vectors, k);

  // A passage can match several parts: keep its best score
  const bestScores = new Map<string, number>();
  for (const { chunk_id, score } of results.flat()) {
    bestScores.set(chunk_id, Math.max(bestScores.get(chunk_id) ?? -1, score));
  }
  const top = [...bestScores].sort((a, b) => b[1] - a[1]).slice(0, k);

  const chunks = await prisma.chunk.findMany({
    where: { id: { in: top.map(([id]) => id) } },
    select: {
      id: true,
      chunkIndex: true,
      content: true,
      document: { select: { id: true, filename: true } },
    },
  });
  const chunksById = new Map(chunks.map((c) => [c.id, c]));

  return {
    processing: {
      tokens,
      maxTokens,
      chunked,
      parts: parts.length,
      dims: vectors[0].length,
      embedding: vectors[0],
      indexed,
      tookMs: Date.now() - startedAt,
    },
    // flatMap skips a chunk deleted after the index was last built
    results: top.flatMap(([id, score]) => {
      const chunk = chunksById.get(id);
      if (!chunk) return [];
      return [
        {
          chunkId: id,
          chunkIndex: chunk.chunkIndex,
          documentId: chunk.document.id,
          filename: chunk.document.filename,
          content: chunk.content,
          score,
        },
      ];
    }),
  };
}
