import { prisma } from "../lib/prisma";
import { Prisma } from "@prisma/client";

const CHUNK_SIZE = 500; // words per chunk

export function chunkText(text: string): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const chunks: string[] = [];
  for (let i = 0; i < words.length; i += CHUNK_SIZE) {
    chunks.push(words.slice(i, i + CHUNK_SIZE).join(" "));
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

  return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    //                                                  ^^^^^^^^^^^^^^^^^^^^ add this
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
        embedding: [],
      })),
    });

    return { document: doc, chunkCount: chunks.length };
  });
}