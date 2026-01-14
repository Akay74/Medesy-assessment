const { ethers } = require('ethers');

/**
 * RelayerService - Handles blockchain transactions via master admin wallet
 * Implements gasless transactions for users
 */
class RelayerService {
    constructor(contractAddress, contractABI, providerUrl, relayerPrivateKey) {
        this.provider = new ethers.JsonRpcProvider(providerUrl);
        this.relayerWallet = new ethers.Wallet(relayerPrivateKey, this.provider);
        this.contract = new ethers.Contract(
            contractAddress,
            contractABI,
            this.relayerWallet
        );

        console.log(`Relayer initialized: ${this.relayerWallet.address}`);
    }

    /**
     * Record activity for a single user
     * @param {string} userAddress - User's wallet address
     * @param {number} points - Activity points to award
     * @returns {Object} - Transaction receipt
     */
    async recordActivity(userAddress, points) {
        try {
            console.log(`Recording activity: ${points} points for ${userAddress}`);

            const tx = await this.contract.recordActivity(userAddress, points);
            console.log(`Transaction sent: ${tx.hash}`);

            const receipt = await tx.wait();
            console.log(`Transaction confirmed in block ${receipt.blockNumber}`);

            // Extract event data
            const event = receipt.logs
                .map(log => {
                    try {
                        return this.contract.interface.parseLog(log);
                    } catch {
                        return null;
                    }
                })
                .find(e => e && e.name === 'ActivityRecorded');

            return {
                success: true,
                txHash: receipt.hash,
                blockNumber: receipt.blockNumber,
                gasUsed: receipt.gasUsed.toString(),
                newTotal: event ? event.args.newTotal.toString() : null
            };
        } catch (error) {
            console.error(`Failed to record activity:`, error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get relayer balance
     */
    async getBalance() {
        const balance = await this.provider.getBalance(this.relayerWallet.address);
        return ethers.formatEther(balance);
    }

    /**
     * Estimate gas for activity recording
     */
    async estimateGas(userAddress, points) {
        try {
            const gasEstimate = await this.contract.recordActivity.estimateGas(
                userAddress,
                points
            );
            return gasEstimate.toString();
        } catch (error) {
            console.error('Gas estimation failed:', error.message);
            return null;
        }
    }
}

module.exports = RelayerService;
