import { Router } from "express";
import { getDocumentController, deleteDocumentController } from "../controllers/documentController";



const router = Router();
router.get("/documents/:id", getDocumentController);
router.delete("/documents/:id", deleteDocumentController);


export default router;
