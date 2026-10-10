import { useSearchParams } from "react-router-dom";
import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import Layout from "../components/Layout";


const API_BASE_URL =
  import.meta.env.VITE_FLASK_API_URL || "http://127.0.0.1:5000";


const formatCurrency = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

// Converts numeric inventory IDs or P001-style IDs to the numeric
// inventory ID expected by the existing sales workflow.
const getInventoryId = (item) => {
  const rawId = item.id ?? item.inventory_id ?? item.product_id;

  if (rawId === null || rawId === undefined || rawId === "") {
    return NaN;
  }

  const numericId = Number(rawId);

  if (Number.isInteger(numericId) && numericId > 0) {
    return numericId;
  }

  const match = String(rawId).match(/^P0*(\d+)$/i);

  return match ? Number(match[1]) : NaN;
};

// Keeps the recommendation ID separate from the numeric inventory ID.
const getRecommendationId = (item, inventoryId) => {
  const explicitId =
    item.recommendation_id ?? item.sku ?? item.product_code;

  if (explicitId !== null && explicitId !== undefined && explicitId !== "") {
    return String(explicitId);
  }

  const rawId = item.id ?? item.product_id;

  if (/^P\d+$/i.test(String(rawId ?? ""))) {
    return String(rawId);
  }

  if (Number.isInteger(inventoryId) && inventoryId > 0) {
    return `P${String(inventoryId).padStart(3, "0")}`;
  }

  return "";
};

const readJson = async (response) => {
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.error ||
        data.detail ||
        data.message ||
        `Request failed (${response.status}).`
    );
  }

  return data;
};

function NewSale() {
  const [searchParams] = useSearchParams();
  const productIdFromUrl = searchParams.get("productId");
  const autoAddedProductRef = useRef(false);
  const [products, setProducts] = useState([]);
  const [basket, setBasket] = useState([]);
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(null);

  const [similarProducts, setSimilarProducts] = useState([]);
  const [alsoBoughtProducts, setAlsoBoughtProducts] = useState([]);
  const [recommendationLoading, setRecommendationLoading] = useState(false);
  const [recommendationError, setRecommendationError] = useState("");

  // Load the actual inventory from the main Flask backend.
  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API_BASE_URL}/api/products`);
      const data = await readJson(response);

      if (!Array.isArray(data)) {
        throw new Error("The server returned an invalid product list.");
      }

      const formattedProducts = data.map((item) => {
        const id = getInventoryId(item);

        return {
          id,
          recommendationId: getRecommendationId(item, id),
          name: item.product || item.product_name || item.name || "",
          category: item.category || "Uncategorized",
          price: Number(item.unit_price ?? item.price) || 0,
          stock: Number(item.current_stock ?? item.stock) || 0,
        };
      });

      setProducts(formattedProducts);
    } catch (err) {
      setError(err.message || "Unable to load products.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();

    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(query) ||
        product.category.toLowerCase().includes(query)
    );
  }, [products, search]);

  const basketDetails = useMemo(
    () =>
      basket.map((item) => {
        const product = products.find((p) => p.id === item.productId);

        if (!product) {
          return {
            ...item,
            name: "Unavailable product",
            price: 0,
            stock: 0,
            gross: 0,
            discount: 0,
            total: 0,
          };
        }

        const gross = product.price * item.quantity;
        const discount = (gross * item.discountPercent) / 100;

        return {
          ...item,
          name: product.name,
          category: product.category,
          price: product.price,
          stock: product.stock,
          gross,
          discount,
          total: gross - discount,
        };
      }),
    [basket, products]
  );

  const subtotal = basketDetails.reduce(
    (total, item) => total + item.gross,
    0
  );

  const totalDiscount = basketDetails.reduce(
    (total, item) => total + item.discount,
    0
  );

  const totalAmount = basketDetails.reduce(
    (total, item) => total + item.total,
    0
  );

  const totalItems = basket.reduce(
    (total, item) => total + item.quantity,
    0
  );

  // Add products using numeric inventory IDs, not recommendation IDs.
  const addToBasket = (product) => {
    setError("");
    setSuccess(null);

    if (!product || !Number.isInteger(product.id) || product.id <= 0) {
      setError("This product has no valid numeric inventory ID.");
      return;
    }

    if (product.stock < 1) {
      setError(`${product.name} is out of stock.`);
      return;
    }

    setBasket((current) => {
      const existing = current.find(
        (item) => item.productId === product.id
      );

      if (existing) {
        if (existing.quantity >= product.stock) {
          setError(
            `Only ${product.stock} units of ${product.name} are available.`
          );
          return current;
        }

        return current.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      return [
        ...current,
        {
          productId: product.id,
          quantity: 1,
          discountPercent: 0,
        },
      ];
    });
  };

  useEffect(() => {
    if (
      !productIdFromUrl ||
      products.length === 0 ||
      autoAddedProductRef.current
    ) {
      return;
    }

    autoAddedProductRef.current = true;

    const selectedProduct = products.find(
      (product) => String(product.id) === String(productIdFromUrl)
    );

    if (!selectedProduct) {
      setError("The selected inventory product could not be found.");
      return;
    }

    if (selectedProduct.stock < 1) {
      setError(`${selectedProduct.name} is out of stock.`);
      return;
    }

    addToBasket(selectedProduct);
  }, [products, productIdFromUrl]);

  const updateQuantity = (productId, nextQuantity) => {
    setError("");
    setSuccess(null);

    const product = products.find((p) => p.id === productId);

    if (!product) return;

    if (nextQuantity <= 0) {
      setBasket((current) =>
        current.filter((item) => item.productId !== productId)
      );
      return;
    }

    if (!Number.isInteger(nextQuantity) || nextQuantity > product.stock) {
      setError(
        `Quantity cannot exceed the available stock of ${product.stock}.`
      );
      return;
    }

    setBasket((current) =>
      current.map((item) =>
        item.productId === productId
          ? { ...item, quantity: nextQuantity }
          : item
      )
    );
  };

  const updateDiscount = (productId, value) => {
    if (value === "") {
      setBasket((current) =>
        current.map((item) =>
          item.productId === productId
            ? { ...item, discountPercent: 0 }
            : item
        )
      );
      return;
    }

    const discountPercent = Number(value);

    if (!Number.isFinite(discountPercent)) return;

    setSuccess(null);

    setBasket((current) =>
      current.map((item) =>
        item.productId === productId
          ? {
              ...item,
              discountPercent: Math.min(
                100,
                Math.max(0, discountPercent)
              ),
            }
          : item
      )
    );
  };

  const removeFromBasket = (productId) => {
    setBasket((current) =>
      current.filter((item) => item.productId !== productId)
    );
    setError("");
    setSuccess(null);
  };

  // Complete a sale through the existing main Flask backend.
  const completeSale = async () => {
    setError("");
    setSuccess(null);

    if (basket.length === 0) {
      setError("Add at least one product to the basket.");
      return;
    }

    for (const item of basket) {
      const product = products.find((p) => p.id === item.productId);

      if (!product) {
        setError("A product in your basket is no longer available.");
        return;
      }

      if (
        !Number.isInteger(item.quantity) ||
        item.quantity < 1 ||
        item.quantity > product.stock
      ) {
        setError(`Please check the quantity for ${product.name}.`);
        return;
      }
    }

    try {
      setSubmitting(true);

      const payload = {
        items: basket.map((item) => {
          const product = products.find((p) => p.id === item.productId);

          return {
            product_id: item.productId,
            quantity: item.quantity,
            unit_price: product.price,
            discount_percent: item.discountPercent,
          };
        }),
      };

      const response = await fetch(`${API_BASE_URL}/api/sales/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await readJson(response);

      setSuccess({
        message: data.message || "Sale completed successfully!",
        transactionId: data.transaction_id || data.transactionId || "",
        total: totalAmount,
      });

      setBasket([]);
      await loadProducts();
    } catch (err) {
      setError(err.message || "Unable to complete the sale.");
    } finally {
      setSubmitting(false);
    }
  };

  // Use the first item in the basket as the recommendation starting point.
  const recommendationProduct = useMemo(() => {
    if (basket.length === 0) return null;

    return (
      products.find((product) => product.id === basket[0].productId) || null
    );
  }, [basket, products]);

  // Fetch both recommendation types through port 5000.
  const loadRecommendations = useCallback(async () => {
    if (!recommendationProduct?.recommendationId) {
      setSimilarProducts([]);
      setAlsoBoughtProducts([]);
      setRecommendationError("");
      setRecommendationLoading(false);
      return;
    }

    try {
      setRecommendationLoading(true);
      setRecommendationError("");

      const productId = encodeURIComponent(
        recommendationProduct.recommendationId
      );

      const [similarResponse, alsoBoughtResponse] = await Promise.all([
        fetch(
          `${API_BASE_URL}/api/recommendations/product/${productId}?n=5&method=ii_cf`
        ),
        fetch(
          `${API_BASE_URL}/api/recommendations/also-bought/${productId}?n=5`
        ),
      ]);

      const [similarData, alsoBoughtData] = await Promise.all([
        readJson(similarResponse),
        readJson(alsoBoughtResponse),
      ]);

      setSimilarProducts(
        Array.isArray(similarData.recommendations)
          ? similarData.recommendations
          : []
      );

      setAlsoBoughtProducts(
        Array.isArray(alsoBoughtData.recommendations)
          ? alsoBoughtData.recommendations
          : []
      );
    } catch (err) {
      setSimilarProducts([]);
      setAlsoBoughtProducts([]);
      setRecommendationError(
        err.message || "Unable to load recommendations."
      );
    } finally {
      setRecommendationLoading(false);
    }
  }, [recommendationProduct]);

  useEffect(() => {
    loadRecommendations();
  }, [loadRecommendations]);

  // Match P001-style recommendation IDs to the actual inventory products.
  const findInventoryProduct = (recommendation) => {
    const recommendationId = String(recommendation.product_id ?? "");

    return (
      products.find(
        (product) =>
          product.recommendationId.toLowerCase() ===
          recommendationId.toLowerCase()
      ) || null
    );
  };

  const renderRecommendationGroup = (title, description, items) => (
    <div>
      <h3 className="font-semibold text-slate-800">{title}</h3>
      <p className="mb-3 mt-1 text-sm text-gray-500">{description}</p>

      {items.length === 0 ? (
        <p className="rounded-lg bg-gray-50 p-4 text-sm text-gray-500">
          No recommendations available for this product.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item, index) => {
            const matchedProduct = findInventoryProduct(item);

            const basketItem = matchedProduct
              ? basket.find(
                  (entry) => entry.productId === matchedProduct.id
                )
              : null;

            const quantityInBasket = basketItem?.quantity || 0;

            const unavailable =
              !matchedProduct || matchedProduct.stock <= 0;

            const stockLimitReached =
              matchedProduct &&
              quantityInBasket >= matchedProduct.stock;

            return (
              <div
                key={`${title}-${item.product_id}-${index}`}
                className="rounded-xl border border-gray-200 p-4 transition hover:border-purple-300 hover:shadow-sm"
              >
                <h4 className="font-semibold text-slate-800">
                  {matchedProduct?.name ||
                    item.product_name ||
                    item.product_id}
                </h4>

                <p className="mt-1 text-xs text-gray-500">
                  Recommendation ID: {item.product_id}
                </p>

                {typeof item.score === "number" && (
                  <p className="mt-2 text-sm text-purple-700">
                    Similarity score: {item.score.toFixed(3)}
                  </p>
                )}

                {matchedProduct ? (
                  <>
                    <p className="mt-3 font-bold text-slate-900">
                      {formatCurrency(matchedProduct.price)}
                    </p>

                    <p className="mt-1 text-xs text-gray-500">
                      Stock: {matchedProduct.stock}
                    </p>
                  </>
                ) : (
                  <p className="mt-3 text-xs text-amber-700">
                    This recommendation ID has no matching inventory item.
                  </p>
                )}

                <button
                  type="button"
                  onClick={() => {
                    if (matchedProduct) {
                      addToBasket(matchedProduct);
                    }
                  }}
                  disabled={unavailable || stockLimitReached}
                  className="mt-4 w-full rounded-lg bg-purple-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                >
                  {!matchedProduct
                    ? "Not in Inventory"
                    : matchedProduct.stock <= 0
                      ? "Out of Stock"
                      : stockLimitReached
                        ? "Stock Limit Reached"
                        : quantityInBasket > 0
                          ? "Add One More"
                          : "+ Add to Basket"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <Layout>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">New Sale</h1>
          <p className="mt-1 text-gray-500">
            Create a multi-product sale and update inventory in one
            transaction.
          </p>
        </div>

        <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
          <p className="text-sm text-blue-600">Items in basket</p>
          <p className="text-2xl font-bold text-blue-800">{totalItems}</p>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700"
        >
          {error}
        </div>
      )}

      {success && (
        <div
          role="status"
          className="mb-5 rounded-lg border border-green-200 bg-green-50 p-4 text-green-800"
        >
          <p className="font-semibold">{success.message}</p>

          {success.transactionId && (
            <p className="mt-1 text-sm">
              Transaction ID: {success.transactionId}
            </p>
          )}

          <p className="mt-1 text-sm">
            Sale total: {formatCurrency(success.total)}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-5">
        {/* Product selection */}
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm xl:col-span-3">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-slate-800">
              Select Products
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Search by product name or category and add items to the basket.
            </p>
          </div>

          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search products or categories..."
            className="mb-5 w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />

          {loading ? (
            <p className="py-10 text-center text-gray-500">
              Loading products...
            </p>
          ) : filteredProducts.length === 0 ? (
            <div className="rounded-lg bg-gray-50 p-8 text-center text-gray-500">
              {search
                ? "No matching products found."
                : "No products available."}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {filteredProducts.map((product) => {
                const basketItem = basket.find(
                  (item) => item.productId === product.id
                );

                const quantityInBasket = basketItem?.quantity || 0;
                const unavailable =
                  !Number.isInteger(product.id) || product.stock <= 0;

                const limitReached =
                  quantityInBasket >= product.stock;

                return (
                  <div
                    key={`${product.id}-${product.recommendationId}`}
                    className="rounded-xl border border-gray-200 p-4 transition hover:border-blue-300 hover:shadow-sm"
                  >
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-slate-800">
                          {product.name}
                        </h3>
                        <p className="mt-1 text-xs text-gray-500">
                          {product.category}
                        </p>
                      </div>

                      <span
                        className={`whitespace-nowrap rounded-full px-2 py-1 text-xs font-medium ${
                          unavailable
                            ? "bg-red-100 text-red-700"
                            : product.stock <= 5
                              ? "bg-amber-100 text-amber-700"
                              : "bg-green-100 text-green-700"
                        }`}
                      >
                        Stock: {product.stock}
                      </span>
                    </div>

                    <p className="mb-3 text-lg font-bold text-slate-900">
                      {formatCurrency(product.price)}
                    </p>

                    {quantityInBasket > 0 && (
                      <p className="mb-2 text-sm text-blue-700">
                        {quantityInBasket} already in basket
                      </p>
                    )}

                    <button
                      type="button"
                      onClick={() => addToBasket(product)}
                      disabled={unavailable || limitReached}
                      className="w-full rounded-lg bg-blue-600 px-3 py-2 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                    >
                      {unavailable
                        ? "Invalid ID or Out of Stock"
                        : limitReached
                          ? "Stock Limit Reached"
                          : "+ Add to Basket"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Basket and bill */}
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm xl:col-span-2">
          <div className="mb-4 flex items-center justify-between gap-2">
            <div>
              <h2 className="text-xl font-semibold text-slate-800">
                Current Basket
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                {basket.length} unique product
                {basket.length === 1 ? "" : "s"}
              </p>
            </div>

            {basket.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setBasket([]);
                  setError("");
                  setSuccess(null);
                }}
                className="text-sm font-medium text-red-600 hover:text-red-800"
              >
                Clear basket
              </button>
            )}
          </div>

          {basketDetails.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-gray-200 px-4 py-10 text-center">
              <p className="font-medium text-gray-600">
                Your basket is empty
              </p>
              <p className="mt-1 text-sm text-gray-400">
                Add products from the list to start a sale.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {basketDetails.map((item) => (
                <div
                  key={item.productId}
                  className="border-b border-gray-100 pb-4 last:border-b-0"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-slate-800">
                        {item.name}
                      </h3>
                      <p className="mt-1 text-sm text-gray-500">
                        {formatCurrency(item.price)} per unit
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeFromBasket(item.productId)}
                      aria-label={`Remove ${item.name}`}
                      className="text-sm text-red-500 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          updateQuantity(
                            item.productId,
                            item.quantity - 1
                          )
                        }
                        aria-label={`Decrease ${item.name} quantity`}
                        className="h-8 w-8 rounded-lg border border-gray-300 font-semibold hover:bg-gray-100"
                      >
                        −
                      </button>

                      <input
                        type="number"
                        min="1"
                        max={item.stock}
                        step="1"
                        value={item.quantity}
                        aria-label={`${item.name} quantity`}
                        onChange={(event) => {
                          const value = event.target.value;
                          if (value === "") return;

                          updateQuantity(
                            item.productId,
                            Number(value)
                          );
                        }}
                        className="w-16 rounded-lg border border-gray-300 px-2 py-1.5 text-center"
                      />

                      <button
                        type="button"
                        onClick={() =>
                          updateQuantity(
                            item.productId,
                            item.quantity + 1
                          )
                        }
                        disabled={item.quantity >= item.stock}
                        aria-label={`Increase ${item.name} quantity`}
                        className="h-8 w-8 rounded-lg border border-gray-300 font-semibold hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        +
                      </button>
                    </div>

                    <p className="font-semibold text-slate-800">
                      {formatCurrency(item.total)}
                    </p>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3">
                    <label
                      htmlFor={`discount-${item.productId}`}
                      className="text-sm text-gray-600"
                    >
                      Discount (%)
                    </label>

                    <input
                      id={`discount-${item.productId}`}
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={item.discountPercent}
                      onChange={(event) =>
                        updateDiscount(
                          item.productId,
                          event.target.value
                        )
                      }
                      className="w-20 rounded-lg border border-gray-300 px-2 py-1.5 text-right"
                    />
                  </div>

                  {item.discount > 0 && (
                    <p className="mt-1 text-right text-xs text-green-700">
                      You save {formatCurrency(item.discount)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="mt-5 space-y-3 border-t border-gray-200 pt-4">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>

            <div className="flex justify-between text-sm text-green-700">
              <span>Total discount</span>
              <span>− {formatCurrency(totalDiscount)}</span>
            </div>

            <div className="flex items-center justify-between border-t border-gray-100 pt-3">
              <span className="font-semibold text-slate-800">
                Grand Total
              </span>
              <span className="text-2xl font-bold text-blue-700">
                {formatCurrency(totalAmount)}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={completeSale}
            disabled={loading || submitting || basket.length === 0}
            className="mt-5 w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            {submitting ? "Processing Sale..." : "Complete Sale"}
          </button>

          <p className="mt-3 text-center text-xs text-gray-400">
            Stock is revalidated by the backend when the sale is submitted.
          </p>
        </section>
      </div>

      {/* Smart Product Recommendations */}
      <section className="mt-6 rounded-2xl border border-purple-100 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-purple-100 p-3 text-purple-700">
            <span aria-hidden="true" className="text-xl">
              ✦
            </span>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-slate-800">
              Smart Product Recommendations
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Product similarity and frequently bought-together suggestions.
            </p>

            {recommendationProduct && (
              <p className="mt-2 text-sm text-purple-700">
                Recommendations for: {recommendationProduct.name}
                {" ("}
                {recommendationProduct.recommendationId || "No mapped ID"}
                {")"}
              </p>
            )}
          </div>
        </div>

        {!recommendationProduct ? (
          <p className="mt-5 rounded-lg bg-gray-50 p-4 text-sm text-gray-500">
            Add a product to your basket to see recommendations.
          </p>
        ) : recommendationLoading ? (
          <p className="mt-5 py-6 text-center text-gray-500">
            Loading smart recommendations...
          </p>
        ) : recommendationError ? (
          <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-700">
              {recommendationError}
            </p>

            <button
              type="button"
              onClick={loadRecommendations}
              className="mt-2 text-sm font-semibold text-red-700 underline"
            >
              Try again
            </button>
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            {renderRecommendationGroup(
              "Similar Products",
              "Products similar to the selected item.",
              similarProducts
            )}

            {renderRecommendationGroup(
              "Frequently Bought Together",
              "Products customers often purchase together.",
              alsoBoughtProducts
            )}
          </div>
        )}
      </section>
    </Layout>
  );
}

export default NewSale;
