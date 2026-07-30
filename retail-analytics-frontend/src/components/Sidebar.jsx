import { Link } from "react-router-dom";
import {
  FaTachometerAlt,
  FaBoxes,
  FaShoppingCart,
  FaChartLine,
  FaFileAlt,
  FaCog,
  FaSignOutAlt,
} from "react-icons/fa";

function Sidebar() {
  return (
    <div className="w-64 h-screen bg-slate-900 text-white fixed">

      <div className="text-2xl font-bold p-6 border-b border-slate-700">
        Retail AI
      </div>

      <nav className="mt-6">

        <Link
          to="/dashboard"
          className="flex items-center gap-3 px-6 py-3 hover:bg-slate-700"
        >
          <FaTachometerAlt />
          Dashboard
        </Link>

        <Link
          to="/inventory"
          className="flex items-center gap-3 px-6 py-3 hover:bg-slate-700"
        >
          <FaBoxes />
          Inventory
        </Link>

        <Link
          to="/products"
          className="flex items-center gap-3 px-6 py-3 hover:bg-slate-700"
        >
          <FaShoppingCart />
          Products
        </Link>

        <Link
          to="/forecast"
          className="flex items-center gap-3 px-6 py-3 hover:bg-slate-700"
        >
          <FaChartLine />
          Forecast
        </Link>

        <Link
          to="/sales"
          className="flex items-center gap-3 px-6 py-3 hover:bg-slate-700"
        >
          <FaChartLine />
          Sales
        </Link>

        <Link
          to="/reports"
          className="flex items-center gap-3 px-6 py-3 hover:bg-slate-700"
        >
          <FaFileAlt />
          Reports
        </Link>

        <Link
          to="/settings"
          className="flex items-center gap-3 px-6 py-3 hover:bg-slate-700"
        >
          <FaCog />
          Settings
        </Link>

      </nav>

      <div className="absolute bottom-5 w-full">

        <button className="flex items-center gap-3 px-6 py-3 hover:bg-red-600 w-full">
          <FaSignOutAlt />
          Logout
        </button>

      </div>

    </div>
  );
}

export default Sidebar;