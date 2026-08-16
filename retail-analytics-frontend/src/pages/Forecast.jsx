// import { useEffect, useState } from "react";
// import Layout from "../components/Layout";
// import { loadSalesData } from "../utils/loadSalesData";

// function Forecast() {
//   const [forecastData, setForecastData] = useState([]);

//   useEffect(() => {
//     loadSalesData()
//       .then((data) => {
//         const productSales = {};

//         data.forEach((item) => {
//           const product =
//             item.product ||
//             item.product_name ||
//             item.name;

//           const quantity = Number(
//             item.quantity ||
//             item.units_sold ||
//             item.sales_quantity ||
//             0
//           );

//           if (!product) return;

//           if (!productSales[product]) {
//             productSales[product] = {
//               product,
//               totalSales: 0,
//               records: 0,
//             };
//           }

//           productSales[product].totalSales += quantity;
//           productSales[product].records += 1;
//         });

//         const results = Object.values(productSales).map((item) => {
//           const averageDemand =
//             item.totalSales / item.records;

//           return {
//             ...item,
//             averageDemand: Math.round(averageDemand),
//             forecast: Math.round(averageDemand),
//           };
//         });

//         setForecastData(results);
//       })
//       .catch((error) => {
//         console.error("Forecast ERROR:", error);
//       });
//   }, []);

//   return (
//     <Layout>
//       <div>

//         <h1 className="text-3xl font-bold mb-2">
//           Demand Forecasting
//         </h1>

//         <p className="text-gray-500 mb-8">
//           Product-wise demand analysis based on historical sales.
//         </p>

//         {/* Summary */}
//         <div className="bg-white rounded-xl shadow-md p-6 mb-8">

//           <p className="text-gray-500">
//             Products Analyzed
//           </p>

//           <h2 className="text-4xl font-bold text-blue-600 mt-2">
//             {forecastData.length}
//           </h2>

//         </div>

//         {/* Forecast Table */}
//         <div className="bg-white rounded-xl shadow-md overflow-hidden">

//           <div className="p-6">
//             <h2 className="text-xl font-bold">
//               Product Demand Forecast
//             </h2>
//           </div>

//           <div className="overflow-x-auto">

//             <table className="w-full">

//               <thead className="bg-gray-100">
//                 <tr>

//                   <th className="text-left p-4">
//                     Product
//                   </th>

//                   <th className="text-left p-4">
//                     Historical Sales
//                   </th>

//                   <th className="text-left p-4">
//                     Sales Records
//                   </th>

//                   <th className="text-left p-4">
//                     Average Demand
//                   </th>

//                   <th className="text-left p-4">
//                     Forecast
//                   </th>

//                 </tr>
//               </thead>

//               <tbody>

//                 {forecastData.map((item) => (
//                   <tr
//                     key={item.product}
//                     className="border-t"
//                   >

//                     <td className="p-4 font-medium">
//                       {item.product}
//                     </td>

//                     <td className="p-4">
//                       {item.totalSales}
//                     </td>

//                     <td className="p-4">
//                       {item.records}
//                     </td>

//                     <td className="p-4">
//                       {item.averageDemand} units
//                     </td>

//                     <td className="p-4">
//                       <span className="bg-blue-100 text-blue-600 px-3 py-1 rounded-full font-medium">
//                         {item.forecast} units
//                       </span>
//                     </td>

//                   </tr>
//                 ))}

//               </tbody>

//             </table>

//           </div>

//         </div>

//       </div>
//     </Layout>
//   );
// }

// export default Forecast;

import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { loadSalesData } from "../utils/loadSalesData";
import { loadInventoryData } from "../utils/loadInventoryData";

function Forecast() {
  const [forecastData, setForecastData] = useState([]);

  useEffect(() => {
    Promise.all([
      loadSalesData(),
      loadInventoryData(),
    ])
      .then(([salesData, inventoryData]) => {
        // -----------------------------
        // 1. Calculate sales by product
        // -----------------------------

        const productSales = {};

        salesData.forEach((item) => {
          const productId = String(item.product_id);

          const quantity = Number(item.quantity) || 0;

          if (!productSales[productId]) {
            productSales[productId] = {
              totalSales: 0,
              records: 0,
            };
          }

          productSales[productId].totalSales += quantity;
          productSales[productId].records += 1;
        });

        // -----------------------------
        // 2. Connect sales with inventory
        // -----------------------------

        const results = inventoryData.map((item) => {
          const productId = String(item.product_id);

          const sales = productSales[productId] || {
            totalSales: 0,
            records: 0,
          };

          // Average sales per transaction
          const averageDemand =
            sales.records > 0
              ? sales.totalSales / sales.records
              : 0;

          // Initial baseline forecast
          const forecast = Math.round(averageDemand);

          const currentStock =
            Number(item.current_stock) || 0;

          const reorderLevel =
            Number(item.reorder_level) || 0;

          // -----------------------------
          // 3. Calculate stock risk
          // -----------------------------

          let risk = "Low";

          if (currentStock < forecast) {
            risk = "High";
          } else if (currentStock <= reorderLevel) {
            risk = "Medium";
          }

          // -----------------------------
          // 4. Calculate reorder quantity
          // -----------------------------

          const reorderQuantity = Math.max(
            forecast - currentStock,
            0
          );

          return {
            productId,
            product: item.product,
            category: item.category,
            currentStock,
            reorderLevel,
            totalSales: sales.totalSales,
            records: sales.records,
            averageDemand: Math.round(averageDemand),
            forecast,
            risk,
            reorderQuantity,
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
          Product demand forecasting and inventory
          optimization based on historical sales.
        </p>

        {/* Summary Cards */}

        <div className="grid grid-cols-3 gap-6 mb-8">

          <div className="bg-white rounded-xl shadow-md p-6">
            <p className="text-gray-500">
              Products Analyzed
            </p>

            <h2 className="text-3xl font-bold text-blue-600 mt-2">
              {forecastData.length}
            </h2>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <p className="text-gray-500">
              High Risk Products
            </p>

            <h2 className="text-3xl font-bold text-red-600 mt-2">
              {
                forecastData.filter(
                  (item) => item.risk === "High"
                ).length
              }
            </h2>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <p className="text-gray-500">
              Products Requiring Reorder
            </p>

            <h2 className="text-3xl font-bold text-orange-600 mt-2">
              {
                forecastData.filter(
                  (item) => item.reorderQuantity > 0
                ).length
              }
            </h2>
          </div>

        </div>

        {/* Forecast Table */}

        <div className="bg-white rounded-xl shadow-md overflow-hidden">

          <div className="p-6">
            <h2 className="text-xl font-bold">
              Forecast & Inventory Analysis
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
                    Current Stock
                  </th>

                  <th className="text-left p-4">
                    Reorder Level
                  </th>

                  <th className="text-left p-4">
                    Historical Sales
                  </th>

                  <th className="text-left p-4">
                    Forecast
                  </th>

                  <th className="text-left p-4">
                    Risk
                  </th>

                  <th className="text-left p-4">
                    Recommendation
                  </th>

                </tr>

              </thead>

              <tbody>

                {forecastData.map((item) => (

                  <tr
                    key={item.productId}
                    className="border-t"
                  >

                    <td className="p-4 font-medium">
                      {item.product}
                    </td>

                    <td className="p-4">
                      {item.currentStock}
                    </td>

                    <td className="p-4">
                      {item.reorderLevel}
                    </td>

                    <td className="p-4">
                      {item.totalSales}
                    </td>

                    <td className="p-4 font-semibold">
                      {item.forecast}
                    </td>

                    <td className="p-4">

                      {item.risk === "High" && (
                        <span className="bg-red-100 text-red-600 px-3 py-1 rounded-full text-sm font-medium">
                          High
                        </span>
                      )}

                      {item.risk === "Medium" && (
                        <span className="bg-orange-100 text-orange-600 px-3 py-1 rounded-full text-sm font-medium">
                          Medium
                        </span>
                      )}

                      {item.risk === "Low" && (
                        <span className="bg-green-100 text-green-600 px-3 py-1 rounded-full text-sm font-medium">
                          Low
                        </span>
                      )}

                    </td>

                    <td className="p-4">

                      {item.reorderQuantity > 0 ? (

                        <span className="bg-orange-100 text-orange-600 px-3 py-1 rounded-full text-sm font-medium">
                          Reorder {item.reorderQuantity}
                        </span>

                      ) : (

                        <span className="text-green-600 font-medium">
                          No reorder needed
                        </span>

                      )}

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
