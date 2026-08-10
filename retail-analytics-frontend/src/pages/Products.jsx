
import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import ProductCard from "../components/ProductCard";
import { loadInventoryData } from "../utils/loadInventoryData";
import ProductModal from "../components/ProductModal";
import ProductDetailsModal from "../components/ProductDetailsModal";
import DeleteModal from "../components/DeleteModal";

function Products() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [viewProduct, setViewProduct] = useState(null);
  const [deleteProduct, setDeleteProduct] = useState(null);

  // Load products from CSV
  useEffect(() => {
    loadInventoryData()
      .then((data) => {
        const formattedProducts = data.map((item) => ({
          id: Number(item.product_id),
          name: item.product,
          category: item.category,
          price: Number(item.unit_price),
          stock: Number(item.current_stock),
          reorderLevel: Number(item.reorder_level),
          image: item.image || "",
        }));

        setProducts(formattedProducts);
      })
      .catch((error) => {
        console.error("CSV ERROR:", error);
      });
  }, []);

  // Search products
  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(search.toLowerCase())
  );

  // Save product (Add / Edit)
  const handleSave = (product) => {
    const formattedProduct = {
      ...product,
      price: Number(product.price),
      stock: Number(product.stock),
      reorderLevel: Number(product.reorderLevel || 20),
    };

    if (selectedProduct) {
      // EDIT PRODUCT
      setProducts((currentProducts) =>
        currentProducts.map((p) =>
          p.id === selectedProduct.id
            ? {
                ...p,
                ...formattedProduct,
                id: selectedProduct.id,
              }
            : p
        )
      );
    } else {
      // ADD NEW PRODUCT
      setProducts((currentProducts) => [
        ...currentProducts,
        {
          ...formattedProduct,
          id: Date.now(),
        },
      ]);
    }

    // Close modal
    setIsModalOpen(false);
    setSelectedProduct(null);
  };

  const handleDelete = () => {
    if (!deleteProduct) return;

    setProducts((currentProducts) =>
      currentProducts.filter(
        (product) => product.id !== deleteProduct.id
      )
    );

    setDeleteProduct(null);
  };

  // Edit product
  const handleEdit = (product) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  return (
    <Layout>
      {/* Page Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">
            Products
          </h1>

          <p className="text-gray-500">
            Manage your retail products and inventory
          </p>
        </div>
      </div>

      {/* Add Product Button */}
      <div className="flex justify-end mb-6">
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

      {/* Search */}
      <input
        type="text"
        placeholder="Search products..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="border rounded-lg px-4 py-2 w-full mb-8"
      />

      {/* Product Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {filteredProducts.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onEdit={handleEdit}
            onDelete={(product) => setDeleteProduct(product)}
            onView={(product) => setViewProduct(product)}
          />
        ))}
      </div>

      {/* Product Modal */}
      <ProductModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedProduct(null);
        }}
        onSave={handleSave}
        product={selectedProduct}
      />
      <ProductDetailsModal
        product={viewProduct}
        onClose={() => setViewProduct(null)}
      />
      <DeleteModal
        product={deleteProduct}
        onClose={() => setDeleteProduct(null)}
        onConfirm={handleDelete}
      />
    </Layout>
  );
}

export default Products;

