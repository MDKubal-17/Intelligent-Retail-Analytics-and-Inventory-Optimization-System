
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import reportRoutes from "./routes/reports.js";
import inventoryRoutes from "./routes/inventoryRoutes.js";
import transactionRoutes from "./routes/TransactionRoutes.js";

dotenv.config();
// Connect to MongoDB
connectDB();
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/reports", reportRoutes);
// Existing inventory routes
app.use("/api/inventory", inventoryRoutes);
app.use("/api/inventory/transactions", transactionRoutes);

// Test route
app.get("/", (req, res) => {
  res.send("API is running...");
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    message: `Route ${req.originalUrl} not found`,
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Global Server Error:", err.stack);

  res.status(500).json({
    message: "Internal Server Error",
    error: err.message,
  });
});

// Start server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
