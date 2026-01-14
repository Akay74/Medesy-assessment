# On-Chain Activity Tracking & Rank Derivation System

A minimal system for tracking user activities on Polygon Amoy Testnet (EVM-compatible) with on-chain rank derivation.

## Architecture Overview

```
┌─────────────┐
│   User      │ (Off-chain identity: name, email, etc.)
└──────┬──────┘
       │
       │ Submits activity
       ▼
┌─────────────────────┐
│  Node.js Backend    │
│  ┌───────────────┐  │
│  │ WalletService │  │ ← Generates/manages user wallets programmatically
│  └───────────────┘  │
│  ┌───────────────┐  │
│  │RelayerService │  │ ← Master wallet sends transactions (gasless for users)
│  └───────────────┘  │
│  ┌───────────────┐  │
│  │  RankService  │  │ ← Queries on-chain data for rank derivation
│  └───────────────┘  │
└──────────┬──────────┘
           │
           │ Web3 calls
           ▼
┌──────────────────────┐
│   Smart Contract     │
│ (Polygon Testnet)    │
│                      │
│ - Activity scores    │ ← Stored on-chain
│ - Action counters    │
│ - Timestamps         │
│ - Rank derivation    │ ← Pure view functions
└──────────────────────┘
```

## Core Design Decisions

### 1. **Identity Separation**
- **Off-chain:** User names, emails, profiles (stored in backend DB)
- **On-chain:** Only wallet addresses and activity scores
- **Rationale:** Protects user privacy, reduces gas costs, maintains GDPR compliance

### 2. **Relayer Pattern (Meta-Transactions)**
- Backend uses a **Master Admin Wallet** to send all transactions
- Users don't need gas tokens or blockchain knowledge
- **Trade-off:** Centralization vs UX (backend pays gas costs)
- **Future:** Can migrate to EIP-2771 for trustless meta-transactions

### 3. **On-Chain Rank Derivation**
- Ranks calculated via **view functions** (no gas cost)
- Based on activity score thresholds:
  - Bronze: 0+ points
  - Silver: 100+ points
  - Gold: 500+ points
  - Platinum: 1000+ points
- **Rationale:** Verifiable and transparent

### 4. **Gas Optimization**
- Single SSTORE per activity record
- Custom errors instead of require strings
- Packed storage reads
- **Typical gas cost:** ~50-70k per activity record

## Quick Start

### Prerequisites
- Node.js v18+
- Polygon Amoy testnet MATIC (get from [faucet](https://faucet.polygon.technology/))

### Installation

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env
```

### Environment Configuration

Edit `.env`:

```bash
# Network
NETWORK=polygon-amoy
RPC_URL=https://rpc-amoy.polygon.technology

# Relayer wallet
RELAYER_PRIVATE_KEY=your_private_key

# Contract address (after deployment)
CONTRACT_ADDRESS=0x...

# Wallet generation secret
WALLET_SECRET=your-secret-seed

# API
PORT=3000
```

### Compile Contract

```bash
# Using npm
npm run compile
```

### Deploy Contract

```bash
# Using npm
npm run deploy
```

### Start Backend

```bash
# On another terminal run:
npm start
```

## API Endpoints

### Create User
```bash
POST /users
Body: {
  "userId": "user123",
  "name": "Alice"
}

Response: {
  "success": true,
  "user": {
    "userId": "user123",
    "name": "Alice",
    "walletAddress": "0x...",
    "createdAt": 1234567890
  }
}
```

### Record Activity
```bash
POST /activity
Body: {
  "userId": "user123",
  "activityType": "APPOINTMENT_CREATED"
}

Response: {
  "success": true,
  "activity": {
    "userId": "user123",
    "activityType": "APPOINTMENT_CREATED",
    "points": 20,
    "walletAddress": "0x..."
  },
  "transaction": {
    "txHash": "0x...",
    "blockNumber": 12345,
    "gasUsed": "65432"
  }
}
```

### Get User Rank
```bash
GET /users/user123/rank

Response: {
  "success": true,
  "userId": "user123",
  "profile": {
    "address": "0x...",
    "score": "150",
    "actions": "8",
    "lastActive": 1234567890,
    "lastActiveDate": "2024-01-13T10:30:00.000Z",
    "rank": "Silver"
  }
}
```

## Testing

```bash
# Run test
npm run test

# Expected output:
# User created
# Activity recorded (5 transactions)
# Rank: Silver (150 points)
```

## Security Considerations

### Implemented
**Access Control:** Only relayer can record activities  
**Input Validation:** Address and points validation  
**Reentrancy Safe:** No external calls in state-changing functions  
**Custom Errors:** Gas-efficient error handling  

### Production Recommendations
**Wallet Management:** ThirdWeb or Biconomy  
**Rate Limiting:** Implementing backend rate limits to prevent abuse  
**Monitoring:** Set up alerts for unusual on-chain activity  
**Multi-sig:** Using multi-sig for contract ownership  
**Pausability:** Adding pause mechanism for emergencies  

## On-Chain vs Off-Chain Trade-offs

### Stored On-Chain
- Activity scores (uint256)
- Action counts (uint256)
- Last activity timestamp (uint256)
- **Why:** Needed for trustless rank derivation

### Stored Off-Chain
- User identities (name, email)
- Activity details (type, metadata)
- Relationships, social graph
- **Why:** Privacy, cost, flexibility

This implementation demonstrates:
- Clean smart contract architecture
- Gas-optimized operations
- Secure relayer pattern
- Pure on-chain rank derivation
- Scalable design patterns
- Production-ready considerations

**Key Principle:** Balance between decentralization, cost, and user experience while maintaining security and transparency.