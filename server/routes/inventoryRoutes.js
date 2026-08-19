import express from 'express';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import csv from 'csv-parser';
import { format } from '@fast-csv/format';
import Transaction from '../models/Transaction.js';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CSV_PATH = path.join(
	__dirname,
	'../../reatail-anaytics-backend/data/inventory_data.csv',
);

// Helper function to calculate SHA-256 block hash
function calculateHash(index, previousHash, timestamp, data) {
	return crypto
		.createHash('sha256')
		.update(index + previousHash + timestamp + JSON.stringify(data))
		.digest('hex');
}

// Helper to look up Product Name from CSV matching your exact headers
function findProductNameFromCSV(productId) {
	return new Promise((resolve) => {
		if (!fs.existsSync(CSV_PATH)) {
			console.log('⚠️ CSV file not found at:', CSV_PATH);
			return resolve(null);
		}

		let foundName = null;
		const targetId = String(productId).trim();

		fs.createReadStream(CSV_PATH)
			.pipe(csv())
			.on('data', (row) => {
				// Normalize keys (handles product_id, Product_ID, productId)
				const rowIdKey = Object.keys(row).find(
					(k) =>
						k.trim().toLowerCase() === 'product_id' ||
						k.trim().toLowerCase() === 'productid',
				);
				const rowNameKey = Object.keys(row).find(
					(k) =>
						k.trim().toLowerCase() === 'product' ||
						k.trim().toLowerCase() === 'productname' ||
						k.trim().toLowerCase() === 'name',
				);

				if (rowIdKey && String(row[rowIdKey]).trim() === targetId) {
					foundName = rowNameKey ? row[rowNameKey].trim() : null;
				}
			})
			.on('end', () => {
				console.log(
					`🔍 CSV Lookup for Product ID "${targetId}" -> Found: "${foundName}"`,
				);
				resolve(foundName);
			})
			.on('error', (err) => {
				console.error('❌ Error reading CSV:', err);
				resolve(null);
			});
	});
}

// POST: Record stock change in MongoDB ledger & update CSV
router.post('/update-stock', async (req, res) => {
	const {
		productId,
		quantityDelta,
		reason,
		updatedBy = 'Admin',
		productName: providedName,
	} = req.body;

	if (!productId || quantityDelta === undefined || !reason) {
		return res
			.status(400)
			.json({ success: false, error: 'Missing required parameters' });
	}

	try {
		// 1. Resolve product name from CSV using updated header lookup
		const csvProductName = await findProductNameFromCSV(productId);
		const productName =
			providedName || csvProductName || `Product ${productId}`;

		// 2. Fetch latest block from MongoDB to maintain chain linkage
		const lastBlock = await Transaction.findOne().sort({ blockIndex: -1 });

		const blockIndex = lastBlock ? lastBlock.blockIndex + 1 : 1;
		const previousHash = lastBlock ? lastBlock.hash : '0';
		const timestamp = new Date().toISOString();

		const blockData = {
			productId,
			productName,
			quantityDelta: parseInt(quantityDelta),
			reason,
			updatedBy,
		};

		const hash = calculateHash(blockIndex, previousHash, timestamp, blockData);

		// 3. Save new Block with productName to MongoDB
		const newTransaction = new Transaction({
			blockIndex,
			timestamp,
			productId,
			productName,
			quantityDelta: parseInt(quantityDelta),
			reason,
			updatedBy,
			previousHash,
			hash,
		});

		await newTransaction.save();

		// 4. Sync updated stock quantity in CSV
		let records = [];
		if (fs.existsSync(CSV_PATH)) {
			fs.createReadStream(CSV_PATH)
				.pipe(csv())
				.on('data', (row) => {
					const rowId = row.product_id || row.productId || row.Product_ID;
					if (String(rowId).trim() === String(productId).trim()) {
						const currentQty = parseInt(
							row.current_stock ||
								row.Quantity ||
								row.quantity ||
								row.Stock ||
								0,
						);
						if (row.current_stock !== undefined) {
							row.current_stock = (
								currentQty + parseInt(quantityDelta)
							).toString();
						} else if (row.Quantity !== undefined) {
							row.Quantity = (currentQty + parseInt(quantityDelta)).toString();
						}
					}
					records.push(row);
				})
				.on('end', () => {
					const writeStream = fs.createWriteStream(CSV_PATH);
					const csvStream = format({ headers: true });
					csvStream.pipe(writeStream);
					records.forEach((rec) => csvStream.write(rec));
					csvStream.end();

					return res.status(200).json({
						success: true,
						blockHash: hash,
						data: newTransaction,
						message:
							'Stock change logged to MongoDB ledger and synced with CSV.',
					});
				});
		} else {
			res.status(200).json({
				success: true,
				blockHash: hash,
				data: newTransaction,
				message: 'Logged to MongoDB ledger (CSV path not found).',
			});
		}
	} catch (err) {
		res.status(500).json({ success: false, error: err.message });
	}
});

// GET: Fetch all transactions from MongoDB for UI
router.get('/transactions', async (req, res) => {
	try {
		const transactions = await Transaction.find().sort({ timestamp: -1 });

		res.status(200).json({ success: true, data: transactions });
	} catch (err) {
		res.status(500).json({ success: false, message: err.message });
	}
});

// POST: One-time endpoint to backfill past MongoDB transactions
router.post('/backfill-names', async (req, res) => {
	try {
		const transactions = await Transaction.find();
		let updatedCount = 0;

		for (const tx of transactions) {
			const name = await findProductNameFromCSV(tx.productId);
			if (name) {
				tx.productName = name;
				await tx.save();
				updatedCount++;
			}
		}

		res.json({
			success: true,
			message: `Updated ${updatedCount} transactions with product names.`,
		});
	} catch (err) {
		res.status(500).json({ success: false, error: err.message });
	}
});

export default router;
