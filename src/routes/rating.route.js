import express from "express";
const router = express.Router();
import { addRating } from "../controllers/rating.controller.js";

router.post("/add", addRating);

export { router as ratingRouter };
