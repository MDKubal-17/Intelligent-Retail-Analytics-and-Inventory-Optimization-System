import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

const data = [
  { category: "Electronics", stock: 180 },
  { category: "Groceries", stock: 250 },
  { category: "Clothing", stock: 120 },
  { category: "Furniture", stock: 80 },
];

function InventoryChart() {
  return (
    <div className="bg-white p-6 rounded-xl shadow-md">
      <h2 className="text-xl font-bold mb-4">
        Inventory by Category
      </h2>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="category" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="stock" fill="#10B981" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default InventoryChart;