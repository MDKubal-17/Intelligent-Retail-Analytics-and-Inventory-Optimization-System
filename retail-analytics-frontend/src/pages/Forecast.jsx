import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { loadSalesData } from "../utils/loadSalesData";

function Forecast() {
  const [sales, setSales] = useState([]);
  const [forecast, setForecast] = useState(0);

  useEffect(() => {
    loadSalesData()
      .then((data) => {
        setSales(data);

        if (data.length === 0) return;

        const totalSales = data.reduce(
          (total, item) =>
            total +
            Number(
              item.quantity ||
              item.units_sold ||
              item.sales_quantity ||
              0
            ),
          0
        );

        const averageDemand = totalSales / data.length;

        // Simple initial forecast
        setForecast(Math.round(averageDemand));
      })
      .catch((error) => {
        console.error("Forecast ERROR:", error);
      });
  }, []);

  return (
    <Layout>
      <div>

        <h1 className="text-3xl font-bold mb-2">
          Demand Forecasting
        </h1>

        <p className="text-gray-500 mb-8">
          Analyze historical sales and estimate future product demand.
        </p>

        {/* Forecast KPI */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">

          <p className="text-gray-500">
            Estimated Average Demand
          </p>

          <h2 className="text-4xl font-bold text-blue-600 mt-2">
            {forecast}
          </h2>

          <p className="text-sm text-gray-500 mt-2">
            units per sales record
          </p>

        </div>

        {/* Method */}
        <div className="bg-white rounded-xl shadow-md p-6">

          <h2 className="text-xl font-bold mb-4">
            Forecasting Method
          </h2>

          <p className="text-gray-600">
            The current prototype calculates average historical
            demand from the sales dataset. This will later be
            replaced by a machine-learning forecasting model.
          </p>

          <div className="mt-5 p-4 bg-blue-50 rounded-lg">

            <p className="font-medium">
              Historical Records
            </p>

            <p className="text-2xl font-bold text-blue-600">
              {sales.length}
            </p>

          </div>

        </div>

      </div>
    </Layout>
  );
}

export default Forecast;
