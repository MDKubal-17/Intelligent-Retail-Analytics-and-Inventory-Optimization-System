import Layout from "../components/Layout";
import ProductTable from "../components/ProductTable";

function Inventory() {
  return (
    <Layout>
      <div className="space-y-6">

        <h1 className="text-3xl font-bold">
          Inventory Management
        </h1>

        <ProductTable />

      </div>
    </Layout>
  );
}

export default Inventory;