export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

// One item from GET /api/documents
export type DocumentRow = {
  id: string;
  filename: string;
  sizeBytes: number;
  uploadedAt: string;
  chunkCount: number;
};

// GET /api/documents/:id/inspect
export type InspectChunk = {
  id: string;
  index: number;
  content: string;
  wordCount: number;
  charCount: number;
  tokens: number;
  overLimit: boolean;
  keptWords: number;
  overlapWords: number;
  hasEmbedding: boolean;
  norm: number | null;
  simPrev: number | null;
  embedding: number[];
};

export type InspectReport = {
  document: {
    id: string;
    filename: string;
    mimeType: string;
    sizeBytes: number;
    uploadedAt: string;
    textChars: number;
    totalWords: number;
  };
  config: {
    chunkSize: number;
    chunkOverlap: number;
    step: number;
    model: string;
    dims: number;
    maxTokens: number;
    tokenCountsExact: boolean;
  };
  stats: {
    chunkCount: number;
    embeddedCount: number;
    emptyCount: number;
    overLimitCount: number;
    avgWords: number;
    minWords: number;
    maxWords: number;
    avgTokens: number;
    maxTokensSeen: number;
    avgOverlapWords: number;
    meanSimPrev: number | null;
    vectorBytes: number;
    outdated: boolean;
  };
  similarity: { indexes: number[]; values: number[][] } | null;
  chunks: InspectChunk[];
};

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
