import "./PurchaseOrders.css";
import { useCallback, useEffect, useState } from "react";
import Layout from "../components/Layout";

const API_BASE_URL =
  import.meta.env.VITE_FLASK_API_URL || "http://127.0.0.1:5000";

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `Request failed (${response.status})`);
  }

  return data;
}

const money = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

function PurchaseOrders() {
  const [recommendations, setRecommendations] = useState([]);
  const [quantities, setQuantities] = useState({});
  const [orders, setOrders] = useState([]);
  const [supplier, setSupplier] = useState({
    supplier_name: "",
    supplier_email: "",
    supplier_phone: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [recommendationData, orderData] = await Promise.all([
        apiRequest("/api/purchase-orders/recommendations"),
        apiRequest("/api/purchase-orders"),
      ]);

      const rows = recommendationData.recommendations || [];
      setRecommendations(rows);
      setOrders(orderData.purchase_orders || []);

      setQuantities((previous) => {
        const next = { ...previous };

        rows.forEach((item) => {
          if (next[item.product_id] === undefined) {
            next[item.product_id] = item.suggested_quantity;
          }
        });

        return next;
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const draftItems = recommendations
    .map((item) => ({
      product_id: item.product_id,
      quantity: Math.floor(Number(quantities[item.product_id]) || 0),
    }))
    .filter((item) => item.quantity > 0);

  const draftTotal = recommendations.reduce((total, item) => {
    const quantity = Math.max(
      0,
      Math.floor(Number(quantities[item.product_id]) || 0)
    );

    return total + quantity * Number(item.unit_price || 0);
  }, 0);

  const createDraft = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!supplier.supplier_name.trim()) {
      setError("Enter a supplier name.");
      return;
    }

    if (!supplier.supplier_email.trim()) {
      setError("Enter the supplier's email address.");
      return;
    }

    if (draftItems.length === 0) {
      setError("Enter a positive quantity for at least one product.");
      return;
    }

    setSaving(true);

    try {
      await apiRequest("/api/purchase-orders", {
        method: "POST",
        body: JSON.stringify({
          ...supplier,
          items: draftItems,
        }),
      });

      setMessage("Purchase-order draft saved successfully.");
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (orderId, status) => {
    setError("");
    setMessage("");

    try {
      await apiRequest(
        `/api/purchase-orders/${encodeURIComponent(orderId)}/status`,
        {
          method: "PUT",
          body: JSON.stringify({ status }),
        }
      );

      setMessage(`${orderId} marked ${status.toLowerCase()}.`);
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  
  const [sendingOrderId, setSendingOrderId] = useState(null);

  const approveAndSendInquiry = async (order) => {
    setError("");
    setMessage("");

    if (!order.supplier_email?.trim()) {
      setError(
        `Add a supplier email to ${order.order_id} before sending the inquiry.`
      );
      return;
    }

    const confirmed = window.confirm(
      `Send a purchase quotation request to ${order.supplier_email}?`
    );

    if (!confirmed) return;

    setSendingOrderId(order.order_id);

    try {
      const data = await apiRequest(
        `/api/purchase-orders/${encodeURIComponent(order.order_id)}/send-inquiry`,
        { method: "POST" }
      );

      setMessage(data.message || `Inquiry sent for ${order.order_id}.`);
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSendingOrderId(null);
    }
  };


  return (
    <Layout>
      <main className="purchase-orders-page">
        <header className="purchase-orders-header">
          <div>
            <h1>Smart Purchase Orders</h1>
            <p>
              Review demand-based replenishment suggestions and manage orders.
            </p>
          </div>

          <button type="button" onClick={loadData} disabled={loading}>
            Refresh data
          </button>
        </header>

        {error && <p role="alert" className="po-error">{error}</p>}
        {message && <p role="status" className="po-success">{message}</p>}

        <section className="po-panel">
          <h2>Recommended replenishment</h2>
          <p>
            Suggested quantities use the seven-day forecast plus the configured
            reorder-level buffer. Review quantities before saving.
          </p>

          {loading ? (
            <p>Loading inventory and Chronos-2 forecasts...</p>
          ) : recommendations.length === 0 ? (
            <p>No replenishment recommendations are available. Check that the
              forecast service is running and inventory data is present.</p>
          ) : (
            <div className="po-table-wrap">
              <table className="po-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Available</th>
                    <th>Reorder level</th>
                    <th>7-day demand</th>
                    <th>Order quantity</th>
                    <th>Unit price</th>
                    <th>Line total</th>
                  </tr>
                </thead>
                <tbody>
                  {recommendations.map((item) => {
                    const quantity = Math.max(
                      0,
                      Math.floor(Number(quantities[item.product_id]) || 0)
                    );

                    return (
                      <tr key={item.product_id}>
                        <td>
                          <strong>{item.product}</strong>
                          <small>{item.category}</small>
                        </td>
                        <td>{item.current_stock}</td>
                        <td>{item.reorder_level}</td>
                        <td>{Number(item.forecast_demand_7d).toFixed(1)}</td>
                        <td>
                          <input
                            aria-label={`Order quantity for ${item.product}`}
                            type="number"
                            min="0"
                            step="1"
                            value={quantities[item.product_id] ?? ""}
                            onChange={(event) =>
                              setQuantities((previous) => ({
                                ...previous,
                                [item.product_id]: event.target.value,
                              }))
                            }
                          />
                        </td>
                        <td>{money(item.unit_price)}</td>
                        <td>{money(quantity * Number(item.unit_price || 0))}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="po-panel">
          <h2>Create purchase-order draft</h2>

          <form onSubmit={createDraft} className="po-form">
            <label>
              Supplier name *
              <input
                required
                value={supplier.supplier_name}
                onChange={(event) =>
                  setSupplier((previous) => ({
                    ...previous,
                    supplier_name: event.target.value,
                  }))
                }
                placeholder="Enter supplier or company name"
              />
            </label>

            <label>
              Supplier email
              <input
                type="email"
                value={supplier.supplier_email}
                onChange={(event) =>
                  setSupplier((previous) => ({
                    ...previous,
                    supplier_email: event.target.value,
                  }))
                }
                placeholder="supplier@example.com"
              />
            </label>

            <label>
              Supplier phone
              <input
                value={supplier.supplier_phone}
                onChange={(event) =>
                  setSupplier((previous) => ({
                    ...previous,
                    supplier_phone: event.target.value,
                  }))
                }
                placeholder="Contact number"
              />
            </label>

            <div className="po-total">
              <span>Estimated draft total</span>
              <strong>{money(draftTotal)}</strong>
            </div>

            <button type="submit" disabled={saving || loading}>
              {saving ? "Saving..." : "Save purchase-order draft"}
            </button>
          </form>
        </section>

        <section className="po-panel">
          <h2>Purchase-order history</h2>

          {orders.length === 0 ? (
            <p>No purchase orders have been created yet.</p>
          ) : (
            <div className="po-table-wrap">
              <table className="po-table">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Supplier</th>
                    <th>Items</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.order_id}>
                      <td>{order.order_id}</td>
                      <td>{order.supplier_name}</td>
                      <td>
                        {(order.items || []).reduce(
                          (sum, item) => sum + Number(item.quantity || 0),
                          0
                        )} units
                      </td>
                      <td>{money(order.total_cost)}</td>
                      <td>
                        <span className="po-status">{order.status}</span>
                      </td>
                      <td>
                        <div className="po-actions">
                          {order.status === "Draft" && (
                            <>
                              <button
                                type="button"
                                disabled={sendingOrderId === order.order_id}
                                onClick={() => approveAndSendInquiry(order)}
                              >
                                {sendingOrderId === order.order_id
                                  ? "Sending inquiry..."
                                  : "Approve & Send Inquiry"}
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  changeStatus(order.order_id, "Cancelled")
                                }
                              >
                                Cancel
                              </button>
                            </>
                          )}

                          {order.status === "Approved" && (
                            <>
                              <button
                                type="button"
                                onClick={() =>
                                  changeStatus(order.order_id, "Received")
                                }
                              >
                                Mark received
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  changeStatus(order.order_id, "Cancelled")
                                }
                              >
                                Cancel
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </Layout>
  );
}

export default PurchaseOrders;
