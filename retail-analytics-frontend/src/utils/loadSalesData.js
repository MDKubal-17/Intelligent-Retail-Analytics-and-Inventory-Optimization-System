import Papa from "papaparse";

const API_BASE_URL = import.meta.env.VITE_FLASK_API_URL || "https://retail-analytics-backend-md.onrender.com";

export const loadSalesData = async () => {
  const response = await fetch(`${API_BASE_URL}/api/inventory/data/sales`);

  if (!response.ok) {
    throw new Error(`Failed to fetch sales CSV: ${response.statusText}`);
  }

  const csvText = await response.text();

  return new Promise((resolve, reject) => {
    Papa.parse(csvText, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,

      complete: (results) => {
        resolve(results.data);
      },

      error: (error) => {
        reject(error);
      },
    });
  });
};
