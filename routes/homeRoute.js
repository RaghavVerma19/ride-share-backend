import express from "express";
const homeRouter = express.Router();

homeRouter.get("/", (req, res) => {
  res.redirect("http://localhost:5173");
});

export default homeRouter;
