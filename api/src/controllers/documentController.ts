import { Request, Response } from "express";
import { prisma } from "../lib/prisma";


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
