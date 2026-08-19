import { useState, useEffect } from "react";

function ProductModal({ isOpen, onClose, onSave, product }) {
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    price: "",
    stock: "",
    image: "",
    reason: "Purchase", // Default reason for stock change
  });

  useEffect(() => {
    if (product) {
      setFormData({
        ...product,
        reason: "Purchase", // Default reason when editing
      });
    } else {
      setFormData({
        name: "",
        category: "",
        price: "",
        stock: "",
        image: "",
        reason: "Purchase",
      });
    }
  }, [product]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
      <div className="bg-white w-[500px] rounded-xl p-6">
        <h2 className="text-2xl font-bold mb-6">
          {product ? "Edit Product" : "Add Product"}
        </h2>

        <div className="space-y-4">
          <input
            type="text"
            name="name"
            placeholder="Product Name"
            value={formData.name}
            onChange={handleChange}
            className="w-full border p-3 rounded-lg"
          />

          <select
            name="category"
            value={formData.category}
            onChange={handleChange}
            className="w-full border p-3 rounded-lg"
          >
            <option value="">Select Category</option>
            <option value="Electronics">Electronics</option>
            <option value="Accessories">Accessories</option>
            <option value="Furniture">Furniture</option>
            <option value="Clothing">Clothing</option>
            <option value="Books">Books</option>
            <option value="Home Appliances">Home Appliances</option>
          </select>

          <input
            type="number"
            name="price"
            placeholder="Price"
            value={formData.price}
            onChange={handleChange}
            className="w-full border p-3 rounded-lg"
          />

          <input
            type="number"
            name="stock"
            placeholder="Stock"
            value={formData.stock}
            onChange={handleChange}
            className="w-full border p-3 rounded-lg"
          />

          {/* Reason Selector for Blockchain Ledger logging */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">
              Stock Change Reason (Logged to Blockchain)
            </label>
            <select
              name="reason"
              value={formData.reason}
              onChange={handleChange}
              className="w-full border p-3 rounded-lg bg-gray-50"
            >
              <option value="Purchase">Purchase (Restock)</option>
              <option value="Sell">Sell (Customer Sale)</option>
              <option value="Defect">Defect (Damaged/Returned)</option>
            </select>
          </div>

          <input
            type="text"
            name="image"
            placeholder="Image URL"
            value={formData.image}
            onChange={handleChange}
            className="w-full border p-3 rounded-lg"
          />
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-gray-300 rounded-lg"
          >
            Cancel
          </button>

          <button
            onClick={() => onSave(formData)}
            className="px-5 py-2 bg-blue-600 text-white rounded-lg"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

export default ProductModal;
