
const API_BASE_URL =
  import.meta.env.VITE_FLASK_API_URL ||
  "http://127.0.0.1:5000";

export async function loadInventoryData() {
  const url = `${API_BASE_URL}/api/inventory/data/inventory`;

  console.log("Fetching inventory from:", url);

  const response = await fetch(url);

  console.log("Inventory response status:", response.status);

  if (!response.ok) {
    throw new Error("Failed to load inventory data");
  }

  const csvText = await response.text();

  console.log("Inventory CSV received:");
  console.log(csvText);
  console.log("CSV length:", csvText.length);

  const lines = csvText
    .trim()
    .split(/\r?\n/);

  console.log("Number of CSV lines:", lines.length);

  if (lines.length <= 1) {
    return [];
  }

  const headers = lines[0]
    .split(",")
    .map((header) => header.trim());

  console.log("CSV headers:", headers);

  const data = lines
    .slice(1)
    .filter((line) => line.trim())
    .map((line) => {
      const values = line.split(",");

      const row = {};

      headers.forEach((header, index) => {
        row[header] = values[index]?.trim() || "";
      });

      return row;
    });

  console.log("Parsed inventory:", data);
  console.log("Parsed inventory length:", data.length);

  return data;
}
