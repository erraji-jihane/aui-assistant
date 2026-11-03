import { prisma } from "../lib/prisma";
import { Prisma } from "@prisma/client";
import { embedTexts } from "../lib/embed";

const CHUNK_SIZE = 200; // words per chunk
const CHUNK_OVERLAP = 40;

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

export async function createDocumentWithChunks(params: {
  filename: string;
  mimeType: string;
  sizeBytes: number;
  text: string;
}) {
  const chunks = chunkText(params.text);
  const embeddings = await embedTexts(chunks);   
  return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const doc = await tx.document.create({
      data: {
        filename: params.filename,
        mimeType: params.mimeType,
        sizeBytes: params.sizeBytes,
        text: params.text,
      },
    });

    await tx.chunk.createMany({
      data: chunks.map((content, index) => ({
        documentId: doc.id,
        content,
        chunkIndex: index,
        embedding: embeddings[index], 
      })),
    });

    return { document: doc, chunkCount: chunks.length };
  });
}