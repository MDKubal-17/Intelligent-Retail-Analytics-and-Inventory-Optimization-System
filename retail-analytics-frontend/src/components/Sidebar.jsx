
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
  FaCashRegister,
  FaSyncAlt,
} from "react-icons/fa";

function Sidebar() {
  const navigate = useNavigate();

  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 px-6 py-3 ${
      isActive
        ? "bg-blue-600 text-white"
        : "hover:bg-slate-700"
    }`;

  return (
    <div className="fixed h-screen w-64 bg-slate-900 text-white">
      <div className="border-b border-slate-700 p-6 text-2xl font-bold">
        Retail AI
      </div>

      <nav className="mt-6">
        <NavLink to="/dashboard" className={linkClass}>
          <FaTachometerAlt /> Dashboard
        </NavLink>

        <NavLink to="/inventory" className={linkClass}>
          <FaBoxes /> Inventory
        </NavLink>

        <NavLink to="/products" className={linkClass}>
          <FaShoppingCart /> Products
        </NavLink>

        <NavLink to="/forecast" className={linkClass}>
          <FaChartLine /> Forecast
        </NavLink>

        <NavLink to="/sales" className={linkClass}>
          <FaChartLine /> Sales
        </NavLink>

        <NavLink to="/new-sale" className={linkClass}>
          <FaCashRegister /> New Sale
        </NavLink>

        <NavLink to="/transactions" className={linkClass}>
          <FaExchangeAlt /> Transactions
        </NavLink>

        <NavLink to="/purchase-orders" className={linkClass}>
          <FaSyncAlt /> Purchase Orders
        </NavLink>

        <NavLink to="/reports" className={linkClass}>
          <FaFileAlt /> Reports
        </NavLink>

        <NavLink to="/settings" className={linkClass}>
          <FaCog /> Settings
        </NavLink>
      </nav>

      <div className="absolute bottom-5 w-full">
        <button
          onClick={() => navigate("/login", { replace: true })}
          className="flex w-full items-center gap-3 px-6 py-3 text-red-400 hover:bg-slate-700"
        >
          <FaSignOutAlt />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}

export default Sidebar;
