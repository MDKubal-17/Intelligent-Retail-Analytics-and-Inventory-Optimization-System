function DeleteModal({ product, onClose, onConfirm }) {
  if (!product) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">

      <div className="bg-white rounded-xl p-6 w-[400px] shadow-xl">

        <h2 className="text-xl font-bold text-gray-800">
          Delete Product
        </h2>

        <p className="text-gray-600 mt-3">
          Are you sure you want to delete
          <span className="font-bold"> {product.name}</span>?
        </p>

        <p className="text-sm text-red-500 mt-2">
          This action cannot be undone.
        </p>

        <div className="flex justify-end gap-3 mt-6">

          <button
            onClick={onClose}
            className="px-5 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
          >
            Cancel
          </button>

          <button
            onClick={onConfirm}
            className="px-5 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Delete
          </button>

        </div>

      </div>

    </div>
  );
}

export default DeleteModal;