import React, { useEffect, useState } from 'react';
import Layout from "../components/Layout";
export default function Transactions() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    
    fetch(`${baseUrl}/api/inventory/transactions`)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Server returned status ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        if (data.success && Array.isArray(data.data)) {
          setLogs(data.data);
        } else if (Array.isArray(data)) {
          setLogs(data);
        } else {
          setLogs([]);
        }
      })
      .catch((err) => {
        console.error('Error fetching transactions:', err);
        setError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <Layout>
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Inventory Transaction Ledger</h2>
        <p className="text-sm text-slate-500">Audit history for all inventory quantity changes</p>
      </div>

      {loading && (
        <div className="flex items-center justify-center p-12 bg-white rounded-lg shadow-sm border border-slate-200">
          <p className="text-slate-600 font-medium animate-pulse">Loading transaction logs...</p>
        </div>
      )}

      {error && (
        <div className="p-4 mb-6 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <p className="font-semibold">Failed to load transactions</p>
          <p className="text-sm">{error}. Check if your backend server is running.</p>
        </div>
      )}

      {!loading && !error && (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 text-sm font-semibold">
                <th className="p-4">Transaction ID</th>
                <th className="p-4">Product Name</th>
                <th className="p-4">Product ID</th>
                <th className="p-4">Change</th>
                <th className="p-4">Reason</th>
                <th className="p-4">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {logs.length > 0 ? (
                logs.map((tx, idx) => {
                  // Handle populated vs unpopulated productId field gracefully
                  const productName = typeof tx.productId === 'object' ? tx.productId?.name : tx.productName;
                  const productId = typeof tx.productId === 'object' ? tx.productId?._id : tx.productId;
                  const txId = tx._id || tx.transactionId || tx.hash || `TX-${idx + 1}`;

                  return (
                    <tr key={txId} className="hover:bg-slate-50 transition-colors">
                      {/* Transaction ID */}
                      <td className="p-4 font-mono text-xs text-slate-500 break-all max-w-[140px]">
                        {txId}
                      </td>

                      {/* Product Name */}
                      <td className="p-4 font-medium text-slate-800">
                        {productName || 'N/A'}
                      </td>

                      {/* Product ID */}
                      <td className="p-4 font-mono text-xs text-slate-500">
                        {productId || 'N/A'}
                      </td>

                      {/* Quantity Change */}
                      <td className={`p-4 font-semibold ${tx.quantityDelta >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {tx.quantityDelta > 0 ? `+${tx.quantityDelta}` : tx.quantityDelta}
                      </td>

                      {/* Reason */}
                      <td className="p-4 text-slate-600">
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                          {tx.reason || 'Adjustment'}
                        </span>
                      </td>

                      {/* Timestamp */}
                      <td className="p-4 text-slate-500 text-xs">
                        {tx.timestamp ? new Date(tx.timestamp).toLocaleString() : 'N/A'}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-slate-500">
                    No transaction records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
    </Layout>
  );
}
