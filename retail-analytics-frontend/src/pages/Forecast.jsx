import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { loadSalesData } from "../utils/loadSalesData";

function Forecast() {
  const [forecastData, setForecastData] = useState([]);

  useEffect(() => {
    loadSalesData()
      .then((data) => {
        const productSales = {};

        data.forEach((item) => {
          const product =
            item.product ||
            item.product_name ||
            item.name;

          const quantity = Number(
            item.quantity ||
            item.units_sold ||
            item.sales_quantity ||
            0
          );

          if (!product) return;

          if (!productSales[product]) {
            productSales[product] = {
              product,
              totalSales: 0,
              records: 0,
            };
          }

          productSales[product].totalSales += quantity;
          productSales[product].records += 1;
        });

        const results = Object.values(productSales).map((item) => {
          const averageDemand =
            item.totalSales / item.records;

          return {
            ...item,
            averageDemand: Math.round(averageDemand),
            forecast: Math.round(averageDemand),
          };
        });

        setForecastData(results);
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
          Product-wise demand analysis based on historical sales.
        </p>

        {/* Summary */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">

          <p className="text-gray-500">
            Products Analyzed
          </p>

          <h2 className="text-4xl font-bold text-blue-600 mt-2">
            {forecastData.length}
          </h2>

        </div>

        {/* Forecast Table */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">

          <div className="p-6">
            <h2 className="text-xl font-bold">
              Product Demand Forecast
            </h2>
          </div>

          <div className="overflow-x-auto">

            <table className="w-full">

              <thead className="bg-gray-100">
                <tr>

                  <th className="text-left p-4">
                    Product
                  </th>

                  <th className="text-left p-4">
                    Historical Sales
                  </th>

                  <th className="text-left p-4">
                    Sales Records
                  </th>

                  <th className="text-left p-4">
                    Average Demand
                  </th>

                  <th className="text-left p-4">
                    Forecast
                  </th>

                </tr>
              </thead>

              <tbody>

                {forecastData.map((item) => (
                  <tr
                    key={item.product}
                    className="border-t"
                  >

                    <td className="p-4 font-medium">
                      {item.product}
                    </td>

                    <td className="p-4">
                      {item.totalSales}
                    </td>

                    <td className="p-4">
                      {item.records}
                    </td>

                    <td className="p-4">
                      {item.averageDemand} units
                    </td>

                    <td className="p-4">
                      <span className="bg-blue-100 text-blue-600 px-3 py-1 rounded-full font-medium">
                        {item.forecast} units
                      </span>
                    </td>

                  </tr>
                ))}

              </tbody>

            </table>

          </div>

        </div>

      </div>
    </Layout>
  );
}

export default Forecast;
