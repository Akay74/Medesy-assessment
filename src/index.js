const express = require('express');
const WalletService = require('./services/WalletService');
const RelayerService = require('./services/RelayerService');
const RankService = require('./services/RankService');
const config = require('./config');

// Contract ABI (only required functions)
const CONTRACT_ABI = [
    "function recordActivity(address user, uint256 points) external",
    "function getRank(address user) external view returns (string memory)",
    "function getRankLevel(address user) external view returns (uint8)",
    "function getUserProfile(address user) external view returns (uint256 score, uint256 actions, uint256 lastActive, string memory rank)",
    "function hasRank(address user, uint8 requiredRank) external view returns (bool)",
    "function activityScores(address) external view returns (uint256)",
    "event ActivityRecorded(address indexed user, uint256 points, uint256 newTotal, uint256 timestamp)"
];

// Initialize services
const walletService = new WalletService();
const relayerService = new RelayerService(
    config.CONTRACT_ADDRESS,
    CONTRACT_ABI,
    config.RPC_URL,
    config.RELAYER_PRIVATE_KEY
);
const rankService = new RankService(
    config.CONTRACT_ADDRESS,
    CONTRACT_ABI,
    config.RPC_URL
);

// Express
const app = express();
app.use(express.json());

// API Endpoints

/**
 * Create new user (generates wallet)
 * POST /users
 * Body: { userId: string, name: string }
 */
app.post('/users', (req, res) => {
    try {
        const { userId, name } = req.body;
        
        if (!userId) {
            return res.status(400).json({ error: 'userId is required' });
        }

        const wallet = walletService.generateWallet(userId);
        
        res.json({
            success: true,
            user: {
                userId,
                name,
                walletAddress: wallet.address,
                createdAt: wallet.createdAt
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * Record user activity
 * POST /activity
 * Body: { userId: string, activityType: string, points?: number }
 */
app.post('/activity', async (req, res) => {
    try {
        const { userId, activityType, points } = req.body;
        
        if (!userId || !activityType) {
            return res.status(400).json({ error: 'userId and activityType required' });
        }

        // Get user's wallet
        const wallet = walletService.getWallet(userId);
        if (!wallet) {
            return res.status(404).json({ error: 'User not found. Create user first.' });
        }

        // Determine points
        const activityPoints = points || config.POINTS[activityType.toUpperCase()] || 10;

        // Record on-chain
        const result = await relayerService.recordActivity(
            wallet.address,
            activityPoints
        );

        res.json({
            success: result.success,
            activity: {
                userId,
                activityType,
                points: activityPoints,
                walletAddress: wallet.address
            },
            transaction: result
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * Get user rank and profile
 * GET /users/:userId/rank
 */
app.get('/users/:userId/rank', async (req, res) => {
    try {
        const { userId } = req.params;
        
        const wallet = walletService.getWallet(userId);
        if (!wallet) {
            return res.status(404).json({ error: 'User not found' });
        }

        const profile = await rankService.getUserProfile(wallet.address);
        
        res.json({
            success: true,
            userId,
            profile
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Start server
const PORT = config.PORT;
app.listen(PORT, () => {
    console.log(`Activity Tracker API running on port ${PORT}`);
    console.log(`Network: ${config.NETWORK}`);
    console.log(`Contract: ${config.CONTRACT_ADDRESS}`);
});

module.exports = app;