import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", async (_req: Request, res: Response) => {
  let ml = "unreachable";
  try {
    const r = await fetch("http://localhost:8000/health");
    const data = await r.json();
    ml = data.status;
  } catch {
    ml = "unreachable";
  }
  res.json({ api: "ok", ml });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});