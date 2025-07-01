import { Product } from "../models/product.model.js";
import { Settings } from "../models/settings.model.js";
import mongoose from "mongoose";

export const searchProducts = async (req, res) => {
    try {
        const settings = await Settings.findOne({}, { usdToInrRate: 1 }).lean();
        if (!settings) {
            return res.status(404).json({ message: "Settings not found" });
        }
        const { page = 1, limit = 25 } = req.query;
        const skip = (page - 1) * limit;
        const { search } = req.params;
        if (!search) {
            return res.status(400).json({ message: "Search parameter is required" });
        }
        if (search.length < 3) {
            return res.status(400).json({ message: "Search parameter must be at least 3 characters long" });
        }
        const searchRegex = new RegExp(search, "i");
        const products = await Product.find({
            $or: [
                { name: searchRegex },
                { description: searchRegex },
                { ci: searchRegex },
                { tone: searchRegex },
                ...(mongoose.Types.ObjectId.isValid(search) ? [{ _id: new mongoose.Types.ObjectId(search) }] : [])
            ],
            isVisible: true,
            status: "active"
        },{
            name: 1,
            description: 1,
            ci: 1,
            tone: 1,
            image: 1,
            price: 1,
            currency: 1,
            stock: 1,
            stockUnit: 1,
            isVisible: 1,
            status: 1,
        }).skip(skip).limit(limit).lean();
        const totalProducts = await Product.countDocuments({
            $or: [
                { name: searchRegex },
                { description: searchRegex },
                { ci: searchRegex },
                { tone: searchRegex },
                ...(mongoose.Types.ObjectId.isValid(search) ? [{ _id: new mongoose.Types.ObjectId(search) }] : [])
            ],
            isVisible: true,
            status: "active"
        });
        const totalPages = Math.ceil(totalProducts / limit);
        res.status(200).json({
            message: "Products found for the search: " + search,
            products,
            usdToInrRate: settings?.usdToInrRate || null,
            totalProducts,
            totalPages,
            page,
            limit,
            count: products.length,
        });
    } catch (error) {
        console.error("Error in searchProducts:", error);
        res.status(500).json({ message: "Something went wrong while searching products" });
    }
}