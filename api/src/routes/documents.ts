import { Router } from "express";
import { getDocumentController, deleteDocumentController, listDocumentsController } from "../controllers/documentController";



const router = Router();
router.get("/documents", listDocumentsController);
router.get("/documents/:id", getDocumentController);
router.delete("/documents/:id", deleteDocumentController);


export default router;
