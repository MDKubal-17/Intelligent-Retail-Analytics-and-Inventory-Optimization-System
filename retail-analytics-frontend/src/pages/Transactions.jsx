
import React, { useCallback, useEffect, useState } from "react";
import Layout from "../components/Layout";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5001";

export default function Transactions() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [verification, setVerification] = useState(null);
  const [verifying, setVerifying] = useState(false);

  const loadTransactions = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${API_BASE_URL}/api/inventory/transactions`
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to load transactions.");
      }

      if (result.success && Array.isArray(result.data)) {
        setLogs(result.data);
      } else if (Array.isArray(result)) {
        setLogs(result);
      } else {
        setLogs([]);
      }
    } catch (err) {
      setError(err.message || "Unable to load transactions.");
    } finally {
      setLoading(false);
    }
  }, []);

  const verifyBlockchain = async () => {
    try {
      setVerifying(true);
      setVerification(null);

      const response = await fetch(
        `${API_BASE_URL}/api/inventory/transactions/verify`
      );

      const result = await response.json();

      setVerification(result);
    } catch (err) {
      setVerification({
        valid: false,
        message: err.message || "Unable to verify blockchain.",
      });
    } finally {
      setVerifying(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "N/A";

    const date = new Date(timestamp);

    return Number.isNaN(date.getTime())
      ? "Invalid timestamp"
      : date.toLocaleString();
  };

  return (
    <Layout>
      <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              Inventory Transaction Ledger
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              SHA-256 hash-linked audit history of inventory changes.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={loadTransactions}
              disabled={loading}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
            >
              Refresh
            </button>

            <button
              type="button"
              onClick={verifyBlockchain}
              disabled={verifying}
              className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-50"
            >
              {verifying ? "Verifying..." : "Verify Blockchain"}
            </button>
          </div>
        </div>

        {verification && (
          <div
            role="status"
            className={`mb-5 rounded-lg border p-4 ${
              verification.valid
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-red-200 bg-red-50 text-red-800"
            }`}
          >
            <p className="font-semibold">
              {verification.valid
                ? "Blockchain verification passed"
                : "Blockchain verification failed"}
            </p>

            <p className="mt-1 text-sm">{verification.message}</p>

            {verification.totalBlocks !== undefined && (
              <p className="mt-1 text-sm">
                Blocks checked: {verification.totalBlocks}
              </p>
            )}
          </div>
        )}

        {error && (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
            <p className="font-semibold">Failed to load transactions</p>
            <p className="mt-1 text-sm">{error}</p>
            <p className="mt-1 text-sm">
              Check that the Node server and MongoDB are running and that
              VITE_API_URL points to the correct server.
            </p>
          </div>
        )}

        {loading ? (
          <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-slate-600">
            Loading transaction logs...
          </div>
        ) : !error ? (
          <>
            <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-sm text-slate-500">Total transactions</p>
                <p className="mt-1 text-2xl font-bold text-slate-800">
                  {logs.length}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-sm text-slate-500">Ledger type</p>
                <p className="mt-1 text-lg font-semibold text-slate-800">
                  Hash-linked
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-sm text-slate-500">Latest block index</p>
                <p className="mt-1 text-2xl font-bold text-slate-800">
                  {logs.length
                    ? Math.max(
                        ...logs.map((tx) => Number(tx.blockIndex) || 0)
                      )
                    : "—"}
                </p>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full min-w-[1050px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-100 text-sm text-slate-700">
                    <th className="p-4">Block</th>
                    <th className="p-4">Product</th>
                    <th className="p-4">Product ID</th>
                    <th className="p-4">Change</th>
                    <th className="p-4">Reason</th>
                    <th className="p-4">Timestamp</th>
                    <th className="p-4">Previous Hash</th>
                    <th className="p-4">Block Hash</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200 text-sm">
                  {logs.length > 0 ? (
                    logs.map((tx, index) => {
                      const quantity = Number(tx.quantityDelta) || 0;

                      return (
                        <tr
                          key={tx._id || tx.hash || index}
                          className="transition-colors hover:bg-slate-50"
                        >
                          <td className="p-4 font-mono">
                            {tx.blockIndex ?? "N/A"}
                          </td>

                          <td className="p-4 font-medium text-slate-800">
                            {tx.productName || "N/A"}
                          </td>

                          <td className="p-4 font-mono text-slate-500">
                            {tx.productId || "N/A"}
                          </td>

                          <td
                            className={`p-4 font-semibold ${
                              quantity > 0
                                ? "text-emerald-600"
                                : quantity < 0
                                  ? "text-red-600"
                                  : "text-slate-600"
                            }`}
                          >
                            {quantity > 0 ? "+" : ""}
                            {quantity}
                          </td>

                          <td className="p-4">
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                              {tx.reason || "Adjustment"}
                            </span>
                          </td>

                          <td className="p-4 text-xs text-slate-500">
                            {formatTimestamp(tx.timestamp)}
                          </td>

                          <td
                            className="max-w-[180px] break-all p-4 font-mono text-xs text-slate-500"
                            title={tx.previousHash}
                          >
                            {tx.previousHash || "N/A"}
                          </td>

                          <td
                            className="max-w-[180px] break-all p-4 font-mono text-xs text-purple-700"
                            title={tx.hash}
                          >
                            {tx.hash || "N/A"}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td
                        colSpan={8}
                        className="p-10 text-center text-slate-500"
                      >
                        No transaction records found. Make an inventory
                        change to create the first block.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : null}
      </div>
    </Layout>
  );
}
