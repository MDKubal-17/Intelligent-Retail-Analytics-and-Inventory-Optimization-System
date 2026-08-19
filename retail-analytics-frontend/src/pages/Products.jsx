
// import { useEffect, useState } from "react";
// import Layout from "../components/Layout";
// import ProductCard from "../components/ProductCard";
// import ProductModal from "../components/ProductModal";
// import ProductDetailsModal from "../components/ProductDetailsModal";
// import DeleteModal from "../components/DeleteModal";

// const API_BASE_URL = import.meta.env.VITE_FLASK_API_URL || "https://retail-analytics-backend-md.onrender.com"

// function Products() {
//   const [products, setProducts] = useState([]);
//   const [search, setSearch] = useState("");
//   const [isModalOpen, setIsModalOpen] = useState(false);
//   const [selectedProduct, setSelectedProduct] = useState(null);
//   const [viewProduct, setViewProduct] = useState(null);
//   const [deleteProduct, setDeleteProduct] = useState(null);

//   // ==========================================
//   // LOAD PRODUCTS FROM FLASK BACKEND
//   // ==========================================

//   useEffect(() => {
//     fetch(`${API_BASE_URL}/api/products`)
//       .then((response) => {
//         if (!response.ok) {
//           throw new Error("Failed to fetch products");
//         }

//         return response.json();
//       })
//       .then((data) => {
//         console.log("Products from backend:", data);

//         const formattedProducts = data.map((item) => ({
//           id: Number(item.id),
//           name: item.product || "",
//           category: item.category || "",
//           price: Number(item.unit_price) || 0,
//           stock: Number(item.current_stock) || 0,
//           reorderLevel: Number(item.reorder_level) || 20,
//           inventoryValue: Number(item.inventory_value) || 0,
//           status: item.status || "",
//           image: item.image || "",
//         }));

//         setProducts(formattedProducts);
//       })
//       .catch((error) => {
//         console.error("BACKEND ERROR:", error);
//       });
//   }, []);

//   // ==========================================
//   // SEARCH
//   // ==========================================

//   const filteredProducts = products.filter((product) =>
//     (product.name || "")
//       .toLowerCase()
//       .includes(search.toLowerCase())
//   );

//   // ==========================================
//   // SAVE PRODUCT - ADD / EDIT
//   // ==========================================

//   const handleSave = async (product) => {
//     try {
//       // Convert values safely
//       const price = Number(product.price);
//       const stock = Number(product.stock);

//       // If reorder level is missing, "-", undefined, etc.
//       // use 20 as default.
//       const reorderLevel =
//         Number.isFinite(Number(product.reorderLevel)) &&
//         product.reorderLevel !== ""
//           ? Number(product.reorderLevel)
//           : 20;

//       // Validate numbers
//       if (!Number.isFinite(price)) {
//         throw new Error("Please enter a valid price.");
//       }

//       if (!Number.isFinite(stock)) {
//         throw new Error("Please enter a valid stock value.");
//       }

//       // ========================================
//       // DATA SENT TO BACKEND
//       // ========================================

//       const payload = {
//         product: product.name?.trim() || "",
//         category: product.category || "",
//         current_stock: stock,
//         reorder_level: reorderLevel,
//         unit_price: price,
//       };

//       console.log("Sending to backend:", payload);

//       // ========================================
//       // EDIT PRODUCT
//       // ========================================

//       if (selectedProduct) {
//         const response = await fetch(
//           `http://127.0.0.1:5000/api/products/${selectedProduct.id}`,
//           {
//             method: "PUT",
//             headers: {
//               "Content-Type": "application/json",
//             },
//             body: JSON.stringify(payload),
//           }
//         );

//         const data = await response.json();

//         if (!response.ok) {
//           throw new Error(
//             data.error || "Failed to update product"
//           );
//         }

//         console.log("Product updated:", data);

//         // Calculate values for immediate UI update
//         const inventoryValue = stock * price;

//         const status =
//           stock <= reorderLevel
//             ? "Low Stock"
//             : "In Stock";

//         setProducts((currentProducts) =>
//           currentProducts.map((p) =>
//             p.id === selectedProduct.id
//               ? {
//                   ...p,
//                   name: payload.product,
//                   category: payload.category,
//                   price: price,
//                   stock: stock,
//                   reorderLevel: reorderLevel,
//                   inventoryValue: inventoryValue,
//                   status: status,
//                 }
//               : p
//           )
//         );
//       }

//       // ========================================
//       // ADD PRODUCT
//       // ========================================

//       else {
//         const response = await fetch(
//           "http://127.0.0.1:5000/api/products",
//           {
//             method: "POST",
//             headers: {
//               "Content-Type": "application/json",
//             },
//             body: JSON.stringify(payload),
//           }
//         );

//         const data = await response.json();

//         if (!response.ok) {
//           throw new Error(
//             data.error || "Failed to add product"
//           );
//         }

//         console.log("Product added:", data);

//         const newProduct = data.product;

//         setProducts((currentProducts) => [
//           ...currentProducts,
//           {
//             id: Number(newProduct.product_id),
//             name: newProduct.product,
//             category: newProduct.category,
//             price: Number(newProduct.unit_price),
//             stock: Number(newProduct.current_stock),
//             reorderLevel:
//               Number(newProduct.reorder_level) || 20,
//             inventoryValue:
//               Number(newProduct.inventory_value) || 0,
//             status: newProduct.status || "",
//             image: "",
//           },
//         ]);
//       }

//       // Close modal
//       setSelectedProduct(null);
//       setIsModalOpen(false);
//     } catch (error) {
//       console.error("SAVE PRODUCT ERROR:", error);
//       alert(error.message);
//     }
//   };

//   // ==========================================
//   // DELETE PRODUCT
//   // ==========================================

//   const handleDelete = async () => {
//     if (!deleteProduct) return;

//     try {
//       const response = await fetch(
//         `http://127.0.0.1:5000/api/products/${deleteProduct.id}`,
//         {
//           method: "DELETE",
//         }
//       );

//       const data = await response.json();

//       if (!response.ok) {
//         throw new Error(
//           data.error || "Failed to delete product"
//         );
//       }

//       console.log("Deleted:", data);

//       // Remove from screen
//       setProducts((currentProducts) =>
//         currentProducts.filter(
//           (product) =>
//             product.id !== deleteProduct.id
//         )
//       );

//       // Close popup
//       setDeleteProduct(null);
//     } catch (error) {
//       console.error("DELETE ERROR:", error);
//       alert(error.message);
//     }
//   };

//   // ==========================================
//   // EDIT PRODUCT
//   // ==========================================

//   const handleEdit = (product) => {
//     setSelectedProduct(product);
//     setIsModalOpen(true);
//   };

//   // ==========================================
//   // RETURN UI
//   // ==========================================

//   return (
//     <Layout>

//       {/* Page Header */}
//       <div className="flex justify-between items-center mb-6">
//         <div>
//           <h1 className="text-3xl font-bold">
//             Products
//           </h1>

//           <p className="text-gray-500">
//             Manage your retail products and inventory
//           </p>
//         </div>
//       </div>

//       {/* Add Product Button */}
//       <div className="flex justify-end mb-6">
//         <button
//           onClick={() => {
//             setSelectedProduct(null);
//             setIsModalOpen(true);
//           }}
//           className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700"
//         >
//           + Add Product
//         </button>
//       </div>

//       {/* Search */}
//       <input
//         type="text"
//         placeholder="Search products..."
//         value={search}
//         onChange={(e) =>
//           setSearch(e.target.value)
//         }
//         className="border rounded-lg px-4 py-2 w-full mb-8"
//       />

//       {/* Product Grid */}
//       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

//         {filteredProducts.map((product) => (
//           <ProductCard
//             key={product.id}
//             product={product}

//             onEdit={handleEdit}

//             onDelete={(product) =>
//               setDeleteProduct(product)
//             }

//             onView={(product) =>
//               setViewProduct(product)
//             }
//           />
//         ))}

//       </div>

//       {/* Add / Edit Modal */}
//       <ProductModal
//         isOpen={isModalOpen}

//         onClose={() => {
//           setIsModalOpen(false);
//           setSelectedProduct(null);
//         }}

//         onSave={handleSave}

//         product={selectedProduct}
//       />

//       {/* View Product Modal */}
//       <ProductDetailsModal
//         product={viewProduct}
//         onClose={() =>
//           setViewProduct(null)
//         }
//       />

//       {/* Delete Confirmation */}
//       <DeleteModal
//         product={deleteProduct}

//         onClose={() =>
//           setDeleteProduct(null)
//         }

//         onConfirm={handleDelete}
//       />

//     </Layout>
//   );
// }

// export default Products;

import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import ProductCard from "../components/ProductCard";
import ProductModal from "../components/ProductModal";
import ProductDetailsModal from "../components/ProductDetailsModal";
import DeleteModal from "../components/DeleteModal";

const API_BASE_URL = import.meta.env.VITE_FLASK_API_URL || "https://retail-analytics-backend-md.onrender.com";

function Products() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [viewProduct, setViewProduct] = useState(null);
  const [deleteProduct, setDeleteProduct] = useState(null);

  // ==========================================
  // LOAD PRODUCTS FROM FLASK BACKEND
  // ==========================================

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/products`)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to fetch products");
        }
        return response.json();
      })
      .then((data) => {
        console.log("Products from backend:", data);

        const formattedProducts = data.map((item) => ({
          id: Number(item.id),
          name: item.product || "",
          category: item.category || "",
          price: Number(item.unit_price) || 0,
          stock: Number(item.current_stock) || 0,
          reorderLevel: Number(item.reorder_level) || 20,
          inventoryValue: Number(item.inventory_value) || 0,
          status: item.status || "",
          image: item.image || "",
        }));

        setProducts(formattedProducts);
      })
      .catch((error) => {
        console.error("BACKEND ERROR:", error);
      });
  }, []);

  // ==========================================
  // SEARCH
  // ==========================================

  const filteredProducts = products.filter((product) =>
    (product.name || "").toLowerCase().includes(search.toLowerCase())
  );

  // ==========================================
  // SAVE PRODUCT - ADD / EDIT
  // ==========================================

  const handleSave = async (product) => {
    try {
      const price = Number(product.price);
      const stock = Number(product.stock);

      const reorderLevel =
        Number.isFinite(Number(product.reorderLevel)) &&
        product.reorderLevel !== ""
          ? Number(product.reorderLevel)
          : 20;

      if (!Number.isFinite(price)) {
        throw new Error("Please enter a valid price.");
      }

      if (!Number.isFinite(stock)) {
        throw new Error("Please enter a valid stock value.");
      }

      const payload = {
        product: product.name?.trim() || "",
        category: product.category || "",
        current_stock: stock,
        reorder_level: reorderLevel,
        unit_price: price,
      };

      console.log("Sending to backend:", payload);

      // EDIT PRODUCT
      if (selectedProduct) {
        const response = await fetch(
          `${API_BASE_URL}/api/products/${selectedProduct.id}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to update product");
        }

        console.log("Product updated:", data);

        const inventoryValue = stock * price;
        const status = stock <= reorderLevel ? "Low Stock" : "In Stock";

        setProducts((currentProducts) =>
          currentProducts.map((p) =>
            p.id === selectedProduct.id
              ? {
                  ...p,
                  name: payload.product,
                  category: payload.category,
                  price: price,
                  stock: stock,
                  reorderLevel: reorderLevel,
                  inventoryValue: inventoryValue,
                  status: status,
                }
              : p
          )
        );
      }

      // ADD PRODUCT
      else {
        const response = await fetch(`${API_BASE_URL}/api/products`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to add product");
        }

        console.log("Product added:", data);

        const newProduct = data.product;

        setProducts((currentProducts) => [
          ...currentProducts,
          {
            id: Number(newProduct.product_id),
            name: newProduct.product,
            category: newProduct.category,
            price: Number(newProduct.unit_price),
            stock: Number(newProduct.current_stock),
            reorderLevel: Number(newProduct.reorder_level) || 20,
            inventoryValue: Number(newProduct.inventory_value) || 0,
            status: newProduct.status || "",
            image: "",
          },
        ]);
      }

      setSelectedProduct(null);
      setIsModalOpen(false);
    } catch (error) {
      console.error("SAVE PRODUCT ERROR:", error);
      alert(error.message);
    }
  };

  // ==========================================
  // DELETE PRODUCT
  // ==========================================

  const handleDelete = async () => {
    if (!deleteProduct) return;

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/products/${deleteProduct.id}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete product");
      }

      console.log("Deleted:", data);

      setProducts((currentProducts) =>
        currentProducts.filter((product) => product.id !== deleteProduct.id)
      );

      setDeleteProduct(null);
    } catch (error) {
      console.error("DELETE ERROR:", error);
      alert(error.message);
    }
  };

  const handleEdit = (product) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  return (
    <Layout>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Products</h1>
          <p className="text-gray-500">
            Manage your retail products and inventory
          </p>
        </div>
      </div>

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
            onEdit={handleEdit}
            onDelete={(product) => setDeleteProduct(product)}
            onView={(product) => setViewProduct(product)}
          />
        ))}
      </div>

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
