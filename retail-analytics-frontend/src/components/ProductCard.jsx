import { FaEdit, FaTrash, FaEye } from "react-icons/fa";

function ProductCard({ product }) {
  const isLowStock = product.stock < 20;

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition duration-300">

      <img
        src={product.image}
        alt={product.name}
        className="w-full h-48 object-cover"
      />

      <div className="p-5">

        <h2 className="text-xl font-bold">{product.name}</h2>

        <p className="text-gray-500 mt-1">
          {product.category}
        </p>

        <p className="text-2xl font-bold text-blue-600 mt-3">
          ₹{product.price}
        </p>

        <div className="mt-3">
          {isLowStock ? (
            <span className="bg-red-100 text-red-600 px-3 py-1 rounded-full">
              Low Stock ({product.stock})
            </span>
          ) : (
            <span className="bg-green-100 text-green-600 px-3 py-1 rounded-full">
              In Stock ({product.stock})
            </span>
          )}
        </div>

        <div className="flex justify-between mt-6">

          <button className="text-blue-600 hover:text-blue-800">
            <FaEye size={20} />
          </button>

          <button className="text-green-600 hover:text-green-800">
            <FaEdit size={20} />
          </button>

          <button className="text-red-600 hover:text-red-800">
            <FaTrash size={20} />
          </button>

        </div>

      </div>

    </div>
  );
}

export default ProductCard;