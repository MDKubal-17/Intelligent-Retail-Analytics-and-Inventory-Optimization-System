import { FaEdit, FaTrash } from "react-icons/fa";
import { useState } from "react";


const products = [
  {
    id: 101,
    name: "Wireless Mouse",
    category: "Electronics",
    stock: 120,
    price: "₹599",
  },
  {
    id: 102,
    name: "Laptop",
    category: "Electronics",
    stock: 15,
    price: "₹45,000",
  },
  {
    id: 103,
    name: "Office Chair",
    category: "Furniture",
    stock: 40,
    price: "₹3,200",
  },
  {
    id: 104,
    name: "USB Cable",
    category: "Accessories",
    stock: 8,
    price: "₹299",
  },
];





function ProductTable() {

    const [search, setSearch] = useState("");
    const [category, setCategory] = useState("All");

    const filteredProducts = products.filter((product) => {
        const matchesSearch = product.name
            .toLowerCase()
            .includes(search.toLowerCase());

        const matchesCategory =
            category === "All" || product.category === category;

        return matchesSearch && matchesCategory;
    });


  return (
    <div className="bg-white rounded-xl shadow-md p-6">

      {/* Header */}
      <div className="flex justify-between items-center mb-6">

        <input
            type="text"
            placeholder="Search Product..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border rounded-lg px-4 py-2 w-72"
        />

        <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="border rounded-lg px-4 py-2"
        >
            <option>All</option>
            <option>Electronics</option>
            <option>Furniture</option>
            <option>Accessories</option>
        </select>

        <button className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700">
          + Add Product
        </button>

      </div>

      {/* Table */}
      <table className="w-full">

        <thead className="bg-gray-100">

          <tr>
            <th className="p-3 text-left">Product</th>
            <th className="p-3 text-left">ID</th>
            <th className="p-3 text-left">Category</th>
            <th className="p-3 text-left">Stock</th>
            <th className="p-3 text-left">Price</th>
            <th className="p-3 text-left">Status</th>
            <th className="p-3 text-left">Action</th>
          </tr>

        </thead>

        <tbody>

          {filteredProducts.map((product) => (

            <tr
              key={product.id}
              className="border-b hover:bg-gray-50"
            >

              <td className="p-3">{product.name}</td>

              <td className="p-3">{product.id}</td>

              <td className="p-3">{product.category}</td>

              <td className="p-3">{product.stock}</td>

              <td className="p-3">{product.price}</td>

              <td className="p-3">

                {product.stock < 20 ? (
                  <span className="bg-red-100 text-red-600 px-3 py-1 rounded-full">
                    Low Stock
                  </span>
                ) : (
                  <span className="bg-green-100 text-green-600 px-3 py-1 rounded-full">
                    In Stock
                  </span>
                )}

              </td>

              <td className="p-3 flex gap-4">

                <FaEdit className="text-blue-600 cursor-pointer" />

                <FaTrash className="text-red-600 cursor-pointer" />

              </td>

            </tr>

          ))}

        </tbody>

      </table>

    </div>
  );
}

export default ProductTable;