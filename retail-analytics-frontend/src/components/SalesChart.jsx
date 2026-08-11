import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import { loadSalesData } from "../utils/loadSalesData";

function SalesChart() {
  const [data, setData] = useState([]);

  useEffect(() => {
    loadSalesData()
      .then((sales) => {
        console.log("SALES CHART DATA:", sales);

        const monthlySales = {};

        sales.forEach((item) => {
          // Use the date from your sales data
          const date =
            item.date ||
            item.sale_date ||
            item.sales_date ||
            item.order_date;

          const revenue = Number(
            item.revenue ||
            item.sales ||
            item.total_sales ||
            item.amount ||
            0
          );

          if (!date) return;

          const month = new Date(date).toLocaleString("en-IN", {
            month: "short",
          });

          if (monthlySales[month]) {
            monthlySales[month] += revenue;
          } else {
            monthlySales[month] = revenue;
          }
        });

        const chartData = Object.entries(monthlySales).map(
          ([month, sales]) => ({
            month,
            sales,
          })
        );

        setData(chartData);
      })
      .catch((error) => {
        console.error("Sales Chart ERROR:", error);
      });
  }, []);

  return (
    <div className="bg-white p-6 rounded-xl shadow-md mt-8">

      <h2 className="text-xl font-bold mb-4">
        Monthly Sales Trend
      </h2>

      {data.length === 0 ? (
        <p className="text-gray-500">
          Loading sales data...
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>

            <CartesianGrid strokeDasharray="3 3" />

            <XAxis dataKey="month" />

            <YAxis />

            <Tooltip
              formatter={(value) =>
                `₹${Number(value).toLocaleString("en-IN")}`
              }
            />

            <Line
              type="monotone"
              dataKey="sales"
              stroke="#2563EB"
              strokeWidth={3}
            />

          </LineChart>
        </ResponsiveContainer>
      )}

    </div>
  );
}

export default SalesChart;
