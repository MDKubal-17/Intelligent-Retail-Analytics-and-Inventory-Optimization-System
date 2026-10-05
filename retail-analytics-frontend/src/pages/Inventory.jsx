import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { loadInventoryData } from "../utils/loadInventoryData";

function Inventory() {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);

  // Transaction modal
  const [showActionModal, setShowActionModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const [action, setAction] = useState("sell");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");

  const [saving, setSaving] = useState(false);

  // Transactions
  const [transactions, setTransactions] = useState([]);
  const [transactionsLoading, setTransactionsLoading] = useState(true);

  // ==========================================
  // LOAD INVENTORY
  // ==========================================

  const loadInventory = async () => {
    try {
      setLoading(true);

      const data = await loadInventoryData();

      const formattedData = data.map((item) => ({
        id: Number(item.product_id),
        name: item.product || "",
        category: item.category || "",
        stock: Number(item.current_stock) || 0,
        reorderLevel: Number(item.reorder_level) || 0,
        price: Number(item.unit_price) || 0,
        inventoryValue: Number(item.inventory_value) || 0,
        status: item.status || "",
        image: item.img_url || "",
      }));

      setInventory(formattedData);
    } catch (error) {
      console.error("Inventory ERROR:", error);
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // LOAD TRANSACTIONS
  // ==========================================

  const loadTransactions = async () => {
    try {
      setTransactionsLoading(true);

      const response = await fetch(
        "http://127.0.0.1:5000/api/transactions"
      );

      if (!response.ok) {
        throw new Error("Failed to load transactions");
      }

      const data = await response.json();

      setTransactions(data.transactions || []);
    } catch (error) {
      console.error("TRANSACTION ERROR:", error);
    } finally {
      setTransactionsLoading(false);
    }
  };

  // ==========================================
  // INITIAL LOAD
  // ==========================================

  useEffect(() => {
    loadInventory();
    loadTransactions();
  }, []);

  // ==========================================
  // CALCULATIONS
  // ==========================================

  const totalProducts = inventory.length;

  const totalStock = inventory.reduce(
    (total, item) => total + item.stock,
    0
  );

  const lowStockItems = inventory.filter(
    (item) => item.stock <= item.reorderLevel
  );

  // ==========================================
  // REORDER QUANTITY
  // ==========================================

  const calculateReorderQuantity = (item) => {
    if (item.stock >= item.reorderLevel) {
      return 0;
    }

    return item.reorderLevel * 2 - item.stock;
  };

  // ==========================================
  // OPEN ACTION MODAL
  // ==========================================

  const openActionModal = (product, selectedAction) => {
    setSelectedProduct(product);
    setAction(selectedAction);
    setQuantity("");
    setReason("");
    setShowActionModal(true);
  };

  // ==========================================
  // CLOSE ACTION MODAL
  // ==========================================

  const closeActionModal = () => {
    if (saving) return;

    setShowActionModal(false);
    setSelectedProduct(null);
    setQuantity("");
    setReason("");
    setAction("sell");
  };

  // ==========================================
  // PERFORM INVENTORY ACTION
  // ==========================================

  const handleInventoryAction = async () => {
    if (!selectedProduct) {
      return;
    }

    const qty = Number(quantity);

    if (!qty || qty <= 0) {
      alert("Please enter a valid quantity.");
      return;
    }

    // Prevent selling/damaging more than available stock
    if (
      (action === "sell" || action === "damaged") &&
      qty > selectedProduct.stock
    ) {
      alert(
        `Only ${selectedProduct.stock} units are available for ${selectedProduct.name}.`
      );
      return;
    }

    try {
      setSaving(true);

      const response = await fetch(
        "http://127.0.0.1:5000/api/inventory/action",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            product_id: selectedProduct.id,
            action: action,
            quantity: qty,
            reason:
              reason.trim() ||
              (action === "sell"
                ? "Customer purchase"
                : action === "restock"
                ? "Inventory restock"
                : action === "damaged"
                ? "Damaged stock"
                : "Stock adjustment"),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to perform inventory action"
        );
      }

      alert(
        `${action.toUpperCase()} successful!\n\n` +
          `Product: ${selectedProduct.name}\n` +
          `Quantity: ${qty}\n` +
          `Transaction ID: ${
            data.transaction_id || "Created"
          }`
      );

      closeActionModal();

      // Refresh inventory
      await loadInventory();

      // Refresh transactions
      await loadTransactions();
    } catch (error) {
      console.error("INVENTORY ACTION ERROR:", error);

      alert(
        error.message ||
          "Something went wrong while updating inventory."
      );
    } finally {
      setSaving(false);
    }
  };

  // ==========================================
  // ACTION BUTTON STYLE
  // ==========================================

  const getActionStyle = (actionName) => {
    switch (actionName) {
      case "sell":
        return "bg-red-100 text-red-700 hover:bg-red-200";

      case "restock":
        return "bg-green-100 text-green-700 hover:bg-green-200";

      case "damaged":
        return "bg-orange-100 text-orange-700 hover:bg-orange-200";

      case "adjustment":
        return "bg-blue-100 text-blue-700 hover:bg-blue-200";

      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  // ==========================================
  // LOADING
  // ==========================================

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center py-20">
          <p className="text-gray-500">
            Loading inventory...
          </p>
        </div>
      </Layout>
    );
  }

  // ==========================================
  // UI
  // ==========================================

  return (
    <Layout>

      {/* ======================================
          PAGE HEADER
      ====================================== */}

      <div className="mb-6">

        <h1 className="text-3xl font-bold">
          Inventory Optimization
        </h1>

        <p className="text-gray-500 mt-1">
          Monitor stock levels and manage inventory
          transactions.
        </p>

      </div>


      {/* ======================================
          KPI CARDS
      ====================================== */}

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


      {/* ======================================
          INVENTORY TABLE
      ====================================== */}

      <div className="bg-white rounded-xl shadow-md overflow-hidden">

        <div className="p-6 border-b">

          <h2 className="text-xl font-bold">
            Inventory Status
          </h2>

          <p className="text-sm text-gray-500 mt-1">
            Manage stock and record inventory
            transactions.
          </p>

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

                <th className="text-left p-4">
                  Actions
                </th>

              </tr>

            </thead>


            <tbody>

              {inventory.map((item) => {

                const isLowStock =
                  item.stock <= item.reorderLevel;

                const reorderQuantity =
                  calculateReorderQuantity(item);

                return (

                  <tr
                    key={item.id}
                    className="border-t hover:bg-gray-50"
                  >

                    {/* PRODUCT */}

                    <td className="p-4">

                      <div className="font-medium">
                        {item.name}
                      </div>

                      <div className="text-xs text-gray-400">
                        ID: {item.id}
                      </div>

                    </td>


                    {/* CATEGORY */}

                    <td className="p-4 text-gray-600">
                      {item.category}
                    </td>


                    {/* CURRENT STOCK */}

                    <td className="p-4">

                      <span
                        className={
                          isLowStock
                            ? "font-bold text-red-600"
                            : "font-semibold text-gray-800"
                        }
                      >
                        {item.stock}
                      </span>

                    </td>


                    {/* REORDER LEVEL */}

                    <td className="p-4">
                      {item.reorderLevel}
                    </td>


                    {/* RECOMMENDED REORDER */}

                    <td className="p-4">

                      {reorderQuantity > 0 ? (

                        <span className="bg-orange-100 text-orange-600 px-3 py-1 rounded-full text-sm font-medium">

                          Reorder {reorderQuantity}

                        </span>

                      ) : (

                        <span className="text-gray-500">
                          No reorder needed
                        </span>

                      )}

                    </td>


                    {/* STATUS */}

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


                    {/* ACTIONS */}

                    <td className="p-4">

                      <div className="flex flex-wrap gap-2">

                        <button
                          onClick={() =>
                            openActionModal(
                              item,
                              "sell"
                            )
                          }
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${getActionStyle(
                            "sell"
                          )}`}
                        >
                          Sell
                        </button>


                        <button
                          onClick={() =>
                            openActionModal(
                              item,
                              "restock"
                            )
                          }
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${getActionStyle(
                            "restock"
                          )}`}
                        >
                          Restock
                        </button>


                        <button
                          onClick={() =>
                            openActionModal(
                              item,
                              "damaged"
                            )
                          }
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${getActionStyle(
                            "damaged"
                          )}`}
                        >
                          Damaged
                        </button>


                        <button
                          onClick={() =>
                            openActionModal(
                              item,
                              "adjustment"
                            )
                          }
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${getActionStyle(
                            "adjustment"
                          )}`}
                        >
                          Adjust
                        </button>

                      </div>

                    </td>

                  </tr>

                );
              })}

            </tbody>

          </table>

        </div>

      </div>


      {/* ======================================
          TRANSACTION HISTORY
      ====================================== */}

      <div className="bg-white rounded-xl shadow-md mt-8 overflow-hidden">

        <div className="p-6 border-b flex items-center justify-between">

          <div>

            <h2 className="text-xl font-bold">
              Transaction History
            </h2>

            <p className="text-sm text-gray-500 mt-1">
              All inventory stock movements
            </p>

          </div>


          <button
            onClick={loadTransactions}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
          >
            Refresh
          </button>

        </div>


        <div className="overflow-x-auto">

          {transactionsLoading ? (

            <div className="p-8 text-center text-gray-500">
              Loading transactions...
            </div>

          ) : transactions.length === 0 ? (

            <div className="p-8 text-center text-gray-500">
              No transactions found.
            </div>

          ) : (

            <table className="w-full">

              <thead className="bg-gray-100">

                <tr>

                  <th className="text-left p-4">
                    Transaction ID
                  </th>

                  <th className="text-left p-4">
                    Date
                  </th>

                  <th className="text-left p-4">
                    Product
                  </th>

                  <th className="text-left p-4">
                    Action
                  </th>

                  <th className="text-left p-4">
                    Quantity
                  </th>

                  <th className="text-left p-4">
                    Stock Change
                  </th>

                  <th className="text-left p-4">
                    Reason
                  </th>

                </tr>

              </thead>


              <tbody>

                {transactions.map(
                  (transaction, index) => {

                    const change = Number(
                      transaction.quantity_change || 0
                    );

                    return (

                      <tr
                        key={
                          transaction.transaction_id ||
                          index
                        }
                        className="border-t hover:bg-gray-50"
                      >

                        <td className="p-4 text-sm font-medium">
                          {transaction.transaction_id}
                        </td>


                        <td className="p-4 text-sm text-gray-600">
                          {transaction.date}
                        </td>


                        <td className="p-4 font-medium">
                          {transaction.product}
                        </td>


                        <td className="p-4">

                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold ${getActionStyle(
                              transaction.action
                            )}`}
                          >
                            {transaction.action}
                          </span>

                        </td>


                        <td className="p-4">
                          {transaction.quantity}
                        </td>


                        <td
                          className={`p-4 font-semibold ${
                            change < 0
                              ? "text-red-600"
                              : "text-green-600"
                          }`}
                        >
                          {change > 0
                            ? `+${change}`
                            : change}
                        </td>


                        <td className="p-4 text-sm text-gray-600">
                          {transaction.reason || "-"}
                        </td>

                      </tr>

                    );
                  }
                )}

              </tbody>

            </table>

          )}

        </div>

      </div>


      {/* ======================================
          ACTION MODAL
      ====================================== */}

      {showActionModal && selectedProduct && (

        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">

          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">

            {/* MODAL HEADER */}

            <div className="flex items-center justify-between mb-5">

              <div>

                <h2 className="text-xl font-bold">
                  {action === "sell"
                    ? "Sell Product"
                    : action === "restock"
                    ? "Restock Product"
                    : action === "damaged"
                    ? "Record Damaged Stock"
                    : "Adjust Stock"}
                </h2>

                <p className="text-sm text-gray-500 mt-1">
                  {selectedProduct.name}
                </p>

              </div>


              <button
                onClick={closeActionModal}
                className="text-gray-400 hover:text-gray-700 text-2xl"
              >
                ×
              </button>

            </div>


            {/* PRODUCT INFO */}

            <div className="bg-gray-50 rounded-lg p-4 mb-5">

              <div className="flex justify-between">

                <span className="text-gray-500">
                  Current Stock
                </span>

                <span className="font-bold">
                  {selectedProduct.stock}
                </span>

              </div>


              <div className="flex justify-between mt-2">

                <span className="text-gray-500">
                  Reorder Level
                </span>

                <span className="font-bold">
                  {selectedProduct.reorderLevel}
                </span>

              </div>

            </div>


            {/* ACTION */}

            <div className="mb-4">

              <label className="block text-sm font-medium text-gray-700 mb-2">
                Action
              </label>

              <select
                value={action}
                onChange={(e) =>
                  setAction(e.target.value)
                }
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >

                <option value="sell">
                  Sell
                </option>

                <option value="restock">
                  Restock
                </option>

                <option value="damaged">
                  Damaged
                </option>

                <option value="adjustment">
                  Adjustment
                </option>

              </select>

            </div>


            {/* QUANTITY */}

            <div className="mb-4">

              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quantity
              </label>

              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) =>
                  setQuantity(e.target.value)
                }
                placeholder="Enter quantity"
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

            </div>


            {/* REASON */}

            <div className="mb-6">

              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason
              </label>

              <textarea
                value={reason}
                onChange={(e) =>
                  setReason(e.target.value)
                }
                placeholder="Enter reason..."
                rows="3"
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

            </div>


            {/* BUTTONS */}

            <div className="flex justify-end gap-3">

              <button
                onClick={closeActionModal}
                disabled={saving}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>


              <button
                onClick={handleInventoryAction}
                disabled={saving}
                className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : "Confirm"}
              </button>

            </div>

          </div>

        </div>

      )}

    </Layout>
  );
}

export default Inventory;
