import express from "express";
import handleGoogleLogin from "../controllers/googleuthController.js";
const googleAuthRouter = express.Router();
googleAuthRouter.post("/auth/google", handleGoogleLogin);

export default googleAuthRouter;
