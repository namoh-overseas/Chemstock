import express from "express";
import { register, login, logout, getFeaturedProducts} from "../controllers/user.controller.js";
import { authMiddleware } from "../middlewares/user.middleware.js";

const userRouter = express.Router();
userRouter.post("/register", register);
userRouter.post("/login", login);
userRouter.post("/logout", authMiddleware, logout);

userRouter.get("/featured/products", getFeaturedProducts);

export { userRouter };