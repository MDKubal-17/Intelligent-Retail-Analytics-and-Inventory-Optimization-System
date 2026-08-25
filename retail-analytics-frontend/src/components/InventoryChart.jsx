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

function InventoryChart() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("http://127.0.0.1:5000/api/dashboard")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to fetch dashboard data");
        }

        return response.json();
      })
      .then((result) => {
        console.log("Inventory chart data:", result);

        if (Array.isArray(result.inventory_by_category)) {
          setData(result.inventory_by_category);
        } else {
          setData([]);
          setError("Inventory category data not available");
        }
      })
      .catch((err) => {
        console.error("Inventory Chart ERROR:", err);
        setError("Unable to load inventory data");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <div className="bg-white p-6 rounded-xl shadow-md">

      <h2 className="text-xl font-bold mb-4">
        Inventory by Category
      </h2>

      {loading && (
        <p className="text-gray-500">
          Loading inventory data...
        </p>
      )}

      {error && !loading && (
        <p className="text-red-500">
          {error}
        </p>
      )}

      {!loading && !error && data.length > 0 && (
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

      {!loading && !error && data.length === 0 && (
        <p className="text-gray-500">
          No inventory data available.
        </p>
      )}

    </div>
  );
}

export default InventoryChart;
