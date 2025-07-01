import { server } from "./server.js";
import dotenv from "dotenv";
import connectDB from "./db/dbConfig.js";

dotenv.config({
    path: "./.env"
})

const port = process.env.PORT || 8080;

connectDB()
    .then(() => {
    server.listen(port, () => {
        console.log(`Server listening on port ${port}`);
    });
    })
    .catch((err) => {
    console.log("Connection Error ", err);
});

server.get("/api/test", (req, res) => {
    res.send("Server Running on PORT " + port || "8080");
})