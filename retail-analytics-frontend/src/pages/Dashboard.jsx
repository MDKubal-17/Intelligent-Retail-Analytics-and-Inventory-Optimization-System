
import { useEffect, useState } from "react";

import Layout from "../components/Layout";
import DashboardCard from "../components/DashboardCard";
import SalesChart from "../components/SalesChart";
import AIRecommendations from "../components/AIRecommendations";
import InventoryChart from "../components/InventoryChart";
import LowStockAlerts from "../components/LowStockAlerts";


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

    fetch("http://127.0.0.1:5000/api/dashboard")

      .then((response) => {

        if (!response.ok) {
          throw new Error("Failed to fetch dashboard data");
        }

        return response.json();

      })

      .then((data) => {

        console.log("Dashboard from backend:", data);

        setDashboardData({
          totalSales: Number(data.total_sales) || 0,
          products: Number(data.total_products) || 0,
          lowStock: Number(data.low_stock) || 0,
          inventoryValue:
            Number(data.total_inventory_value) || 0,
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
