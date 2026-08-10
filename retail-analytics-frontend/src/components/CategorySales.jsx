import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

function CategorySales({ sales }) {
  const categorySales = {};

  sales.forEach((sale) => {
    const category = sale.category;

    if (!categorySales[category]) {
      categorySales[category] = 0;
    }

    categorySales[category] += Number(sale.revenue || 0);
  });

  const chartData = Object.entries(categorySales).map(
    ([category, revenue]) => ({
      category,
      revenue: Math.round(revenue),
    })
  );

  return (
    <div className="bg-white rounded-xl shadow-md p-6">

      <h2 className="text-xl font-bold mb-5">
        Sales by Category
      </h2>

      <ResponsiveContainer width="100%" height={320}>
        <PieChart>

          <Pie
            data={chartData}
            dataKey="revenue"
            nameKey="category"
            cx="50%"
            cy="50%"
            outerRadius={100}
            label
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} />
            ))}
          </Pie>

          <Tooltip
            formatter={(value) =>
              `₹${Number(value).toLocaleString("en-IN")}`
            }
          />

          <Legend />

        </PieChart>
      </ResponsiveContainer>

    </div>
  );
}

export default CategorySales;