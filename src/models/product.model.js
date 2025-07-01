import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: false,
    },
    price: {
        type: Number,
        required: true,
    },
    ci:{
        type: String,
        required: true,
    },
    tone:{
        type: String,
        required: true,
    },
    isFeatured:{
        type: Boolean,
        default: false,
        required: false,
    },
    currency: {
        enum: ["INR", "USD"],
        default: "INR",
        type: String,
        required: true,
    },
    stock: {
        type: Number,
        required: true,
    },
    stockUnit: {
        type: String,
        enum: ["kg", "grm", "mg", "ml", "ltr", "pcs", "mts"],
        default: "pcs",
        required: true,
    },
    sales: {
        type: Number,
        default: 0,
        required: false,
    },
    isVerified:{
        type: Boolean,
        default: false,
        required: false,
    },
    isVisible:{
        type: Boolean,
        default: true,
        required: false,
    },
    image: {
        type: String,
        required: false,
        default: "/assets/images/default-product.png",
    },
    seller: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    status: {
        type: String,
        enum: ["active", "inactive"],
        default: "active",
        required: false,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
})

const Product = mongoose.model("Product", productSchema);

export { Product };
