import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { loadInventoryData } from "../utils/loadInventoryData";

function Inventory() {
  const [inventory, setInventory] = useState([]);

  useEffect(() => {
    loadInventoryData()
      .then((data) => {
        const formattedData = data.map((item) => ({
          id: Number(item.product_id),
          name: item.product,
          category: item.category,
          stock: Number(item.current_stock),
          reorderLevel: Number(item.reorder_level),
          price: Number(item.unit_price),
        }));

        setInventory(formattedData);
      })
      .catch((error) => {
        console.error("Inventory ERROR:", error);
      });
  }, []);

  const totalProducts = inventory.length;

  const totalStock = inventory.reduce(
    (total, item) => total + item.stock,
    0
  );

  const lowStockItems = inventory.filter(
    (item) => item.stock <= item.reorderLevel
  );

  const calculateReorderQuantity = (item) => {
    if (item.stock >= item.reorderLevel) {
      return 0;
    }

    return item.reorderLevel * 2 - item.stock;
  };

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">
          Inventory Optimization
        </h1>

        <p className="text-gray-500 mt-1">
          Monitor stock levels and identify products that need
          replenishment.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">

        <div className="bg-white rounded-xl shadow-md p-6">
          <p className="text-gray-500">
            Total Products
          </p>

          <h2 className="text-3xl font-bold mt-2">
            {totalProducts}
          </h2>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <p className="text-gray-500">
            Total Stock
          </p>

          <h2 className="text-3xl font-bold mt-2">
            {totalStock}
          </h2>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <p className="text-gray-500">
            Low Stock Items
          </p>

          <h2 className="text-3xl font-bold text-red-600 mt-2">
            {lowStockItems.length}
          </h2>
        </div>

      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">

        <div className="p-6">
          <h2 className="text-xl font-bold">
            Inventory Status
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
                  Category
                </th>

                <th className="text-left p-4">
                  Current Stock
                </th>

                <th className="text-left p-4">
                  Reorder Level
                </th>

                <th className="text-left p-4">
                  Recommended Reorder
                </th>

                <th className="text-left p-4">
                  Status
                </th>
              </tr>
            </thead>

            <tbody>

              {inventory.map((item) => {
                const isLowStock =
                  item.stock <= item.reorderLevel;

                return (
                  <tr
                    key={item.id}
                    className="border-t"
                  >
                    <td className="p-4 font-medium">
                      {item.name}
                    </td>

                    <td className="p-4 text-gray-600">
                      {item.category}
                    </td>

                    <td className="p-4">
                      {item.stock}
                    </td>

                    <td className="p-4">
                      {item.reorderLevel}
                    </td>

                    <td className="p-4">
                      {calculateReorderQuantity(item) > 0 ? (
                        <span className="bg-orange-100 text-orange-600 px-3 py-1 rounded-full text-sm font-medium">
                          Reorder {calculateReorderQuantity(item)}
                        </span>
                      ) : (
                        <span className="text-gray-500">
                          No reorder needed
                        </span>
                      )}
                    </td>

                    <td className="p-4">

                      {isLowStock ? (
                        <span className="bg-red-100 text-red-600 px-3 py-1 rounded-full text-sm">
                          Low Stock
                        </span>
                      ) : (
                        <span className="bg-green-100 text-green-600 px-3 py-1 rounded-full text-sm">
                          Healthy
                        </span>
                      )}

                    </td>
                  </tr>
                );
              })}

            </tbody>

          </table>

        </div>

      </div>
    </Layout>
  );
}

export default Inventory;