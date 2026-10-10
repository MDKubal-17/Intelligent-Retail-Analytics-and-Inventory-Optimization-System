import { useEffect, useState } from "react";

function TransactionTable() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const loadTransactions = async () => {
    try {
      setLoading(true);
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
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, []);

  const getActionStyle = (action) => {
    switch (action?.toLowerCase()) {
      case "sell":
        return "bg-red-100 text-red-700";
      case "restock":
        return "bg-green-100 text-green-700";
      case "damaged":
        return "bg-orange-100 text-orange-700";
      case "adjustment":
        return "bg-blue-100 text-blue-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 mt-8">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b">
        <div>
          <h2 className="text-xl font-bold text-gray-800">
            Inventory Transactions
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Recent stock and sales transactions
          </p>
        </div>

        <button
          onClick={loadTransactions}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          Refresh
        </button>

      </div>
      {/* Table */}
      <div className="overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center text-gray-500">
            Loading transactions...
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No transactions found.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left text-gray-600">
                <th className="px-6 py-4 font-semibold">
                  Transaction ID
                </th>
                <th className="px-6 py-4 font-semibold">
                  Date
                </th>
                <th className="px-6 py-4 font-semibold">
                  Product
                </th>
                <th className="px-6 py-4 font-semibold">
                  Action
                </th>
                <th className="px-6 py-4 font-semibold">
                  Quantity
                </th>
                <th className="px-6 py-4 font-semibold">
                  Stock Change
                </th>
                <th className="px-6 py-4 font-semibold">
                  Reason
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">

              {transactions.map((transaction, index) => (
                <tr
                  key={transaction.transaction_id || index}
                  className="hover:bg-gray-50"
                >
                  {/* Transaction ID */}
                  <td className="px-6 py-4 font-medium text-gray-700">
                    {transaction.transaction_id}
                  </td>
                  {/* Date */}
                  <td className="px-6 py-4 text-gray-600">
                    {transaction.date}
                  </td>
                  {/* Product */}
                  <td className="px-6 py-4 font-medium">
                    {transaction.product}
                  </td>
                  {/* Action */}
                  <td className="px-6 py-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${getActionStyle(
                        transaction.action
                      )}`}
                    >
                      {transaction.action}
                    </span>

                  </td>
                  {/* Quantity */}
                  <td className="px-6 py-4">
                    {transaction.quantity}
                  </td>
                  {/* Stock Change */}
                  <td
                    className={`px-6 py-4 font-semibold ${
                      Number(transaction.quantity_change) < 0
                        ? "text-red-600"
                        : "text-green-600"
                    }`}
                  >
                    {Number(transaction.quantity_change) > 0
                      ? `+${transaction.quantity_change}`
                      : transaction.quantity_change}
                  </td>
                  {/* Reason */}
                  <td className="px-6 py-4 text-gray-600">
                    {transaction.reason || "-"}
                  </td>
                </tr>
              ))}

            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default TransactionTable;