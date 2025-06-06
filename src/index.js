import connectDB from "../db/connect.js";
import dotenv from "dotenv";
import { httpServer, app } from "./app.js";

dotenv.config({
  path: "./.env",
});
connectDB()
  .then(() => {
    httpServer.listen(app.get("port"),"0.0.0.0", () => {
      console.log(`Server running on port : ${app.get("port")}`);
    });
  })
  .catch((error) => {
    console.log("Database connection failed =>", error);
  });
