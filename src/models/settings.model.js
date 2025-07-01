import mongoose from "mongoose";

const settingsSchema = new mongoose.Schema({
    usdToInrRate:{
        type: Number,
        default: 85,
        required: true,
    },
})

const Settings = mongoose.model("Settings", settingsSchema);

export { Settings };
