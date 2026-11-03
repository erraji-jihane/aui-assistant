import { Request, Response } from "express";
import { ML_URL } from "../lib/embed";

export async function healthController(_req: Request, res: Response) {
  let ml = "unreachable";
  try {
    const r = await fetch(`${ML_URL}/health`);
    const data = await r.json();
    ml = data.status;
  } catch {
    ml = "unreachable";
  }
  res.json({ api: "healthy", ml });
}