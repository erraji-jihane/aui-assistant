import { Request, Response } from "express";
import { createDocumentWithChunks } from "../services/documentService";

export async function uploadController(req: Request, res: Response) {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  try {
    const text = req.file.buffer.toString("utf-8");
    const { document, chunkCount } = await createDocumentWithChunks({
      filename: req.file.originalname,
      mimeType: req.file.mimetype,
      sizeBytes: req.file.size,
      text,
    });

    return res.status(201).json({
      documentId: document.id,
      filename: document.filename,
      sizeBytes: document.sizeBytes,
      chunkCount,
    });
  } catch (err) {
    console.error("Upload failed:", err);
    return res.status(500).json({ error: "Failed to process upload" });
  }
}
