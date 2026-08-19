import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import csv from 'csv-parser';
import Transaction from '../models/Transaction.js'; // Adjust path to match your Transaction model

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CSV_PATH = path.resolve(__dirname, '../data/inventory_data.csv');

// GET: /api/dashboard
router.get('/', async (req, res) => {
  try {
    // 1. Dynamic MongoDB Aggregation for Total Sales
    let totalSalesVolume = 0;
    try {
      const salesAgg = await Transaction.aggregate([
        { $match: { quantityDelta: { $ne: 0 } } },
        {
          $group: {
            _id: null,
            totalQuantity: { $sum: { $abs: '$quantityDelta' } },
          },
        },
      ]);
      totalSalesVolume = salesAgg[0]?.totalQuantity || 0;
    } catch (dbErr) {
      console.warn('Transaction collection query skipped or empty:', dbErr.message);
    }

    // 2. Read inventory data to compute real-time counts & total value
    let totalProducts = 0;
    let lowStockCount = 0;
    let totalInventoryValue = 0;
    const LOW_STOCK_THRESHOLD = 10;

    if (fs.existsSync(CSV_PATH)) {
      await new Promise((resolve, reject) => {
        fs.createReadStream(CSV_PATH)
          .pipe(csv())
          .on('data', (row) => {
            totalProducts++;

            const stock = parseInt(row.current_stock || row.Quantity || row.stock || 0, 10);
            const price = parseFloat(row.price || row.Price || row.unit_price || 0);

            if (stock <= LOW_STOCK_THRESHOLD) {
              lowStockCount++;
            }

            totalInventoryValue += stock * price;
          })
          .on('end', resolve)
          .on('error', reject);
      });
    }

    // 3. Return dynamic KPI payload
    res.status(200).json({
      total_sales: totalSalesVolume,
      total_products: totalProducts,
      low_stock: lowStockCount,
      total_inventory_value: Math.round(totalInventoryValue * 100) / 100,
    });
  } catch (err) {
    console.error('Error generating dynamic dashboard stats:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
