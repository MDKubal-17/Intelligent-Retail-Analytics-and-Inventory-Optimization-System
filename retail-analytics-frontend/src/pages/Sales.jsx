import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { loadSalesData } from "../utils/loadSalesData";
import SalesKpiCard from "../components/SalesKpiCard";
import RevenueChart from "../components/RevenueChart";
import TopProducts from "../components/TopProducts";
import CategorySales from "../components/CategorySales";

function Sales() {
  const [sales, setSales] = useState([]);

  useEffect(() => {
    loadSalesData()
      .then((data) => {
        setSales(data);
      })
      .catch((error) => {
        console.error("CSV ERROR:", error);
      });
  }, []);

  // Calculate values from CSV
  const totalRevenue = sales.reduce(
    (total, sale) => total + Number(sale.revenue || 0),
    0
  );

  const totalOrders = sales.length;

  const averageOrder =
    totalOrders > 0
      ? totalRevenue / totalOrders
      : 0;

  // Temporary estimated profit
  const totalProfit = totalRevenue * 0.30;

  return (
    <Layout>

      <div className="mb-6">
        <h1 className="text-3xl font-bold">
          Sales Analytics
        </h1>

        <p className="text-gray-500 mt-1">
          Monitor sales performance and revenue trends
        </p>
      </div>

      {/* KPI Cards */}

      <div className="grid grid-cols-4 gap-6">

        <SalesKpiCard
          title="Total Revenue"
          value={`₹${totalRevenue.toLocaleString("en-IN", {
            maximumFractionDigits: 0,
          })}`}
          change="Live CSV"
          color="text-blue-600"
        />

        <SalesKpiCard
          title="Total Orders"
          value={totalOrders.toLocaleString("en-IN")}
          change="Live CSV"
          color="text-green-600"
        />

        <SalesKpiCard
          title="Total Profit"
          value={`₹${totalProfit.toLocaleString("en-IN", {
            maximumFractionDigits: 0,
          })}`}
          change="Estimated"
          color="text-purple-600"
        />

        <SalesKpiCard
          title="Average Order Value"
          value={`₹${averageOrder.toLocaleString("en-IN", {
            maximumFractionDigits: 0,
          })}`}
          change="Calculated"
          color="text-orange-600"
        />

      </div>

      {/* Revenue Chart */}

      <div className="mt-8">
        <div className="mt-8">
          <RevenueChart sales={sales} />
        </div>

        <div className="grid grid-cols-2 gap-6 mt-8">

          <TopProducts sales={sales} />

          <CategorySales sales={sales} />

        </div>
      </div>

    </Layout>
  );
}

export default Sales;