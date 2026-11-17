import mongoose from "mongoose";

const purchaseOrderSchema = new mongoose.Schema({
  order_id: { type: String, required: true, unique: true, index: true },
  created_at: { type: String, default: "" },
  updated_at: { type: String, default: "" },
  supplier_name: { type: String, default: "" },
  supplier_email: { type: String, default: "" },
  supplier_phone: { type: String, default: "" },
  status: { type: String, default: "Draft" },
  items: { type: [mongoose.Schema.Types.Mixed], default: [] },
  total_cost: { type: Number, default: 0 },
  received_at: { type: String, default: "" },
}, { versionKey: false, strict: false, timestamps: true });

export default mongoose.model("PurchaseOrder", purchaseOrderSchema);
