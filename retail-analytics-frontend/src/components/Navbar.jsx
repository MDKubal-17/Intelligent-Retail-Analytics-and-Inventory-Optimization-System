import { FaBell, FaUserCircle } from "react-icons/fa";

function Navbar() {
  return (
    <div className="flex justify-between items-center bg-white shadow-md px-6 py-4 rounded-lg">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">
          Intelligent Retail Analytics
        </h2>
        <p className="text-gray-500 text-sm">
          Inventory Optimization Dashboard
        </p>
      </div>

      <div className="flex items-center gap-6">
        <button className="relative">
          <FaBell className="text-2xl text-gray-600 hover:text-blue-600" />
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-1 rounded-full">
            3
          </span>
        </button>

        <div className="flex items-center gap-2">
          <FaUserCircle className="text-3xl text-gray-700" />
          <div>
            <h4 className="font-semibold">Admin</h4>
            <p className="text-sm text-gray-500">Store Manager</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Navbar;