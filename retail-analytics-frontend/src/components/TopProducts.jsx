function TopProducts({ sales }) {
  const productSales = {};

  sales.forEach((sale) => {
    const product = sale.product;

    if (!productSales[product]) {
      productSales[product] = 0;
    }

    productSales[product] += Number(sale.quantity || 0);
  });

  const topProducts = Object.entries(productSales)
    .map(([product, quantity]) => ({
      product,
      quantity,
    }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  return (
    <div className="bg-white rounded-xl shadow-md p-6">

      <h2 className="text-xl font-bold mb-5">
        Top Selling Products
      </h2>

      <div className="space-y-5">

        {topProducts.map((item, index) => {
          const maxQuantity = topProducts[0]?.quantity || 1;

          const percentage =
            (item.quantity / maxQuantity) * 100;

          return (
            <div key={item.product}>

              <div className="flex justify-between mb-1">

                <span className="font-medium">
                  {index + 1}. {item.product}
                </span>

                <span className="text-gray-500">
                  {item.quantity} units
                </span>

              </div>

              <div className="w-full bg-gray-200 rounded-full h-3">

                <div
                  className="bg-blue-600 h-3 rounded-full"
                  style={{
                    width: `${percentage}%`,
                  }}
                />

              </div>

            </div>
          );
        })}

      </div>

    </div>
  );
}

export default TopProducts;