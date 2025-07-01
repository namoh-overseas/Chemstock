import express from "express";
const router = express.Router();

import { authMiddleware } from "../middlewares/user.middleware.js";
import adminMiddleware from "../middlewares/admin.middleware.js";
import {
    getAllUsers,
    getAllProducts,
    // getUser,
    toggleProductStatus,
    toggleProductVisibility,
    toggleUserStatus,
    deleteUser,
    deleteProduct,
    updateUsdtInrRate,
    toggleFeaturedProduct,
    verifyUser,
    verifyProduct,
    getRequests,
    verifyRequest,
    getRequestUsers,
    assignSeller,
    updateRequest,
    getRequest,
    searchAssigningSellers,
    getProductById,
    updateProduct,
    searchBuy,
    filterBuyByStatus,
    getBuy,
    getAnalytics,
} from "../controllers/admin.controller.js";

import { updateSettings, getUsdInrRate } from "../controllers/settings.controller.js";

// User Routes
router.get("/users", authMiddleware, adminMiddleware, getAllUsers);
router.put("/user/:id", authMiddleware, adminMiddleware, toggleUserStatus);
// router.get("/user/:id", authMiddleware, adminMiddleware, getUser);
router.put("/user/:id/verify", authMiddleware, adminMiddleware, verifyUser);
router.delete("/user/:id/delete", authMiddleware, adminMiddleware, deleteUser);
router.get("/user/search/:search", authMiddleware, adminMiddleware, searchAssigningSellers);

// Product Routes
router.get("/products", authMiddleware, adminMiddleware, getAllProducts);
router.put("/product/:id", authMiddleware, adminMiddleware, toggleProductStatus);
router.put("/product/:id/visibility", authMiddleware, adminMiddleware, toggleProductVisibility);
router.delete("/product/:id/delete", authMiddleware, adminMiddleware, deleteProduct);
router.put("/product/:id/featured", authMiddleware, adminMiddleware, toggleFeaturedProduct);
router.put("/product/:id/verify", authMiddleware, adminMiddleware, verifyProduct);
router.put("/usdt_inr_rate", authMiddleware, adminMiddleware, updateUsdtInrRate);
router.get("/product/:id/get", authMiddleware, adminMiddleware, getProductById);
router.put("/product/:id/update", authMiddleware, adminMiddleware, updateProduct);

// Request Routes
router.get("/requests", authMiddleware, adminMiddleware, getRequests);
router.put("/request/:id/verify", authMiddleware, adminMiddleware, verifyRequest);
router.get("/request/users", authMiddleware, adminMiddleware, getRequestUsers);
router.put("/request/:requestId/assign/:userId", authMiddleware, adminMiddleware, assignSeller);
router.put("/request/:id/update", authMiddleware, adminMiddleware, updateRequest);
router.get("/request/:id", authMiddleware, adminMiddleware, getRequest);

// Order Routes
router.get("/orders", authMiddleware, adminMiddleware, getBuy);
router.get("/orders/search/:search", authMiddleware, adminMiddleware, searchBuy);
router.get("/orders/filter/:status", authMiddleware, adminMiddleware, filterBuyByStatus);

// Settings Routes
router.put("/settings", authMiddleware, adminMiddleware, updateSettings);
router.get("/settings", authMiddleware, adminMiddleware, getUsdInrRate);

// Analytics Routes
router.get("/analytics", authMiddleware, adminMiddleware, getAnalytics);

export { router as adminRouter };
