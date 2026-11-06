import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { refreshIndex } from "../lib/embed";
import { inspectDocument } from "../services/inspectService";
import { reprocessDocument } from "../services/documentService";


export async function getDocumentController(req: Request<{ id: string }>, res: Response) {
    const doc = await prisma.document.findUnique({
        where: { id: req.params.id },
        include: { chunks: { orderBy: { chunkIndex: "asc" } } },
    });
    if (!doc) {
        return res.status(404).json({ error: "Document not found" });
    }
    return res.json({
        filename: doc.filename,
        textPreview: doc.text.slice(0, 300),
        chunkCount: doc.chunks.length,
        chunksWithoutEmbedding: doc.chunks.filter((c) => c.embedding.length !== 384).length,
        emptyChunks: doc.chunks.filter((c) => c.content.trim() === "").length,
    })
}

export async function deleteDocumentController(req: Request<{ id: string }>, res: Response) {
    const result = await prisma.document.deleteMany({
        where: { id: req.params.id },
    });
    if (result.count === 0) {
        return res.status(404).json({ error: "Document not found" });
    }
    await refreshIndex();
    return res.status(204).send();
}

export async function listDocumentsController(_req: Request, res: Response) {
    const docs = await prisma.document.findMany({
        orderBy: { uploadedAt: "desc" },
        select: {
            id: true,
            filename: true,
            sizeBytes: true,
            uploadedAt: true,
            _count: { select: { chunks: true } },
        },
    });
    return res.json(
        docs.map((d) => ({
            id: d.id,
            filename: d.filename,
            sizeBytes: d.sizeBytes,
            uploadedAt: d.uploadedAt,
            chunkCount: d._count.chunks,
        }))
    );
}

export async function inspectDocumentController(req: Request<{ id: string }>, res: Response) {
    const report = await inspectDocument(req.params.id);
    if (!report) {
        return res.status(404).json({ error: "Document not found" });
    }
    return res.json(report);
}

export async function reprocessDocumentController(req: Request<{ id: string }>, res: Response) {
    try {
        const result = await reprocessDocument(req.params.id);
        if (!result) {
            return res.status(404).json({ error: "Document not found" });
        }
        return res.json(result);
    } catch (err) {
        console.error("Reprocess failed:", err);
        return res.status(500).json({ error: "Failed to re-process document" });
    }
}
