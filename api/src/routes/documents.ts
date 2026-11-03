import { Router } from "express";
import { getDocumentController, deleteDocumentController, listDocumentsController, inspectDocumentController, reprocessDocumentController } from "../controllers/documentController";



const router = Router();
router.get("/documents", listDocumentsController);
router.get("/documents/:id", getDocumentController);
router.get("/documents/:id/inspect", inspectDocumentController);
router.post("/documents/:id/reprocess", reprocessDocumentController);
router.delete("/documents/:id", deleteDocumentController);


export default router;
