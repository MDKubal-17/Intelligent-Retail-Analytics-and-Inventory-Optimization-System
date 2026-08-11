import { useEffect, useState } from "react";
import { loadInventoryData } from "../utils/loadInventoryData";

function LowStockAlerts() {
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    loadInventoryData()
      .then((data) => {
        const lowStockProducts = data
          .filter(
            (item) =>
              Number(item.current_stock) <=
              Number(item.reorder_level)
          )
          .map((item) => ({
            product: item.product,
            stock: Number(item.current_stock),
            reorderLevel: Number(item.reorder_level),
          }));

        setAlerts(lowStockProducts);
      })
      .catch((error) => {
        console.error("Inventory CSV ERROR:", error);
      });
  }, []);

  return (
    <div className="bg-white rounded-xl shadow-md p-6">

      <h2 className="text-xl font-bold mb-4 text-red-600">
        Low Stock Alerts
      </h2>

      {alerts.length === 0 ? (
        <p className="text-green-600">
          ✓ No low stock products
        </p>
      ) : (
        <div className="space-y-3">

          {alerts.map((item, index) => (
            <div
              key={index}
              className="flex justify-between items-center bg-red-50 p-3 rounded-lg"
            >
              <div>
                <span className="font-medium">
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