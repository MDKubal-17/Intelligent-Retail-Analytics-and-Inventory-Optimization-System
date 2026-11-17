import mongoose from "mongoose";

const inventoryEventSchema = new mongoose.Schema({
  transaction_id: { type: String, required: true, unique: true },
  date: { type: String, default: "" },
  product_id: { type: String, required: true, index: true },
  product: { type: String, default: "" },
  action: { type: String, default: "" },
  quantity: { type: Number, default: 0 },
  quantity_change: { type: Number, default: 0 },
  reason: { type: String, default: "" },
}, { versionKey: false, strict: false, timestamps: true });

export default mongoose.model("InventoryEvent", inventoryEventSchema);
