import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import interviewRoute from "./routes/interview.js";

dotenv.config();

console.log("Loaded API Key:", process.env.OPENAI_API_KEY ? "FOUND" : "NOT FOUND");


const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/interview", interviewRoute);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
