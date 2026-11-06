import { Request, Response } from "express";
import { searchPassages } from "../services/searchService";

const MAX_QUERY_CHARS = 5000;
const DEFAULT_K = 5;
const MAX_K = 20;

export async function searchController(req: Request, res: Response) {
  const query = typeof req.body?.query === "string" ? req.body.query.trim() : "";
  if (!query) {
    return res.status(400).json({ error: "Write something to search for" });
  }
  if (query.length > MAX_QUERY_CHARS) {
    return res.status(400).json({ error: `Text is too long (limit ${MAX_QUERY_CHARS} characters)` });
  }

  const k = Math.min(Math.max(Math.floor(Number(req.body.k)) || DEFAULT_K, 1), MAX_K);

  try {
    return res.json(await searchPassages(query, k));
  } catch (err) {
    console.error("Search failed:", err);
    return res.status(502).json({ error: "Search is unavailable. Is the ML service running?" });
  }
}
