import mongoose from "mongoose";

const buySchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product"
    },
    buyerName: {
        type: String,
        required: true
    },
    buyerContact: {
        type: String,
        required: true
    },
    contactMethod: {
        type: String,
        enum: ["phone", "email", "whatsapp"],
        default: "whatsapp",
        required: true
    },
    seller: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    note: {
        type: String,
        default: "",
        required: false
    },
    sellerName: {
        type: String,
        required: true
    },
    sellerContact: {
        type: String,
        required: true
    },
    quantity: {
        type: Number,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    currency: {
        enum: ["INR", "USD"],
        default: "INR",
        type: String,
        required: true,
    },
    totalAmount: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ["pending", "completed", "cancelled"],
        default: "pending"
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
})

const Buy = mongoose.model("Buy", buySchema);

export { Buy };

