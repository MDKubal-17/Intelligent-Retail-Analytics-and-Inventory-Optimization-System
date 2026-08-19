import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
	blockIndex: { type: Number, required: true },
	timestamp: { type: String, required: true },
	productId: { type: String, required: true },
	productName: { type: String, required: true, default: 'N/A' }, // <-- HERE
	quantityDelta: { type: Number, required: true },
	reason: { type: String, required: true },
	updatedBy: { type: String, default: 'Admin' },
	previousHash: { type: String, required: true },
	hash: { type: String, required: true },
});

export default mongoose.model('Transaction', transactionSchema);
