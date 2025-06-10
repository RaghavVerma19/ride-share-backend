import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { verifyJwt } from "../middlewares/auth.middleware.js";
import { Server } from "socket.io";
import http from "http";
import {
  homeRouter,
  loginRouter,
  registerRouter,
  AllUsersRouter,
  currentUserRouter,
  googleAuthRouter,
} from "../routes/allRoutes.js";

const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer);

io.on("connection", (server) => {
  server.emit("hello", "world");
  console.log("websocket server running..");
});
app.set("port", process.env.PORT || 3000);
app.use(
  express.json({
    limit: "16kb",
  })
);

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
app.use("/api", googleAuthRouter);
export { httpServer, app };
