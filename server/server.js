import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";

import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import reportRoutes from "./routes/reports.js";
import inventoryRoutes from './routes/inventoryRoutes.js';
import dashboardRoutes from "./routes/dashboardRoutes.js";
import productRoutes from "./routes/productRoutes.js";
// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

// Create Express app
const app = express();

// Middleware
app.use(cors());          // Allows React frontend to communicate with backend
app.use(express.json());  // Parses JSON request body

// Routes
app.use("/api/auth", authRoutes);

// Mount report routes (/api/reports/government-audit)
app.use("/api/reports", reportRoutes);

// Mount blockchain inventory & transaction routes
app.use("/api/inventory", inventoryRoutes);

app.use("/api/dashboard", dashboardRoutes);
app.use("/api/products", productRoutes);
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
