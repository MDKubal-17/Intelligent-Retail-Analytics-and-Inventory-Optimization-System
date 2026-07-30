function LowStockAlerts() {
  const alerts = [
    { product: "Wireless Mouse", stock: 5 },
    { product: "USB Cable", stock: 3 },
    { product: "Laptop Stand", stock: 7 },
    { product: "Bluetooth Speaker", stock: 2 },
  ];

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <h2 className="text-xl font-bold mb-4 text-red-600">
        Low Stock Alerts
      </h2>

      <div className="space-y-3">
        {alerts.map((item, index) => (
          <div
            key={index}
            className="flex justify-between bg-red-50 p-3 rounded-lg"
          >
            <span>{item.product}</span>

            <span className="font-bold text-red-600">
              {item.stock} left
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default LowStockAlerts;