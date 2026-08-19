import Papa from "papaparse";

const API_BASE_URL =
  import.meta.env.VITE_FLASK_API_URL || "https://retail-backend-9qvb.onrender.com";

export const loadInventoryData = async () => {
  const response = await fetch(`${API_BASE_URL}/api/inventory/data/inventory`);

  if (!response.ok) {
    throw new Error(`Failed to fetch inventory CSV: ${response.statusText}`);
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
