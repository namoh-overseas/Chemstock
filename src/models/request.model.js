import mongoose from "mongoose";

const requestSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    seller: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: false,
        default: null
    },
    
    contactMethod: {
        type: String,
        enum: ["phone", "email", "whatsapp"],
        default: "whatsapp",
        required: true
    },
    contact: {
        type: String,
        required: true
    },
    countryCode: {
        type: String,
        required: false
    },
    ci: {
        type: String,
        required: false
    },
    tone: {
        type: String,
        required: false
    },
    quantity: {
        type: Number,
        required: true
    },
    stockUnit: {
        type: String,
        enum: ["kg", "grm", "mg", "ml", "ltr", "pcs", "mts"],
        default: "kg",
        required: true,
    },
    note: {
        type: String,
        default: "",
        required: false
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
    },
    image: {
        type: String,
        required: false
    },
    isVerified: {
        type: Boolean,
        default: false
    }
})

const Request = mongoose.model("Request", requestSchema);

export { Request };
