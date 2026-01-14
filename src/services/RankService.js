const { ethers } = require('ethers');

/**
 * RankService - Queries on-chain data to derive user ranks
 * Read-only operations without gas costs
 */
class RankService {
    constructor(contractAddress, contractABI, providerUrl) {
        this.provider = new ethers.JsonRpcProvider(providerUrl);
        this.contract = new ethers.Contract(
            contractAddress,
            contractABI,
            this.provider
        );
    }

    /**
     * Get user's current rank
     * @param {string} userAddress - User's wallet address
     * @returns {string} - Rank (Bronze, Silver, Gold, Platinum)
     */
    async getRank(userAddress) {
        try {
            const rank = await this.contract.getRank(userAddress);
            return rank;
        } catch (error) {
            console.error(`Failed to get rank for ${userAddress}:`, error.message);
            throw error;
        }
    }

    /**
     * Get user's rank level
     * @returns {number} - 0=Bronze, 1=Silver, 2=Gold, 3=Platinum
     */
    async getRankLevel(userAddress) {
        try {
            const level = await this.contract.getRankLevel(userAddress);
            return Number(level);
        } catch (error) {
            console.error(`Failed to get rank level:`, error.message);
            throw error;
        }
    }

    /**
     * Get complete user profile
     * @returns {Object} - User's score, actions, lastActive, rank
     */
    async getUserProfile(userAddress) {
        try {
            const profile = await this.contract.getUserProfile(userAddress);
            
            return {
                address: userAddress,
                score: profile.score.toString(),
                actions: profile.actions.toString(),
                lastActive: Number(profile.lastActive),
                lastActiveDate: profile.lastActive > 0 
                    ? new Date(Number(profile.lastActive) * 1000).toISOString()
                    : null,
                rank: profile.rank
            };
        } catch (error) {
            console.error(`Failed to get user profile:`, error.message);
            throw error;
        }
    }

    /**
     * Check if user has required rank
     */
    async hasRank(userAddress, requiredRank) {
        try {
            const rankMap = { Bronze: 0, Silver: 1, Gold: 2, Platinum: 3 };
            const rankLevel = rankMap[requiredRank] || 0;
            
            return await this.contract.hasRank(userAddress, rankLevel);
        } catch (error) {
            console.error(`Failed to check rank:`, error.message);
            throw error;
        }
    }

    /**
     * Get activity score directly
     */
    async getActivityScore(userAddress) {
        try {
            const score = await this.contract.activityScores(userAddress);
            return score.toString();
        } catch (error) {
            console.error(`Failed to get activity score:`, error.message);
            throw error;
        }
    }

    /**
     * Batch get profiles for multiple users
     */
    async getBatchProfiles(userAddresses) {
        const profiles = await Promise.all(
            userAddresses.map(address => 
                this.getUserProfile(address).catch(err => ({
                    address,
                    error: err.message
                }))
            )
        );
        return profiles;
    }
}

module.exports = RankService;
