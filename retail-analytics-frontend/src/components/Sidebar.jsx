import { useNavigate, NavLink } from "react-router-dom";

import {
  FaTachometerAlt,
  FaBoxes,
  FaShoppingCart,
  FaChartLine,
  FaFileAlt,
  FaExchangeAlt,
  FaCog,
  FaSignOutAlt,
} from "react-icons/fa";

function Sidebar() {
  const navigate = useNavigate();

  return (
    <div className="w-64 h-screen bg-slate-900 text-white fixed">

      {/* Logo */}
      <div className="text-2xl font-bold p-6 border-b border-slate-700">
        Retail AI
      </div>

      {/* Navigation */}
      <nav className="mt-6">

        {/* Dashboard */}
        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            `flex items-center gap-3 px-6 py-3 ${
              isActive
                ? "bg-blue-600 text-white"
                : "hover:bg-slate-700"
            }`
          }
        >
          <FaTachometerAlt />
          Dashboard
        </NavLink>

        {/* Inventory */}
        <NavLink
          to="/inventory"
          className={({ isActive }) =>
            `flex items-center gap-3 px-6 py-3 ${
              isActive
                ? "bg-blue-600 text-white"
                : "hover:bg-slate-700"
            }`
          }
        >
          <FaBoxes />
          Inventory
        </NavLink>

        {/* Products */}
        <NavLink
          to="/products"
          className={({ isActive }) =>
            `flex items-center gap-3 px-6 py-3 ${
              isActive
                ? "bg-blue-600 text-white"
                : "hover:bg-slate-700"
            }`
          }
        >
          <FaShoppingCart />
          Products
        </NavLink>

        {/* Forecast */}
        <NavLink
          to="/forecast"
          className={({ isActive }) =>
            `flex items-center gap-3 px-6 py-3 ${
              isActive
                ? "bg-blue-600 text-white"
                : "hover:bg-slate-700"
            }`
          }
        >
          <FaChartLine />
          Forecast
        </NavLink>

        {/* Sales */}
        <NavLink
          to="/sales"
          className={({ isActive }) =>
            `flex items-center gap-3 px-6 py-3 ${
              isActive
                ? "bg-blue-600 text-white"
                : "hover:bg-slate-700"
            }`
          }
        >
          <FaChartLine />
          Sales
        </NavLink>

        {/* Transactions */}
        <NavLink
          to="/transactions"
          className={({ isActive }) =>
            `flex items-center gap-3 px-6 py-3 ${
              isActive
                ? "bg-blue-600 text-white"
                : "hover:bg-slate-700"
            }`
          }
        >
          <FaExchangeAlt />
          Transactions
        </NavLink>

        {/* Reports */}
        <NavLink
          to="/reports"
          className={({ isActive }) =>
            `flex items-center gap-3 px-6 py-3 ${
              isActive
                ? "bg-blue-600 text-white"
                : "hover:bg-slate-700"
            }`
          }
        >
          <FaFileAlt />
          Reports
        </NavLink>

        {/* Settings */}
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex items-center gap-3 px-6 py-3 ${
              isActive
                ? "bg-blue-600 text-white"
                : "hover:bg-slate-700"
            }`
          }
        >
          <FaCog />
          Settings
        </NavLink>

      </nav>

      {/* Logout */}
      <div className="absolute bottom-5 w-full">

        <button
          onClick={() => navigate("/login", { replace: true })}
          className="flex items-center gap-3 w-full px-6 py-3 text-red-400 hover:bg-slate-700"
        >
          <FaSignOutAlt />
          <span>Logout</span>
        </button>

      </div>

    </div>
  );
}

export default Sidebar;
