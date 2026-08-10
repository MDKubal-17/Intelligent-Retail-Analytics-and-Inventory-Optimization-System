import Papa from "papaparse";

export const loadInventoryData = async () => {
  const response = await fetch("/data/inventory_data.csv");

  if (!response.ok) {
    throw new Error("Could not load inventory_data.csv");
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