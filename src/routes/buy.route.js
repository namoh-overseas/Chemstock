import express from "express";
import { createBuy, getBuy, updateBuy, filterBuyByStatus, searchBuy} from "../controllers/buy.controller.js";
import { authMiddleware } from "../middlewares/user.middleware.js";

const router = express.Router();

router.post("/:id", createBuy);
router.get("/", authMiddleware, getBuy);
router.put("/:id", authMiddleware, updateBuy);
router.get("/filter", authMiddleware, filterBuyByStatus);
router.get("/:search", authMiddleware, searchBuy);

export { router as buyRouter };