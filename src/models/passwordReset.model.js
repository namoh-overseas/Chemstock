import mongoose, { Schema } from "mongoose";
const passwordResetSchema = new Schema({
    id: {
        type: Schema.Types.ObjectId,
        ref: "user"
    },
    resetSecret: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 60*10
    }
})

const OTPSchema = new Schema({
    email: {
        type: String,
        required: true,
        ref: "UserSchema"
    },
    OTP: {
        type: String,
        required: true
    },
    retries: {
        type: Number,
        default: 0
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 600
    }
})

const OTP = mongoose.model("OTP", OTPSchema);
const resetPassword = mongoose.model("resetPassword", passwordResetSchema);
export { OTP, resetPassword };