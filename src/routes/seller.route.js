import express from "express";
import multer from "multer";
import { authMiddleware } from "../middlewares/user.middleware.js";
import {
    getProducts,
    getProductById,
    addProduct,
    updateProduct,
    deleteProduct,
    toggleStatus,
    filterProductsByStatus,
    filterProductsByVisibility,
    searchProducts,
    getAnalytics,
    getVerificationStatus,
    getSellerContact
} from "../controllers/seller.controller.js";
import { addRequest, getRequests, updateRequestStatus, getPublicRequests, getUserRequests, searchPublicRequests, totalRequests } from "../controllers/request.controller.js";

const upload = multer({ storage: multer.memoryStorage()});

const sellerRouter = express.Router();

// Product Routes
sellerRouter.post("/product/add", authMiddleware, upload.single("image"), addProduct);
sellerRouter.put("/product/:id", authMiddleware, upload.single("image"), updateProduct);
sellerRouter.get("/product/:id", authMiddleware, getProductById);
sellerRouter.get("/products", authMiddleware, getProducts);
sellerRouter.delete("/product/:id", authMiddleware, deleteProduct);
sellerRouter.put("/product/:id/status", authMiddleware, toggleStatus);
sellerRouter.get("/products/status", authMiddleware, filterProductsByStatus);
sellerRouter.get("/products/visibility", authMiddleware, filterProductsByVisibility);
sellerRouter.get("/products/search", authMiddleware, searchProducts);

// Request Routes
sellerRouter.post("/request/add", upload.single("image"), addRequest);
sellerRouter.get("/requests", authMiddleware, getRequests);
sellerRouter.put("/request/:id", authMiddleware, updateRequestStatus);
sellerRouter.get("/requests/count", totalRequests);

// Public Request Routes
sellerRouter.get("/public/user/requests", getUserRequests);
sellerRouter.get("/public/requests", getPublicRequests);
sellerRouter.get("/public/requests/search/:search", searchPublicRequests);

// Settings Routes
sellerRouter.get("/contact/:id", getSellerContact);
sellerRouter.get("/analytics", authMiddleware, getAnalytics);
sellerRouter.get("/verification-status", authMiddleware, getVerificationStatus);
export { sellerRouter };