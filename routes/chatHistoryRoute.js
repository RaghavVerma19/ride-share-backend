import { Router } from "express";
import { getChatHistory } from "../controllers/chatController.js";
import { verifyJwt } from "../middlewares/auth.middleware.js";
import asyncHandler from "../utils/asyncHandler.js";

const router = Router();

router.use(verifyJwt);

router.route("/history/:type/:id?").get(asyncHandler(getChatHistory));

export default router;
