import connectDB from "../db/connect.js";

import { httpServer, app } from "./app.js";
import "./ws/wsServer.js";

connectDB()
  .then(() => {
    httpServer.listen(app.get("port"), "0.0.0.0", () => {
      console.log(`Server running on port : ${app.get("port")}`);
    });
  })
  .catch((error) => {
    console.log("Database connection failed =>", error);
  });
