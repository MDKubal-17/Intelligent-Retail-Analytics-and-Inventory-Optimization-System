import crypto from 'crypto';
import Transaction from './models/Transaction.js';

const GENESIS_HASH = '0';

function calculateHash(block) {
	const blockData = JSON.stringify({
		blockIndex: block.blockIndex,
		timestamp: block.timestamp,
		productId: block.productId,
		productName: block.productName,
		quantityDelta: block.quantityDelta,
		reason: block.reason,
		updatedBy: block.updatedBy,
		previousHash: block.previousHash,
	});

	return crypto.createHash('sha256').update(blockData).digest('hex');
}

export async function addTransaction({
	productId,
	productName,
	quantityDelta,
	reason,
	updatedBy = 'Admin',
}) {
	if (
		productId === undefined ||
		productId === null ||
		String(productId).trim() === ''
	) {
		throw new Error('Product ID is required.');
	}

	if (!Number.isFinite(Number(quantityDelta)) || Number(quantityDelta) === 0) {
		throw new Error('Quantity change must be a non-zero number.');
	}

	if (!reason || !String(reason).trim()) {
		throw new Error('Transaction reason is required.');
	}

	const latestBlock = await Transaction.findOne()
		.sort({ blockIndex: -1 })
		.lean();

	const block = {
		blockIndex: latestBlock ? latestBlock.blockIndex + 1 : 1,
		timestamp: new Date().toISOString(),
		productId: String(productId),
		productName: String(productName || 'N/A'),
		quantityDelta: Number(quantityDelta),
		reason: String(reason),
		updatedBy: String(updatedBy || 'Admin'),
		previousHash: latestBlock ? latestBlock.hash : GENESIS_HASH,
	};

	block.hash = calculateHash(block);

	return Transaction.create(block);
}

export async function verifyBlockchain() {
	const blocks = await Transaction.find().sort({ blockIndex: 1 }).lean();

	if (blocks.length === 0) {
		return {
			valid: true,
			message: 'The ledger is empty. No blocks to verify.',
			totalBlocks: 0,
		};
	}

	for (let i = 0; i < blocks.length; i++) {
		const current = blocks[i];

		if (current.blockIndex !== i + 1) {
			return {
				valid: false,
				message: `Block index mismatch at position ${i}.`,
				invalidBlock: current.blockIndex,
				totalBlocks: blocks.length,
			};
		}

		const expectedPreviousHash = i === 0 ? GENESIS_HASH : blocks[i - 1].hash;

		if (current.previousHash !== expectedPreviousHash) {
			return {
				valid: false,
				message: `Previous hash mismatch at block ${current.blockIndex}.`,
				invalidBlock: current.blockIndex,
				totalBlocks: blocks.length,
			};
		}

		const expectedHash = calculateHash(current);

		if (current.hash !== expectedHash) {
			return {
				valid: false,
				message: `Block data or hash was modified at block ${current.blockIndex}.`,
				invalidBlock: current.blockIndex,
				totalBlocks: blocks.length,
			};
		}
	}

	return {
		valid: true,
		message: 'Blockchain verified. All block hashes and links are valid.',
		totalBlocks: blocks.length,
	};
}
