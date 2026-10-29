import { Router, Request, Response } from "express";
import { healthController } from "../controllers/healthController";

const router = Router();

// GET /api/health — effective URL = "/api" (from index.ts) + "/health"
router.get("/health", healthController);
export default router;