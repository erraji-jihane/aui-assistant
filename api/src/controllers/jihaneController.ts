import { Request, Response } from "express";

export async function jihaneController(_req: Request, res: Response) {
  try {
    const r = await fetch("http://localhost:8000/jihane");
    const data = await r.json();
    res.json(data);
  } catch {
    res.status(503).json({ error: "ML unreachable" });
  }
}

