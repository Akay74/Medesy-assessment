require('dotenv').config();

module.exports = {
    // Blockchain Configuration
    NETWORK: process.env.NETWORK || 'polygon-amoy', // Polygon testnet
    RPC_URL: process.env.RPC_URL || 'https://rpc-amoy.polygon.technology',
    
    // Contract Configuration
    CONTRACT_ADDRESS: process.env.CONTRACT_ADDRESS,
    
    // Relayer Configuration
    RELAYER_PRIVATE_KEY: process.env.RELAYER_PRIVATE_KEY,
    
    // Wallet Generation
    WALLET_SECRET: process.env.WALLET_SECRET,
    
    // API Configuration
    PORT: process.env.PORT || 3000,
    
    // Activity Point Values
    POINTS: {
        LOGIN: 5,
        APPOINTMENT_CREATED: 20,
        APPOINTMENT_FULFILLED: 10,
        ARTICLES_READ: 5,
        PRESCRIPTION_COLLECTED: 15
    }
};