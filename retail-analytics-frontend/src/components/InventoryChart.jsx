import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

import { loadInventoryData } from "../utils/loadInventoryData";

function InventoryChart() {
  const [data, setData] = useState([]);

  useEffect(() => {
    loadInventoryData()
      .then((inventory) => {
        // Group inventory by category
        const categoryStock = {};

        inventory.forEach((item) => {
          const category = item.category;
          const stock = Number(item.current_stock) || 0;

          if (categoryStock[category]) {
            categoryStock[category] += stock;
          } else {
            categoryStock[category] = stock;
          }
        });

        // Convert object into chart data
        const chartData = Object.entries(categoryStock).map(
          ([category, stock]) => ({
            category,
            stock,
          })
        );

        setData(chartData);
      })
      .catch((error) => {
        console.error("Inventory Chart ERROR:", error);
      });
  }, []);

  return (
    <div className="bg-white p-6 rounded-xl shadow-md">

      <h2 className="text-xl font-bold mb-4">
        Inventory by Category
      </h2>

      {data.length === 0 ? (
        <p className="text-gray-500">
          Loading inventory data...
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>

            <CartesianGrid strokeDasharray="3 3" />

            <XAxis dataKey="category" />

            <YAxis />

            <Tooltip />

            <Bar
              dataKey="stock"
              fill="#10B981"
            />

          </BarChart>
        </ResponsiveContainer>
      )}

    </div>
  );
}

export default InventoryChart;