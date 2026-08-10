function SalesKpiCard({ title, value, change, color }) {
  return (
    <div className="bg-white rounded-xl shadow-md p-6">

      <p className="text-gray-500 text-sm">
        {title}
      </p>

      <h2 className={`text-3xl font-bold mt-2 ${color}`}>
        {value}
      </h2>

      <p className="text-green-600 text-sm mt-2">
        ↑ {change} from last month
      </p>

    </div>
  );
}

export default SalesKpiCard;