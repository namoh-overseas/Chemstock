import express from "express";
const router = express.Router();

import {
    getProducts,
    getProduct,
    getFeaturedProducts,
    getSellerProducts,
    getMoreProducts
} from "../controllers/product.controller.js";
import {
    searchProducts
} from "../controllers/search.controller.js";

router.get("/:search", searchProducts);
router.get("/", getProducts);
router.get("/product/:id", getProduct);
router.get("/featured/products", getFeaturedProducts);
router.get("/seller/:id/:product", getSellerProducts);
router.get("/more/:id", getMoreProducts);

export { router as productRouter };
