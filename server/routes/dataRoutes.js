import express from "express";
import Product from "../models/Product.js";
import Sale from "../models/Sale.js";
import InventoryEvent from "../models/InventoryEvent.js";
import PurchaseOrder from "../models/PurchaseOrder.js";
import ForecastDemand from "../models/ForecastDemand.js";

const router = express.Router();

const collections = {
  inventory: Product,
  sales: Sale,
  transactions: InventoryEvent,
  "purchase-orders": PurchaseOrder,
  "forecast-history": ForecastDemand,
};

function cleanDocument(document) {
  const value = document.toObject ? document.toObject() : document;
  delete value._id;
  delete value.__v;
  return value;
}

router.get("/:collection", async (req, res) => {
  try {
    const Model = collections[req.params.collection];
    if (!Model) return res.status(404).json({ error: "Unknown data collection" });
    const documents = await Model.find({}).sort({ createdAt: 1, _id: 1 }).lean();
    res.json(documents.map(({ _id, __v, ...item }) => item));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Replace a collection after validating the complete payload. Used by existing
// Flask operations that already update a full in-memory list.
router.put("/:collection", async (req, res) => {
  try {
    const Model = collections[req.params.collection];
    if (!Model) return res.status(404).json({ error: "Unknown data collection" });
    if (!Array.isArray(req.body)) return res.status(400).json({ error: "Expected an array" });

    const key = {
      inventory: "product_id",
      sales: "transaction_id",
      transactions: "transaction_id",
      "purchase-orders": "order_id",
      "forecast-history": null,
    }[req.params.collection];

    if (req.params.collection === "sales") {
      // Sales may contain multiple products under one transaction ID.
      await Model.deleteMany({});
      if (req.body.length) await Model.insertMany(req.body, { ordered: true });
    } else if (req.params.collection === "forecast-history") {
      for (const item of req.body) {
        if (!item?.date || item?.product_id === undefined || !Number.isFinite(Number(item?.quantity))) {
          return res.status(400).json({ error: "Each forecast-history row needs date, product_id and numeric quantity" });
        }
      }
      await Model.deleteMany({});
      if (req.body.length) await Model.insertMany(req.body, { ordered: true });
    } else {
      const seen = new Set();
      for (const item of req.body) {
        const id = String(item?.[key] ?? "").trim();
        if (!id) return res.status(400).json({ error: `${key} is required on every record` });
        if (seen.has(id)) return res.status(400).json({ error: `Duplicate ${key}: ${id}` });
        seen.add(id);
      }
      await Model.deleteMany({});
      if (req.body.length) await Model.insertMany(req.body, { ordered: true });
    }

    res.json({ success: true, count: req.body.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/:collection", async (req, res) => {
  try {
    const Model = collections[req.params.collection];
    if (!Model) return res.status(404).json({ error: "Unknown data collection" });
    const document = await Model.create(req.body || {});
    res.status(201).json(cleanDocument(document));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
