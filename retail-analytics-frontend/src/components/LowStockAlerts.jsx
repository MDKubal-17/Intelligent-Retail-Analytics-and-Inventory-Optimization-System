import { useEffect, useState } from "react";
import { loadInventoryData } from "../utils/loadInventoryData";

function LowStockAlerts() {
  const [allData, setAllData] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [threshold, setThreshold] = useState(10); // User input threshold (default: 10)
  const [loading, setLoading] = useState(true);

  // 1. Fetch CSV data once when component mounts
  useEffect(() => {
    loadInventoryData()
      .then((data) => {
        setAllData(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Inventory CSV ERROR:", error);
        setLoading(false);
      });
  }, []);

  // 2. Filter products based on user threshold OR reorder_level whenever threshold or data changes
  useEffect(() => {
    if (!allData.length) return;

    const lowStockProducts = allData
      .filter((item) => {
        const currentStock = Number(item.current_stock);
        const reorderLevel = Number(item.reorder_level);
        const customThreshold = Number(threshold);

        // Filter if stock is less than or equal to EITHER custom threshold OR CSV reorder level
        return currentStock <= customThreshold || currentStock <= reorderLevel;
      })
      .map((item) => ({
        product: item.product,
        stock: Number(item.current_stock),
        reorderLevel: Number(item.reorder_level),
      }));

    setAlerts(lowStockProducts);
  }, [allData, threshold]);

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      {/* Header with Title and User Input for Threshold */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-3 border-b">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold text-red-600 flex items-center gap-2">
            <span>⚠️</span> Low Stock Alerts
          </h2>
          <span className="text-xs font-semibold bg-red-100 text-red-700 px-2.5 py-1 rounded-full">
            {alerts.length} Items
          </span>
        </div>

        {/* Dynamic Threshold Input Control */}
        <div className="flex items-center gap-2">
          <label htmlFor="threshold" className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Threshold:
          </label>
          <input
            id="threshold"
            type="number"
            min="0"
            value={threshold}
            onChange={(e) => setThreshold(Math.max(0, Number(e.target.value)))}
            className="w-16 border-2 border-gray-200 focus:border-red-500 rounded-lg px-2 py-1 text-sm font-bold text-gray-800 text-center outline-none transition-colors"
          />
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <p className="text-sm text-gray-400 text-center py-4">Loading inventory CSV...</p>
      ) : alerts.length === 0 ? (
        <p className="text-green-600 font-medium py-2">
          ✓ No low stock products below threshold {threshold}
        </p>
      ) : (
        <div className="space-y-3">
          {alerts.map((item, index) => (
            <div
              key={index}
              className="flex justify-between items-center bg-red-50 p-3 rounded-lg border border-red-100"
            >
              <div>
                <span className="font-medium text-gray-800">
                  {item.product}
                </span>
                <p className="text-xs text-gray-500">
                  Reorder level: {item.reorderLevel}
                </p>
              </div>

              <span className="font-bold text-red-600">
                {item.stock} left
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default LowStockAlerts;
