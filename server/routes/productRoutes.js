import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import csv from 'csv-parser';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to your local or deployed CSV file
const CSV_PATH = path.resolve(__dirname, '../data/inventory_data.csv');

// GET: /api/products
router.get('/', async (req, res) => {
  try {
    const products = [];

    if (!fs.existsSync(CSV_PATH)) {
      return res.status(200).json([]);
    }

    await new Promise((resolve, reject) => {
      fs.createReadStream(CSV_PATH)
        .pipe(csv())
        .on('data', (row) => {
          products.push({
            id: row.product_id || row.ID || row.id || products.length + 1,
            name: row.product_name || row.Name || row.name || 'Unknown Item',
            category: row.category || row.Category || 'General',
            stock: parseInt(row.current_stock || row.Quantity || row.stock || 0, 10),
            price: parseFloat(row.price || row.Price || row.unit_price || 0),
          });
        })
        .on('end', resolve)
        .on('error', reject);
    });

    res.status(200).json(products);
  } catch (err) {
    console.error('Error reading products:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
