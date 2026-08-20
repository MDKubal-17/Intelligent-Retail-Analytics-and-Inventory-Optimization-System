// import {
//   FaEye,
//   FaEdit,
//   FaTrash,
// } from "react-icons/fa";

// function ProductCard({
//   product,
//   onView,
//   onEdit,
//   onDelete,
// }) {
//   return (
//     <div className="bg-white rounded-xl shadow-md overflow-hidden">

//       {/* Product Image */}
//       <div className="h-40 bg-gray-100 flex items-center justify-center">

//         {product.image ? (
//           <img
//             src={product.image}
//             alt={product.name}
//             className="w-full h-full object-cover"
//           />
//         ) : (
//           <span className="text-gray-400">
//             No Image
//           </span>
//         )}

//       </div>

//       {/* Product Information */}
//       <div className="p-5">

//         <h2 className="text-xl font-bold">
//           {product.name}
//         </h2>

//         <p className="text-gray-500 mt-1">
//           {product.category}
//         </p>

//         <div className="flex justify-between items-center mt-4">

//           <span className="text-xl font-bold text-blue-600">
//             ₹{product.price}
//           </span>

//           <span
//             className={`px-3 py-1 rounded-full text-sm ${
//               product.stock <= product.reorderLevel
//                 ? "bg-red-100 text-red-600"
//                 : "bg-green-100 text-green-600"
//             }`}
//           >
//             {product.stock <= product.reorderLevel
//               ? `Low Stock (${product.stock})`
//               : `In Stock (${product.stock})`}
//           </span>

//         </div>

//         {/* Buttons */}
//         <div className="flex justify-end gap-4 mt-5">

//           <button
//             onClick={() => onView && onView(product)}
//             className="text-blue-600 hover:text-blue-800"
//           >
//             <FaEye />
//           </button>

//           <button
//             onClick={() => onEdit && onEdit(product)}
//             className="text-green-600 hover:text-green-800"
//           >
//             <FaEdit />
//           </button>

//           <button
//             onClick={() => onDelete && onDelete(product)}
//             className="text-red-600 hover:text-red-800"
//           >
//             <FaTrash />
//           </button>

//         </div>

//       </div>

//     </div>
//   );
// }

// export default ProductCard;

import {
  FaEye,
  FaEdit,
  FaTrash,
} from "react-icons/fa";

function ProductCard({
  product,
  onView,
  onEdit,
  onDelete,
}) {
  // Check all possible image key variants
  const imageUrl = product?.image || product?.img_url || product?.img || "";

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden">

      {/* Product Image */}
      <div className="h-40 bg-gray-100 flex items-center justify-center overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={product.name || "Product"}
            className="w-full h-full object-cover"
            onError={(e) => {
              // If hotlinking fails or URL returns 403/404, fallback to placeholder
              e.target.onerror = null;
              e.target.src = "https://via.placeholder.com/300x200?text=Image+Unavailable";
            }}
          />
        ) : (
          <span className="text-gray-400 font-medium">
            No Image
          </span>
        )}
      </div>

      {/* Product Information */}
      <div className="p-5">

        <h2 className="text-xl font-bold truncate">
          {product.name}
        </h2>

        <p className="text-gray-500 mt-1 text-sm">
          {product.category}
        </p>

        <div className="flex justify-between items-center mt-4">

          <span className="text-xl font-bold text-blue-600">
            ₹{product.price}
          </span>

          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold ${
              product.stock <= product.reorderLevel
                ? "bg-red-100 text-red-600"
                : "bg-green-100 text-green-600"
            }`}
          >
            {product.stock <= product.reorderLevel
              ? `Low Stock (${product.stock})`
              : `In Stock (${product.stock})`}
          </span>

        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-4 mt-5">

          <button
            onClick={() => onView && onView(product)}
            className="text-blue-600 hover:text-blue-800 transition-colors"
            title="View Details"
          >
            <FaEye />
          </button>

          <button
            onClick={() => onEdit && onEdit(product)}
            className="text-green-600 hover:text-green-800 transition-colors"
            title="Edit Product"
          >
            <FaEdit />
          </button>

          <button
            onClick={() => onDelete && onDelete(product)}
            className="text-red-600 hover:text-red-800 transition-colors"
            title="Delete Product"
          >
            <FaTrash />
          </button>

        </div>

      </div>

    </div>
  );
}

export default ProductCard;
