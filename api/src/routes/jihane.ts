import {Router, Request, Response} from "express";
import { jihaneController } from "../controllers/jihaneController";

const router = Router();

router.get("/jihane", jihaneController);

export default router;