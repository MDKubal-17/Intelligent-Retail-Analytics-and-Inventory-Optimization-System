
import mongoose from "mongoose";

const saleSchema = new mongoose.Schema({
  date: { type: String, required: true },
  product_id: { type: String, required: true, index: true },
  product: { type: String, default: "" },
  category: { type: String, default: "" },
  quantity: { type: Number, default: 0 },
  unit_price: { type: Number, default: 0 },
  discount_percent: { type: Number, default: 0 },
  revenue: { type: Number, default: 0 },
  transaction_id: { type: String, required: true, index: true },

  type: { type: String, default: "Sell" },
  status: { type: String, default: "Completed" }

}, {
  versionKey: false,
  strict: false,
  timestamps: true
});

export default mongoose.model("Sale", saleSchema);
