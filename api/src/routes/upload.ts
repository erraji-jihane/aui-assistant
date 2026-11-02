import { Router } from "express";
import multer from "multer"; //librar in express to handle file uploads
import { uploadController } from "../controllers/uploadController";

const router = Router();
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 20 * 1024 * 1024 } // Limit file size to 20MB
});

router.post("/upload", upload.single("file"), uploadController);

export default router;
