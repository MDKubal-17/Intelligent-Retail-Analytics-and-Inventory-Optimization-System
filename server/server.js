import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";

import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import reportRoutes from "./routes/reports.js";

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

// Create Express app
const app = express();

// Middleware
app.use(cors());          // Allows React frontend to communicate with backend
app.use(express.json());  // Parses JSON request body

// 🛑 Prevent Browser Snapshot Caching (Bfcache Protection)
app.use((req, res, next) => {
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");
    next();
});

// Routes
app.use("/api/auth", authRoutes);

// Mount report routes (/api/reports/government-audit)
app.use("/api/reports", reportRoutes);

// Test Route
app.get("/", (req, res) => {
    res.send("API is running...");
});

// 404 Handler for Unhandled Routes
app.use((req, res, next) => {
    res.status(404).json({ message: `Route ${req.originalUrl} not found` });
});

// Global Error Handling Middleware
app.use((err, req, res, next) => {
    console.error("Global Server Error:", err.stack);
    res.status(500).json({ message: "Internal Server Error", error: err.message });
});

// Start Server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
