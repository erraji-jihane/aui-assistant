import { Router } from "express";
import { getDocumentController } from "../controllers/documentController";

const router = Router();
router.get("/documents/:id", getDocumentController);

export default router;
