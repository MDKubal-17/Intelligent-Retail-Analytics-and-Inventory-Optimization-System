function AIRecommendations() {
  const recommendations = [
    "Increase stock for Wireless Mouse.",
    "Reduce inventory of USB Cable.",
    "Demand spike expected next week.",
    "Supplier A delivery delayed by 2 days.",
  ];

  return (
    <div className="bg-white rounded-xl shadow-md p-6 mt-8">
      <h2 className="text-xl font-bold mb-4">
        AI Recommendations
      </h2>

      <ul className="space-y-3">
        {recommendations.map((item, index) => (
          <li
            key={index}
            className="bg-blue-50 p-3 rounded-lg border-l-4 border-blue-500"
          >
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default AIRecommendations;