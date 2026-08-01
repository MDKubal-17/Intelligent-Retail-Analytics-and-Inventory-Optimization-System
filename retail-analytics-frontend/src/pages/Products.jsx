import { useState } from "react";
import Layout from "../components/Layout";
import ProductCard from "../components/ProductCard";

const productData = [
  {
    id: 1,
    name: "Wireless Mouse",
    category: "Electronics",
    price: 599,
    stock: 120,
    image: "https://picsum.photos/300/200?random=1",
  },
  {
    id: 2,
    name: "Laptop",
    category: "Electronics",
    price: 45000,
    stock: 15,
    image: "https://picsum.photos/300/200?random=2",
  },
  {
    id: 3,
    name: "Office Chair",
    category: "Furniture",
    price: 3200,
    stock: 42,
    image: "https://picsum.photos/300/200?random=3",
  },
  {
    id: 4,
    name: "USB Cable",
    category: "Accessories",
    price: 299,
    stock: 8,
    image: "https://picsum.photos/300/200?random=4",
  },
];

function Products() {
  const [search, setSearch] = useState("");

  const filteredProducts = productData.filter((product) =>
    product.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Layout>

      <div className="flex justify-between items-center mb-6">

        <h1 className="text-3xl font-bold">
          Products
        </h1>

        <button className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700">
          + Add Product
        </button>

      </div>

      <input
        type="text"
        placeholder="Search products..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="border rounded-lg px-4 py-2 w-full mb-8"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

        {filteredProducts.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
          />
        ))}

      </div>

    </Layout>
  );
}

export default Products;