function ViewProductModal({ product, onClose }) {

    if (!product) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center">

            <div className="bg-white rounded-xl p-6 w-[450px]">

                <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-56 object-cover rounded-lg"
                />

                <h2 className="text-2xl font-bold mt-4">
                    {product.name}
                </h2>

                <p>Category: {product.category}</p>

                <p>Price: ₹{product.price}</p>

                <p>Stock: {product.stock}</p>

                <button
                    onClick={onClose}
                    className="mt-5 bg-blue-600 text-white px-5 py-2 rounded-lg"
                >
                    Close
                </button>

            </div>

        </div>
    );
}

export default ViewProductModal;