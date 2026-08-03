import { useState } from "react";
import Layout from "../components/Layout";
import ProductCard from "../components/ProductCard";
import ProductModal from "../components/ProductModal";
import ViewProductModal from "../components/ViewProductModal";

const productData = [
  {
    id: 1,
    name: "Wireless Mouse",
    category: "Electronics",
    price: 599,
    stock: 120,
    image:
      "https://static.vecteezy.com/system/resources/thumbnails/067/697/759/small/the-gray-wireless-mouse-features-colorful-led-light-accents-on-its-contours-offering-a-modern-design-for-everyday-use-png.png",
  },
  {
    id: 2,
    name: "Laptop",
    category: "Electronics",
    price: 45000,
    stock: 15,
    image:
      "https://images.rawpixel.com/image_png_800/cHJpdmF0ZS9sci9pbWFnZXMvd2Vic2l0ZS8yMDIzLTA5L3Jhd3BpeGVsX29mZmljZV8zMV9waG90b19vZl9hX2xhcHRvcF9tb2NrdXBfY2xvc2UtdXBfbWluaW1hbF9pc182M2Q2NzViOS00YjlhLTQ3OWEtOGMyMS1hYWQwMjViNWYzZDIucG5n.png",
  },
  {
    id: 3,
    name: "Office Chair",
    category: "Furniture",
    price: 3200,
    stock: 42,
    image:
      "https://img.pikbest.com/png-images/20241124/white-modern-office-chair-with-ergonomic-design-isolated-on-a-pure-backdrop_11129282.png!sw800",
  },
  {
    id: 4,
    name: "USB Cable",
    category: "Accessories",
    price: 299,
    stock: 8,
    image:
      "https://w7.pngwing.com/pngs/152/351/png-transparent-oneplus-3t-battery-charger-quick-charge-electrical-cable-usb-electronics-adapter-cable-thumbnail.png",
  },
];

function Products() {
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState(productData);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [viewProduct, setViewProduct] = useState(null);

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = (product) => {
    const newProduct = {
      ...product,
      price: Number(product.price),
      stock: Number(product.stock),
    };

    if (selectedProduct) {
      // Edit existing product
      setProducts(
        products.map((p) =>
          p.id === selectedProduct.id
            ? { ...newProduct, id: selectedProduct.id }
            : p
        )
      );
    } else {
      // Add new product
      setProducts([
        ...products,
        {
          ...newProduct,
          id: Date.now(),
        },
      ]);
    }

    setSelectedProduct(null);
    setIsModalOpen(false);
  };

  const handleView = (product) => {
      setViewProduct(product);
  };

  const handleDelete = (id) => {

      if(window.confirm("Delete this product?")){

          setProducts(
              products.filter(product => product.id !== id)
          );

      }

  };

  return (
    <Layout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Products</h1>

        <button
          onClick={() => {
            setSelectedProduct(null);
            setIsModalOpen(true);
          }}
          className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700"
        >
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
            onEdit={(product) => {
              setSelectedProduct(product);
              setIsModalOpen(true);
            }}
            onView={handleView}
            onDelete={handleDelete}
          />
        ))}
      </div>

      <ProductModal
        isOpen={isModalOpen}
        onClose={() => {
          setSelectedProduct(null);
          setIsModalOpen(false);
        }}
        onSave={handleSave}
        product={selectedProduct}
      />

      <ViewProductModal
          product={viewProduct}
          onClose={() => setViewProduct(null)}
      />
    </Layout>
  );
}

export default Products;