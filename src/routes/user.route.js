import express from "express";
import { register, login, logout, getFeaturedProducts, resendOTP, verifyAndAuthenticateUser, passwordReset, authenticateResetLink, enableLoginVerification} from "../controllers/user.controller.js";
import { authMiddleware } from "../middlewares/user.middleware.js";

const userRouter = express.Router();
userRouter.post("/register", register);
userRouter.post("/login", login);
userRouter.post("/logout", authMiddleware, logout);

userRouter.get("/featured/products", getFeaturedProducts);
userRouter.post("/verify", verifyAndAuthenticateUser);
userRouter.post("/resend-otp", resendOTP);
userRouter.post("/password-reset", passwordReset);
userRouter.post("/authenticate-reset-password", authenticateResetLink);
userRouter.post("/enable-login-verification", authMiddleware, enableLoginVerification);

export { userRouter };