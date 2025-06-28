import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import http from "http";
import {
  homeRouter,
  loginRouter,
  registerRouter,
  AllUsersRouter,
  currentUserRouter,
  googleAuthRouter,
  logoutRouter,
  chatHistoryRoute,
} from "../routes/allRoutes.js";

const app = express();
const httpServer = http.createServer(app);
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
app.use(googleAuthRouter);
app.use(logoutRouter);
app.use("/api/v1/chat", chatHistoryRoute);
export { httpServer, app };
