import Sidebar from "./Sidebar";
import Navbar from "./Navbar";

function Layout({ children }) {
  return (
    <div className="flex">
      <Sidebar />

      <div className="ml-64 flex-1 bg-gray-100 min-h-screen">
        <div className="p-6">
          <Navbar />
        </div>

        <div className="px-6 pb-6">
          {children}
        </div>
      </div>
    </div>
  );
}

export default Layout;