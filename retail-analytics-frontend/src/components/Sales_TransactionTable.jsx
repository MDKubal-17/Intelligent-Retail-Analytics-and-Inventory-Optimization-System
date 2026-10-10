import { useEffect, useState } from "react";

function Sales_TransactionTable() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageSize, setPageSize] = useState("10");

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

  // Show only Sell transactions, newest first when dates are sortable.
  const sellTransactions = transactions
    .filter(
      (transaction) =>
        String(transaction.action || "").trim().toLowerCase() === "sell"
    )
    .sort((a, b) => {
      const dateA = new Date(a.date).getTime() || 0;
      const dateB = new Date(b.date).getTime() || 0;
      return dateB - dateA;
    });

  const displayedTransactions =
    pageSize === "all"
      ? sellTransactions
      : sellTransactions.slice(0, Number(pageSize));

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 border-b">
        <div>
          <h2 className="text-xl font-bold text-gray-800">
            Sales Transactions
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Completed Sell transactions only
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {sellTransactions.length} sell transaction
            {sellTransactions.length !== 1 ? "s" : ""} found
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label
            htmlFor="transaction-limit"
            className="text-sm text-gray-600 whitespace-nowrap"
          >
            Show:
          </label>

          <select
            id="transaction-limit"
            value={pageSize}
            onChange={(e) => setPageSize(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="30">30</option>
            <option value="50">50</option>
            <option value="all">All</option>
          </select>

          <button
            onClick={loadTransactions}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center text-gray-500">
            Loading transactions...
          </div>
        ) : sellTransactions.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No Sell transactions found.
          </div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr className="text-left text-gray-600">
                  <th className="px-6 py-4 font-semibold">Transaction ID</th>
                  <th className="px-6 py-4 font-semibold">Date</th>
                  <th className="px-6 py-4 font-semibold">Product</th>
                  <th className="px-6 py-4 font-semibold">Action</th>
                  <th className="px-6 py-4 font-semibold">Quantity</th>
                  <th className="px-6 py-4 font-semibold">Stock Change</th>
                  <th className="px-6 py-4 font-semibold">Reason</th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {displayedTransactions.map((transaction, index) => (
                  <tr
                    key={transaction.transaction_id || index}
                    className="hover:bg-gray-50"
                  >
                    <td className="px-6 py-4 font-medium text-gray-700">
                      {transaction.transaction_id}
                    </td>

                    <td className="px-6 py-4 text-gray-600">
                      {transaction.date}
                    </td>

                    <td className="px-6 py-4 font-medium">
                      {transaction.product}
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${getActionStyle(
                          transaction.action
                        )}`}
                      >
                        {transaction.action}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      {transaction.quantity}
                    </td>

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

                    <td className="px-6 py-4 text-gray-600">
                      {transaction.reason || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="px-6 py-4 border-t text-sm text-gray-500">
              Showing {displayedTransactions.length} of{" "}
              {sellTransactions.length} Sell transactions
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Sales_TransactionTable;
