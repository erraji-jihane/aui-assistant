import { Request, Response } from "express";

export async function healthController(_req: Request, res: Response) {
  let ml = "unreachable";
  try {
    const r = await fetch("http://localhost:8000/health");
    const data = await r.json();
    ml = data.status;
  } catch {
    ml = "unreachable";
  }
  res.json({ api: "healthy", ml });
}