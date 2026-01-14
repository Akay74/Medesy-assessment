const { ethers } = require('ethers');
const crypto = require('crypto');

/**
 * WalletService - Manages programmatic wallet creation for users
 * Identity remains off-chain & wallets are deterministically generated
 */
class WalletService {
    constructor() {
        this.wallets = new Map(); // userId -> wallet mapping
    }

    /**
     * Generate a new wallet for a user
     * @param {string} userId - Unique user identifier (off-chain)
     * @returns {Object} - Wallet address and metadata
     */
    generateWallet(userId) {
        // Check if wallet already exists
        if (this.wallets.has(userId)) {
            return this.wallets.get(userId);
        }

        // Generate deterministic wallet from userId + secret
        const seed = this.generateSeed(userId);
        const wallet = new ethers.Wallet(seed);

        const walletData = {
            userId,
            address: wallet.address,
            createdAt: Date.now()
        };

        this.wallets.set(userId, walletData);
        console.log(`Generated wallet for user ${userId}: ${wallet.address}`);

        return walletData;
    }

    /**
     * Get existing wallet for user
     */
    getWallet(userId) {
        return this.wallets.get(userId);
    }

    /**
     * Generate deterministic seed (simplified for demo)
     * In production: Use BIP39 mnemonic + derivation path
     */
    generateSeed(userId) {
        const secret = process.env.WALLET_SECRET || 'demo-secret-change-in-production';
        const hash = crypto
            .createHash('sha256')
            .update(`${userId}-${secret}`)
            .digest('hex');
        return `0x${hash}`;
    }

    /**
     * Get all wallets (for demo purposes)
     */
    getAllWallets() {
        return Array.from(this.wallets.values());
    }
}

module.exports = WalletService;