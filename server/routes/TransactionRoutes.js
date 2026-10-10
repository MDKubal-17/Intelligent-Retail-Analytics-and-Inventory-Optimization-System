
import express from "express";
import Transaction from "../models/Transaction.js";
// D:\Final_year_project\server\models\Transaction.js
import {
  addTransaction,
  verifyBlockchain,
} from "../blockchain.js";

const router = express.Router();
// GET /api/inventory/transactions
router.get("/", async (req, res) => {
  try {
    const transactions = await Transaction.find()
      .sort({ blockIndex: -1 })
      .lean();

    return res.json({
      success: true,
      data: transactions,
    });
  } catch (error) {
    console.error("Transaction fetch error:", error);

    return res.status(500).json({
      success: false,
      error: "Failed to fetch transactions.",
    });
  }
});

// GET /api/inventory/transactions/verify
router.get("/verify", async (req, res) => {
  try {
    const result = await verifyBlockchain();

    return res.status(result.valid ? 200 : 409).json(result);
  } catch (error) {
    console.error("Blockchain verification error:", error);

    return res.status(500).json({
      valid: false,
      message: "Could not verify the blockchain.",
    });
  }
});

// POST /api/inventory/transactions
router.post("/", async (req, res) => {
  try {
    const {
      productId,
      productName,
      quantityDelta,
      reason,
      updatedBy,
    } = req.body;

    const transaction = await addTransaction({
      productId,
      productName,
      quantityDelta,
      reason,
      updatedBy,
    });

    return res.status(201).json({
      success: true,
      message: "Blockchain transaction created successfully.",
      data: transaction,
    });
  } catch (error) {
    console.error("Transaction creation error:", error);

    return res.status(400).json({
      success: false,
      error: error.message || "Failed to create transaction.",
    });
  }
});

export default router;
