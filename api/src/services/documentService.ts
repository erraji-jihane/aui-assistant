import { prisma } from "../lib/prisma";
import { Prisma } from "@prisma/client";
import { embedTexts, refreshIndex } from "../lib/embed";

// 120 words keeps almost every chunk under the model's 256-token limit, measured on real AUI PDFs
// (course codes like "CSC 4352" cost ~1.5 tokens per word, so 200-word chunks were often cut off)
export const CHUNK_SIZE = 120; // words per chunk
export const CHUNK_OVERLAP = 20;

export function chunkText(text: string): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const chunks: string[] = [];
  const step = CHUNK_SIZE - CHUNK_OVERLAP;

  for (let i = 0; i < words.length; i += step) {
    chunks.push(words.slice(i, i + CHUNK_SIZE).join(" "));
    if (i + CHUNK_SIZE >= words.length) break;
  }
  return chunks.length > 0 ? chunks : [""];
}

// Chunk and embed outside any transaction: the embedding call is slow
async function buildChunks(text: string) {
  const chunks = chunkText(text);
  const embeddings = await embedTexts(chunks);
  return chunks.map((content, index) => ({
    content,
    chunkIndex: index,
    embedding: embeddings[index],
  }));
}

export async function createDocumentWithChunks(params: {
  filename: string;
  mimeType: string;
  sizeBytes: number;
  text: string;
}) {
  const chunks = await buildChunks(params.text);

  const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const doc = await tx.document.create({
      data: {
        filename: params.filename,
        mimeType: params.mimeType,
        sizeBytes: params.sizeBytes,
        text: params.text,
      },
    });

    await tx.chunk.createMany({
      data: chunks.map((chunk) => ({ ...chunk, documentId: doc.id })),
    });

    return { document: doc, chunkCount: chunks.length };
  });

  await refreshIndex();
  return result;
}

// Re-chunk and re-embed a stored document with the current settings, replacing its old chunks
export async function reprocessDocument(id: string) {
  const doc = await prisma.document.findUnique({ where: { id } });
  if (!doc) return null;

  const chunks = await buildChunks(doc.text);

  await prisma.$transaction([
    prisma.chunk.deleteMany({ where: { documentId: id } }),
    prisma.chunk.createMany({ data: chunks.map((chunk) => ({ ...chunk, documentId: id })) }),
  ]);

  await refreshIndex();
  return { documentId: id, chunkCount: chunks.length };
}
