import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
  product_id: { type: String, required: true, unique: true, index: true },
  product: { type: String, default: "" },
  category: { type: String, default: "" },
  current_stock: { type: Number, default: 0 },
  reorder_level: { type: Number, default: 0 },
  unit_price: { type: Number, default: 0 },
  inventory_value: { type: Number, default: 0 },
  status: { type: String, default: "In Stock" },
  img_url: { type: String, default: "" },
}, { versionKey: false, strict: false, timestamps: true });

export default mongoose.model("Product", productSchema);
