import { useEffect, useState } from "react";

import Layout from "../components/Layout";
import DashboardCard from "../components/DashboardCard";
import SalesChart from "../components/SalesChart";
import AIRecommendations from "../components/AIRecommendations";
import InventoryChart from "../components/InventoryChart";
import LowStockAlerts from "../components/LowStockAlerts";

// Replaced FLASK_API_URL with unified Express API base URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://retail-analytics-backend-md.onrender.com';

function Dashboard() {

  const [dashboardData, setDashboardData] = useState({
    totalSales: 0,
    products: 0,
    lowStock: 0,
    inventoryValue: 0,
  });

  const [loading, setLoading] = useState(true);

  // ==========================================
  // LOAD DASHBOARD DATA FROM BACKEND
  // ==========================================

  useEffect(() => {

    fetch(`${API_BASE_URL}/api/dashboard`)

      .then((response) => {

        if (!response.ok) {
          throw new Error("Failed to fetch dashboard data");
        }

        return response.json();

      })

      .then((data) => {

        console.log("Dashboard from backend:", data);

        // Handles both direct `{ total_sales: ... }` and nested `{ data: { total_sales: ... } }`
        const payload = data.data || data;

        setDashboardData({
          totalSales: Number(payload.total_sales || payload.totalSales) || 0,
          products: Number(payload.total_products || payload.totalProducts) || 0,
          lowStock: Number(payload.low_stock || payload.lowStock) || 0,
          inventoryValue:
            Number(payload.total_inventory_value || payload.totalInventoryValue) || 0,
        });

        setLoading(false);

      })

      .catch((error) => {

        console.error(
          "DASHBOARD BACKEND ERROR:",
          error
        );

        setLoading(false);

      });

  }, []);

  // ==========================================
  // FORMAT RUPEES
  // ==========================================

  const formatRupees = (value) => {

    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(value);

  };

  return (

    <Layout>

      <div>

        <h1 className="text-3xl font-bold mb-6">
          Dashboard
        </h1>

        {/* ==============================
            KPI CARDS
        ============================== */}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

          <DashboardCard
            title="Total Sales"
            value={
              loading
                ? "Loading..."
                : formatRupees(
                    dashboardData.totalSales
                  )
            }
            color="text-blue-600"
          />

          <DashboardCard
            title="Products"
            value={
              loading
                ? "Loading..."
                : dashboardData.products
            }
            color="text-green-600"
          />

          <DashboardCard
            title="Low Stock"
            value={
              loading
                ? "Loading..."
                : dashboardData.lowStock
            }
            color="text-red-600"
          />

          <DashboardCard
            title="Inventory Value"
            value={
              loading
                ? "Loading..."
                : formatRupees(
                    dashboardData.inventoryValue
                  )
            }
            color="text-purple-600"
          />

        </div>

        {/* ==============================
            SALES CHART
        ============================== */}

        <SalesChart />

        {/* ==============================
            AI RECOMMENDATIONS
        ============================== */}

        <AIRecommendations />

        {/* ==============================
            INVENTORY + LOW STOCK
        ============================== */}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">

          <InventoryChart />

          <LowStockAlerts />

        </div>

      </div>

    </Layout>

  );
}

export default Dashboard;
