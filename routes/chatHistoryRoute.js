import { Router } from "express";
import { getChatHistory } from "../controllers/chatController.js";
import { verifyJwt } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(verifyJwt);

router.route("/history/:type/:id?").get(getChatHistory);

export default router;
