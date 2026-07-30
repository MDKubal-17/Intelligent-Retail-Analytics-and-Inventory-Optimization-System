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
import { NavLink } from "react-router-dom";

function Sidebar() {
  return (
    <div className="w-64 h-screen bg-slate-900 text-white fixed">

      <div className="text-2xl font-bold p-6 border-b border-slate-700">
        Retail AI
      </div>

      <nav className="mt-6">

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

        <NavLink
          to="/inventory"
          className={({ isActive }) =>
            `flex items-center gap-3 px-6 py-3 hover:bg-slate-700 ${
                    isActive
                        ? "bg-blue-600 text-white"
                        : "hover:bg-slate-700"
                }`
          }
        >
          <FaBoxes />
          Inventory
        </NavLink>

        <NavLink
          to="/products"
          className={({ isActive }) =>
            `flex items-center gap-3 px-6 py-3 hover:bg-slate-700 ${
                    isActive
                        ? "bg-blue-600 text-white"
                        : "hover:bg-slate-700"
                }`
          }
        >
          <FaShoppingCart />
          Products
        </NavLink>

        <NavLink
          to="/forecast"
          className={({ isActive }) =>
            `flex items-center gap-3 px-6 py-3 hover:bg-slate-700 ${
                    isActive
                        ? "bg-blue-600 text-white"
                        : "hover:bg-slate-700"
                }`
          }
        >
          <FaChartLine />
          Forecast
        </NavLink>

        <NavLink
          to="/sales"
          className={({ isActive }) =>
            `flex items-center gap-3 px-6 py-3 hover:bg-slate-700 ${
                    isActive
                        ? "bg-blue-600 text-white"
                        : "hover:bg-slate-700"
                }`
          }
        >
          <FaChartLine />
          Sales
        </NavLink>

        <NavLink
          to="/reports"
          className={({ isActive }) =>
            `flex items-center gap-3 px-6 py-3 hover:bg-slate-700 ${
                    isActive
                        ? "bg-blue-600 text-white"
                        : "hover:bg-slate-700"
                }`
          }
        >
          <FaFileAlt />
          Reports
        </NavLink>

        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex items-center gap-3 px-6 py-3 hover:bg-slate-700 ${
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