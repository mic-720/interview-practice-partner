import express from "express";
import { handleInterview } from "../controllers/interviewController.js";

const router = express.Router();

// main chat endpoint
router.post("/", handleInterview);

export default router;
