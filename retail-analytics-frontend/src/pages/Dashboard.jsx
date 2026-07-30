import Layout from "../components/Layout";
import DashboardCard from "../components/DashboardCard";
import SalesChart from "../components/SalesChart";
import AIRecommendations from "../components/AIRecommendations";

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
            value="$8,240"
            color="text-blue-600"
          />

          <DashboardCard
            title="Products"
            value="1,245"
            color="text-green-600"
          />

          <DashboardCard
            title="Low Stock"
            value="18"
            color="text-red-600"
          />

          <DashboardCard
            title="Forecast Accuracy"
            value="96%"
            color="text-purple-600"
          />
        </div>
        <SalesChart />
        <AIRecommendations />
      </div>
    </Layout>
  );
}

export default Dashboard;