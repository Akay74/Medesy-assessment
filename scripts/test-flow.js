require('dotenv').config();
const { ethers } = require('ethers');

const config = require('../src/config');
const WalletService = require('../src/services/WalletService');
const RelayerService = require('../src/services/RelayerService');
const RankService = require('../src/services/RankService');

const CONTRACT_ABI = [
    "function recordActivity(address user, uint256 points) external",
    "function getRank(address user) external view returns (string memory)",
    "function getUserProfile(address user) external view returns (uint256 score, uint256 actions, uint256 lastActive, string memory rank)"
];

async function testFlow() {
    console.log("Starting End-to-End Test Flow\n");
    
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
    
    // Test 1: Create users
    console.log("Test 1: Creating test users...");
    const users = [
        { userId: 'alice', name: 'Alice' },
        { userId: 'bob', name: 'Bob' },
        { userId: 'charlie', name: 'Charlie' }
    ];
    
    const wallets = users.map(user => {
        const wallet = walletService.generateWallet(user.userId);
        console.log(`Created wallet for ${user.name}: ${wallet.address}`);
        return { ...user, wallet };
    });
    
    console.log("");
    
    // Test 2: Record activities
    console.log("Test 2: Recording activities...");
    
    const activities = [
        { user: wallets[0], action: 'LOGIN', points: 5 },
        { user: wallets[0], action: 'APPOINTMENT_CREATED', points: 20 },
        { user: wallets[0], action: 'APPOINTMENT_FULFILLED', points: 10 },
        { user: wallets[1], action: 'LOGIN', points: 5 },
        { user: wallets[1], action: 'ARTICLES_READ', points: 5 },
        { user: wallets[2], action: 'PRESCRIPTION_COLLECTED', points: 25 }
    ];
    
    for (const activity of activities) {
        const result = await relayerService.recordActivity(
            activity.user.wallet.address,
            activity.points
        );
        
        if (result.success) {
            console.log(`${activity.user.name} - ${activity.action} (+${activity.points} points)`);
        } else {
            console.log(`Failed: ${result.error}`);
        }
        
        // Small delay to avoid nonce issues
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log("");
    
    // Test 3: Check ranks
    console.log("Test 3: Checking user ranks...");
    
    for (const user of wallets) {
        const profile = await rankService.getUserProfile(user.wallet.address);
        console.log(`${user.name}:`);
        console.log(`Rank: ${profile.rank}`);
        console.log(`Score: ${profile.score} points`);
        console.log(`Actions: ${profile.actions}`);
        console.log("");
    }
    
    // Test 4: Gas estimation
    console.log("");
    console.log("Test 4: Gas Cost Analysis");
    const gasEstimate = await relayerService.estimateGas(wallets[0].wallet.address, 10);
    console.log(`Single activity gas estimate: ${gasEstimate}`);
    
    const relayerBalance = await relayerService.getBalance();
    console.log(`Relayer remaining balance: ${relayerBalance} MATIC`);
}

// Run test
testFlow()
    .then(() => {
        console.log("Test flow completed!");
        process.exit(0);
    })
    .catch((error) => {
        console.error("Test failed:", error);
        process.exit(1);
    });
