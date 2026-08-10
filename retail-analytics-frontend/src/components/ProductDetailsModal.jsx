function ProductDetailsModal({ product, onClose }) {
  if (!product) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">

      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">

        {/* Header */}
        <div className="flex justify-between items-center mb-6">

          <h2 className="text-2xl font-bold">
            Product Details
          </h2>

          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800 text-xl"
          >
            ✕
          </button>

        </div>

        {/* Product Image */}
        {product.image && (
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-48 object-cover rounded-lg mb-5"
          />
        )}

        {/* Details */}
        <div className="space-y-4">

          <div>
            <p className="text-sm text-gray-500">
              Product Name
            </p>

            <p className="font-semibold">
              {product.name}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">
              Category
            </p>

            <p className="font-semibold">
              {product.category}
            </p>
          </div>

          <div className="flex justify-between">

            <div>
              <p className="text-sm text-gray-500">
                Price
              </p>

              <p className="font-semibold text-blue-600">
                ₹{product.price}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">
                Stock
              </p>

              <p className="font-semibold">
                {product.stock}
              </p>
            </div>

          </div>

          <div>
            <p className="text-sm text-gray-500">
              Reorder Level
            </p>

            <p className="font-semibold">
              {product.reorderLevel}
            </p>
          </div>

        </div>

        {/* Close */}
        <button
          onClick={onClose}
          className="w-full mt-6 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
        >
          Close
        </button>

      </div>

    </div>
  );
}

export default ProductDetailsModal;