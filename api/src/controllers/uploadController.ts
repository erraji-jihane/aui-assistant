import { Request, Response } from "express";
import { createDocumentWithChunks } from "../services/documentService";
import { extractTextFromPDF } from "../lib/extractText";



const ALLOWED_TYPES = ["application/pdf", "text/plain"];


export async function uploadController(req: Request, res: Response) {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  if (!ALLOWED_TYPES.includes(req.file.mimetype)) {
   return res.status(415).json({ error: `Unsupported file type: ${req.file.mimetype}` });
  }

  try {
    const text = await extractTextFromPDF(req.file.buffer, req.file.mimetype);
    if (!text){
      return res.status(422).json({error: "No text found in file (is it a scanned PDF)"})
    }
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
