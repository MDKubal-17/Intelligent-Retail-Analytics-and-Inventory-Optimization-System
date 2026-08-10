import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

function RevenueChart({ sales }) {
  // Group revenue by month
  const monthlyRevenue = {};

  sales.forEach((sale) => {
    const date = new Date(sale.date);

    const month = date.toLocaleString("en-IN", {
      month: "short",
    });

    if (!monthlyRevenue[month]) {
      monthlyRevenue[month] = 0;
    }

    monthlyRevenue[month] += Number(sale.revenue || 0);
  });

  const chartData = Object.entries(monthlyRevenue).map(
    ([month, revenue]) => ({
      month,
      revenue: Math.round(revenue),
    })
  );

  return (
    <div className="bg-white rounded-xl shadow-md p-6">

      <h2 className="text-xl font-bold mb-5">
        Revenue Trend
      </h2>

      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={chartData}>

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
            dataKey="revenue"
            stroke="#2563EB"
            strokeWidth={3}
          />

        </LineChart>
      </ResponsiveContainer>

    </div>
  );
}

export default RevenueChart;