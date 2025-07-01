//server.js
import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser";
import { userRouter } from "./routes/user.route.js";
import { adminRouter } from "./routes/admin.route.js";
import { productRouter } from "./routes/product.route.js";
import { ratingRouter } from "./routes/rating.route.js";
import { sellerRouter } from "./routes/seller.route.js";
import { buyRouter } from "./routes/buy.route.js";
import dotenv from "dotenv";
dotenv.config();

const server = express();

// MIDDLEWARES
server.use(cors({ origin: process.env.FRONTEND_URL || "", credentials: true }));
server.use(cookieParser());
server.use(express.json({limit: "100kb"}));
server.use(express.urlencoded({ extended: true, limit: "100kb" }));

// ROUTING
server.use("/api/v1/user/", userRouter);
server.use("/api/v1/admin/", adminRouter);
server.use("/api/v1/product/", productRouter);
server.use("/api/v1/rating/", ratingRouter);
server.use("/api/v1/seller/", sellerRouter);
server.use("/api/v1/buy/", buyRouter);

export { server };