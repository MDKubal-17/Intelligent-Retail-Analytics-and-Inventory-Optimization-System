import crypto from 'crypto';

class Block {
	constructor(index, timestamp, data, previousHash = '') {
		this.index = index;
		this.timestamp = timestamp;
		this.data = data; // { productId, quantityDelta, reason, updatedBy }
		this.previousHash = previousHash;
		this.hash = this.calculateHash();
	}

	calculateHash() {
		return crypto
			.createHash('sha256')
			.update(
				this.index +
					this.previousHash +
					this.timestamp +
					JSON.stringify(this.data),
			)
			.digest('hex');
	}
}

class Blockchain {
	constructor() {
		this.chain = [this.createGenesisBlock()];
	}

	createGenesisBlock() {
		return new Block(0, new Date().toISOString(), 'Genesis Block', '0');
	}

	getLatestBlock() {
		return this.chain[this.chain.length - 1];
	}

	addBlock(data) {
		const newBlock = new Block(
			this.chain.length,
			new Date().toISOString(),
			data,
			this.getLatestBlock().hash,
		);
		this.chain.push(newBlock);
		return newBlock;
	}
}

export default new Blockchain();
