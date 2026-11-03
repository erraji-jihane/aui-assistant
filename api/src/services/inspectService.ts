import { prisma } from "../lib/prisma";
import { countTokens } from "../lib/embed";
import { CHUNK_OVERLAP, CHUNK_SIZE } from "./documentService";

const EMBEDDING_MODEL = "all-MiniLM-L6-v2";
const EMBEDDING_DIMS = 384;
const DEFAULT_MAX_TOKENS = 256; // the model silently truncates anything longer
const TOKENS_PER_WORD = 1.3; // fallback estimate when the ML service is unreachable
const MAX_MATRIX_CHUNKS = 60; // the n×n similarity matrix grows fast
const BYTES_PER_FLOAT = 8; // Prisma Float[] is Postgres double precision[]

function dot(a: number[], b: number[]) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
  return sum;
}

function round(x: number, digits = 4) {
  const f = 10 ** digits;
  return Math.round(x * f) / f;
}

function average(xs: number[]) {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

function toWords(text: string) {
  return text.split(/\s+/).filter(Boolean);
}

// Longest run of words that ends `prev` and starts `cur`: the overlap actually stored
function measureOverlap(prev: string[], cur: string[]) {
  for (let k = Math.min(prev.length, cur.length); k > 0; k--) {
    let match = true;
    for (let i = 0; i < k; i++) {
      if (prev[prev.length - k + i] !== cur[i]) {
        match = false;
        break;
      }
    }
    if (match) return k;
  }
  return 0;
}

// Exact counts from the model's tokenizer; falls back to an estimate if the ML service is down
async function tokenCounts(texts: string[], words: string[][]) {
  try {
    const { counts, maxTokens } = await countTokens(texts);
    return { counts, maxTokens, exact: true };
  } catch (err) {
    console.warn("Token counts are estimated:", err);
    return {
      counts: words.map((w) => Math.round(w.length * TOKENS_PER_WORD) + 2),
      maxTokens: DEFAULT_MAX_TOKENS,
      exact: false,
    };
  }
}

export async function inspectDocument(id: string) {
  const doc = await prisma.document.findUnique({
    where: { id },
    include: { chunks: { orderBy: { chunkIndex: "asc" } } },
  });
  if (!doc) return null;

  const words = doc.chunks.map((c) => toWords(c.content));
  const tokens = await tokenCounts(doc.chunks.map((c) => c.content), words);
  const isEmbedded = (v: number[]) => v.length === EMBEDDING_DIMS;

  const chunks = doc.chunks.map((c, i) => {
    const wordCount = words[i].length;
    const tokenCount = tokens.counts[i];
    const overLimit = tokenCount > tokens.maxTokens;
    const prev = doc.chunks[i - 1];
    return {
      id: c.id,
      index: c.chunkIndex,
      content: c.content,
      wordCount,
      charCount: c.content.length,
      tokens: tokenCount,
      overLimit,
      // Roughly how many words the model actually reads before it truncates
      keptWords: overLimit ? Math.floor((wordCount * tokens.maxTokens) / tokenCount) : wordCount,
      overlapWords: i === 0 ? 0 : measureOverlap(words[i - 1], words[i]),
      hasEmbedding: isEmbedded(c.embedding),
      norm: isEmbedded(c.embedding) ? round(Math.sqrt(dot(c.embedding, c.embedding))) : null,
      simPrev:
        prev && isEmbedded(c.embedding) && isEmbedded(prev.embedding)
          ? round(dot(c.embedding, prev.embedding))
          : null,
      embedding: c.embedding.map((x) => round(x)),
    };
  });

  const embedded = doc.chunks.filter((c) => isEmbedded(c.embedding));
  const wordCounts = chunks.map((c) => c.wordCount);
  const overlaps = chunks.slice(1).map((c) => c.overlapWords);
  const sims = chunks.map((c) => c.simPrev).filter((s): s is number => s !== null);
  const maxWords = wordCounts.length ? Math.max(...wordCounts) : 0;
  const avgOverlapWords = round(average(overlaps), 1);

  return {
    document: {
      id: doc.id,
      filename: doc.filename,
      mimeType: doc.mimeType,
      sizeBytes: doc.sizeBytes,
      uploadedAt: doc.uploadedAt,
      textChars: doc.text.length,
      totalWords: toWords(doc.text).length,
    },
    config: {
      chunkSize: CHUNK_SIZE,
      chunkOverlap: CHUNK_OVERLAP,
      step: CHUNK_SIZE - CHUNK_OVERLAP,
      model: EMBEDDING_MODEL,
      dims: EMBEDDING_DIMS,
      maxTokens: tokens.maxTokens,
      tokenCountsExact: tokens.exact,
    },
    stats: {
      chunkCount: chunks.length,
      embeddedCount: embedded.length,
      emptyCount: chunks.filter((c) => c.wordCount === 0).length,
      overLimitCount: chunks.filter((c) => c.overLimit).length,
      avgWords: round(average(wordCounts), 1),
      minWords: wordCounts.length ? Math.min(...wordCounts) : 0,
      maxWords,
      avgTokens: Math.round(average(tokens.counts)),
      maxTokensSeen: tokens.counts.length ? Math.max(...tokens.counts) : 0,
      avgOverlapWords,
      meanSimPrev: sims.length ? round(average(sims)) : null,
      vectorBytes: embedded.length * EMBEDDING_DIMS * BYTES_PER_FLOAT,
      // Chunked with different settings than the current ones (re-process to update)
      outdated: maxWords > CHUNK_SIZE || (chunks.length > 1 && Math.abs(avgOverlapWords - CHUNK_OVERLAP) > 1),
    },
    // Cosine similarity between every pair of chunks (vectors are normalized, so it's a dot product)
    similarity:
      embedded.length > 0 && embedded.length <= MAX_MATRIX_CHUNKS
        ? {
            indexes: embedded.map((c) => c.chunkIndex),
            values: embedded.map((a) => embedded.map((b) => round(dot(a.embedding, b.embedding), 3))),
          }
        : null,
    chunks,
  };
}
