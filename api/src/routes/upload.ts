import { Router } from "express";
import multer from "multer"; //librar in express to handle file uploads
import { uploadController } from "../controllers/uploadController";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post("/upload", upload.single("file"), uploadController);

export default router;
