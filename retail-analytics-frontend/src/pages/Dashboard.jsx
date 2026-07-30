import Layout from "../components/Layout";
import DashboardCard from "../components/DashboardCard";
import SalesChart from "../components/SalesChart";
import AIRecommendations from "../components/AIRecommendations";
import InventoryChart from "../components/InventoryChart";
import LowStockAlerts from "../components/LowStockAlerts";

<NavLink
  to="/dashboard"
  className={({ isActive }) =>
    `flex items-center gap-3 px-6 py-3 ${
      isActive
        ? "bg-blue-600 text-white"
        : "hover:bg-slate-700"
    }`
  }
>
  <FaTachometerAlt />
  Dashboard
</NavLink>

const dashboardData = {
  sales: "₹8,240",
  products: 1245,
  lowStock: 18,
  accuracy: "96%",
};

function Dashboard() {
  return (
    <Layout>
      <div>
        <h1 className="text-3xl font-bold mb-6">
          Dashboard
        </h1>

        <div className="grid grid-cols-4 gap-6">
          <DashboardCard
            title="Today's Sales"
            value={dashboardData.sales}
            color="text-blue-600"
          />

          <DashboardCard
            title="Products"
            value={dashboardData.products}
            color="text-green-600"
          />

          <DashboardCard
            title="Low Stock"
            value={dashboardData.lowStock}
            color="text-red-600"
          />

          <DashboardCard
            title="Forecast Accuracy"
            value={dashboardData.accuracy}
            color="text-purple-600"
          />
        </div>
        <SalesChart />
        <AIRecommendations />

        <div className="grid grid-cols-2 gap-6 mt-8">
            <InventoryChart />
            <LowStockAlerts />
        </div>
      </div>
    </Layout>
  );
}

export default Dashboard;