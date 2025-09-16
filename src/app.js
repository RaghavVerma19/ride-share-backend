import dotenv from "dotenv";
dotenv.config({ path: ".env" });
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import http from "http";
import { WebSocketServer } from 'ws';
import { createWebSocketServer } from "./ws/wsServer.js";
import {
  homeRouter,
  loginRouter,
  registerRouter,
  AllUsersRouter,
  currentUserRouter,
  googleAuthRouter,
  logoutRouter,
  chatHistoryRoute,
  rideRouter,
  refreshTokenRouter,
} from "../routes/allRoutes.js";

const app = express();
const httpServer = http.createServer(app);

// Create and configure WebSocket server
const wss = createWebSocketServer(httpServer);
app.set("port", process.env.PORT || 3000);
app.use(
  express.json({
    limit: "16kb",
  })
);
app.use((req, res, next) => {
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  res.setHeader("Cross-Origin-Embedder-Policy", "unsafe-none");
  next();
});
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);
app.use(express.static("./views"));
app.use(homeRouter);
app.use(loginRouter);
app.use(registerRouter);
app.use(currentUserRouter);
app.use(AllUsersRouter);
app.options("/api/auth/google", cors()); // enable pre-flight
app.use(googleAuthRouter);
app.use(logoutRouter);
app.use("/api/v1/chat", chatHistoryRoute);
app.use("/api/rides",rideRouter);
app.use(refreshTokenRouter); // Add refresh token route
export { httpServer, app };
