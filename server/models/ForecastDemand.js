import mongoose from "mongoose";

const forecastDemandSchema = new mongoose.Schema({
  date: { type: String, required: true, index: true },
  product_id: { type: String, required: true, index: true },
  product: { type: String, default: "" },
  category: { type: String, default: "" },
  quantity: { type: Number, default: 0 },
}, { versionKey: false, strict: false, timestamps: true });

export default mongoose.model("ForecastDemand", forecastDemandSchema);
