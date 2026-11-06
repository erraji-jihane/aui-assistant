import { Router } from "express";
import { searchController } from "../controllers/searchController";

const router = Router();
router.post("/search", searchController);

export default router;
