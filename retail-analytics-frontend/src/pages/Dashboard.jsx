import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import DashboardCard from "../components/DashboardCard";
import SalesChart from "../components/SalesChart";
import AIRecommendations from "../components/AIRecommendations";
import InventoryChart from "../components/InventoryChart";
import LowStockAlerts from "../components/LowStockAlerts";

import { loadSalesData } from "../utils/loadSalesData";
import { loadInventoryData } from "../utils/loadInventoryData";

function Dashboard() {
  const [sales, setSales] = useState([]);
  const [inventory, setInventory] = useState([]);

  useEffect(() => {
    // Load sales CSV
    loadSalesData()
      .then((data) => {
        setSales(data);
      })
      .catch((error) => {
        console.error("Sales CSV ERROR:", error);
      });

    // Load inventory CSV
    loadInventoryData()
      .then((data) => {
        setInventory(data);
      })
      .catch((error) => {
        console.error("Inventory CSV ERROR:", error);
      });
  }, []);

  // -------------------------
  // Dashboard Calculations
  // -------------------------

  const totalRevenue = sales.reduce(
    (total, sale) => total + Number(sale.revenue || 0),
    0
  );

  const totalProducts = inventory.length;

  const lowStock = inventory.filter(
    (item) =>
      Number(item.current_stock) <=
      Number(item.reorder_level)
  ).length;

  const totalStock = inventory.reduce(
    (total, item) =>
      total + Number(item.current_stock || 0),
    0
  );

  return (
    <Layout>
      <div>

        <h1 className="text-3xl font-bold mb-6">
          Dashboard
        </h1>

        {/* KPI Cards */}
        <div className="grid grid-cols-4 gap-6">

          <DashboardCard
            title="Total Revenue"
            value={`₹${totalRevenue.toLocaleString("en-IN", {
              maximumFractionDigits: 0,
            })}`}
            color="text-blue-600"
          />

          <DashboardCard
            title="Products"
            value={totalProducts}
            color="text-green-600"
          />

          <DashboardCard
            title="Low Stock"
            value={lowStock}
            color="text-red-600"
          />

          <DashboardCard
            title="Total Stock Units"
            value={totalStock.toLocaleString("en-IN")}
            color="text-purple-600"
          />

        </div>

        {/* Sales */}
        <SalesChart />

        {/* AI Recommendations */}
        <AIRecommendations />

        {/* Inventory */}
        <div className="grid grid-cols-2 gap-6 mt-8">

          <InventoryChart />

          <LowStockAlerts />

        </div>

      </div>
    </Layout>
  );
}

export default Dashboard;