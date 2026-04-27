# Medesy Protocol — Technical Documentation
### Smart Contract Suite v1.0

> **Author:** Medesy Engineering  
> **Solidity Version:** `^0.8.20`  
> **License:** MIT  
> **Network:** Base (Ethereum Layer 2, EVM-compatible)  
> **Deployment Model:** Standard immutable contracts — no proxy, no upgradeability

---

## Table of Contents

1. [Why Blockchain? The Core Justification](#1-why-blockchain-the-core-justification)
2. [Network Selection: Base (Ethereum L2)](#2-network-selection-base-ethereum-l2)
3. [System Architecture](#3-system-architecture)
4. [Contract Suite Breakdown](#4-contract-suite-breakdown)
   - 4.1 [Shared Error Library — `errors.sol`](#41-shared-error-library--errorssol)
   - 4.2 [Activity Tracker Interface — `IMedesyActivityTracker.sol`](#42-activity-tracker-interface--imedesyactivitytrackersol)
   - 4.3 [Activity Tracker — `MedesyActivityTracker.sol`](#43-activity-tracker--medesyactivitytrackersol)
   - 4.4 [Referral System Interface — `IReferralSystem.sol`](#44-referral-system-interface--ireferralsystemsol)
   - 4.5 [Referral System — `ReferralSystem.sol`](#45-referral-system--referralsystemsol)
5. [Access Control & Roles](#5-access-control--roles)
6. [Event Log](#6-event-log)
7. [Security Design](#7-security-design)
8. [Data Flow Diagrams](#8-data-flow-diagrams)
9. [Deployment Reference](#9-deployment-reference)
10. [Key Design Decisions & Trade-offs](#10-key-design-decisions--trade-offs)

---

## 1. Why Blockchain? The Core Justification

### The Problem: Trust Across Independent Parties

Medesy operates at the intersection of multiple independent actors — patients, healthcare providers, partner clinics, referrers, and incentive sponsors. In this environment, a traditional centralised database creates an inherent and structural trust problem: **whoever controls the database controls the truth.**

In practice this means:

- A partner clinic cannot independently verify that a referred patient's activity was correctly recorded without trusting Medesy's internal systems.
- A referrer cannot prove their reward entitlement was calculated honestly without access to internal business logic they have no visibility into.
- A patient cannot verify that their healthcare activity was permanently recorded or that it has not been retroactively altered.
- External auditors and regulators face an all-or-nothing reliance on Medesy's own reporting, with no independent verification path.

This is not a hypothetical risk — it is the foundational limitation of any system where a single actor controls the record of incentive and verification events. No legal contract or SLA eliminates the technical ability of a database operator to edit, backdate, or delete records.

### The Blockchain Solution: Shared, Tamper-Resistant State

Blockchain removes the single point of authority. Once a transaction is confirmed, its content becomes part of an append-only, cryptographically linked chain of blocks validated by a decentralised network of nodes. **No single party — including Medesy — can alter a confirmed record.**

The Medesy protocol uses two smart contracts to instantiate this guarantee across its two most trust-sensitive domains:

**Domain 1 — Healthcare Activity Verification (`MedesyActivityTracker`)**

Every validated healthcare activity is anchored on-chain as a Keccak-256 hash — a cryptographic fingerprint of the backend record. This hash is permanently and publicly associated with the patient's wallet address. The specific guarantee delivered is:

- **Non-repudiation:** Once anchored, neither Medesy nor any partner can deny that a specific activity occurred. The hash is immutable proof.
- **Duplicate prevention:** The `_activityAnchors` mapping enforces global uniqueness. The same activity cannot be anchored twice, preventing inflation of scores or reward triggers.
- **Replay protection:** Per-user nonces increment atomically on each anchor. A relayer cannot resubmit a previously valid transaction for a different effect.
- **Independent auditability:** Any third party can query `isActivityAnchored(hash)` or read the `ActivityAnchored` event log to verify activity history, without depending on Medesy's internal systems.

**Domain 2 — Referral Attribution & Reward Distribution (`ReferralSystem`)**

Referral relationships and reward allocations are recorded on-chain with the following guarantees:

- **Immutable attribution:** The `_userToReferrer` mapping is written exactly once per user and can never be overwritten. A referrer's claim to their referred users cannot be disputed or reassigned after the fact.
- **Transparent reward accounting:** Every reward allocation emits a `RewardsAllocated` event with the amount credited and the running total. Any referrer can independently verify their balance history from public chain data without trusting Medesy's reporting.
- **Self-custody claiming:** Referrers withdraw their rewards directly from the smart contract via `claimRewards()`. Medesy has no technical ability to withhold, redirect, or intercept funds that have been allocated on-chain.
- **Auditability for partners:** Partner organisations can verify the total reward pool (`getRewardPoolBalance()`), confirm individual referrer balances, and trace every allocation event — all without API access to internal systems.

### What Stays Off-Chain (and Why)

The system deliberately uses a **hybrid architecture**. Detailed patient health records, personal identifiable information, and reward calculation logic remain off-chain. The blockchain stores only cryptographic proofs and attribution facts — the minimum data set needed to make incentive outcomes independently verifiable. This is a deliberate design decision that balances privacy (GDPR/HIPAA considerations), gas cost, and blockchain's core value proposition.

```
Off-chain (Backend Database)           On-chain (Base Blockchain)
─────────────────────────────          ──────────────────────────────────
Patient health records                 Activity hash fingerprints
Reward calculation engine              User → Referrer mappings (immutable)
User PII and profile data              Reward balances per referrer
Business rules & eligibility           Role-gated write access log
Activity type classification           Full event history (tamper-proof)
```

The blockchain acts as a **tamper-resistant audit layer and settlement engine**, not a general-purpose database. This is the correct use of the technology.

---

## 2. Network Selection: Base (Ethereum L2)

### Protocol: Public Blockchain — Ethereum Layer 2

Medesy deploys on **Base**, a Layer 2 blockchain built on the Optimism OP Stack, fully EVM-compatible, and anchored to Ethereum mainnet for security.

### Why a Public Blockchain (vs. Private/Permissioned)

A private or consortium blockchain would defeat the core purpose. If Medesy or a partner consortium controls the validator set, the tamper-resistance guarantee disappears — the validators can collude to rewrite history. The audit value only holds on a sufficiently decentralised public network where no single party controls consensus.

Public deployment also means:
- Any third party can independently verify records using free public tools (Basescan block explorer, ethers.js, etc.)
- Audit firms and regulators do not need special API access
- Smart contract bytecode is publicly verifiable against the source code

### Why Ethereum Layer 2 (vs. Ethereum Mainnet)

Ethereum mainnet provides maximum decentralisation and security but is cost-prohibitive for a healthcare application with frequent, small-value anchoring events. A single `anchorActivity` call on mainnet during a busy period could cost several dollars in gas fees — making patient-facing interactions uneconomical.

Base solves this with the **Optimistic Rollup** architecture:

| Property | Ethereum Mainnet | Base (L2) |
|---|---|---|
| Avg. transaction fee | $2–$20+ (variable) | $0.001–$0.01 (typical) |
| Finality (soft) | ~15 seconds | ~2 seconds |
| Finality (hard) | ~12 minutes | ~7 days (challenge window) |
| Security root | Ethereum PoS | Ethereum PoS (via settlement) |
| EVM compatibility | Full | Full (OP Stack) |
| Block explorer | Etherscan | Basescan |
| Developer tooling | Full ecosystem | Full (identical to mainnet) |

### Why Base Specifically (vs. Other L2s)

Base is operated by Coinbase, providing institutional-grade infrastructure reliability. It has the same bytecode compatibility as Ethereum mainnet, meaning the contracts compiled and tested for one environment deploy identically on the other. Crucially, Base inherits Ethereum's security through its fraud proof mechanism — transactions are ultimately settled on Ethereum mainnet, giving the record the same long-term tamper-resistance as Ethereum itself.

### Practical Cost Illustration

The `anchorActivityBatch` function can process 30 activities in a single transaction. On Base at typical gas prices:

```
Single anchorActivity:       ~$0.001–$0.005 per call
anchorActivityBatch (30):    ~$0.005–$0.02 per batch
                             = effectively < $0.001 per activity
```

This makes frequent healthcare activity tracking economically viable at scale.

---

## 3. System Architecture

### High-Level Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                         MEDESY BACKEND                               │
│  ┌─────────────────┐   ┌──────────────────┐   ┌──────────────────┐  │
│  │  Activity Engine │   │  Reward Engine   │   │  Identity Mgmt   │  │
│  │  (validates &   │   │  (calculates     │   │  (userId ←→      │  │
│  │   hashes acts.) │   │   referral rwds) │   │   wallet maps)   │  │
│  └────────┬────────┘   └────────┬─────────┘   └────────┬─────────┘  │
└───────────│─────────────────────│──────────────────────│────────────┘
            │ RELAYER_ROLE        │ REWARD_ROLE          │ DEFAULT_ADMIN_ROLE
            │                    │                      │
            ▼                    ▼                      ▼
┌───────────────────────┐  ┌─────────────────────┐
│  MedesyActivityTracker│  │   ReferralSystem     │
│  ───────────────────  │  │  ──────────────────  │
│  • linkIdentity()     │  │  • registerReferral()│
│  • anchorActivity()   │  │  • allocateReward()  │
│  • anchorActivityBatch│  │  • batchAllocate...  │
│  • pause() / unpause()│  │  • claimRewards()    │
│                       │  │  • depositRewardPool │
└──────────┬────────────┘  └──────────┬───────────┘
           │                          │
           │    Shared Library        │
           └──────────┬───────────────┘
                      │
              ┌───────▼────────┐
              │   errors.sol   │
              │  GenericErrors │
              └───────┬────────┘
                      │ inherits
              ┌───────┴────────┐
              │  Interfaces    │
              │  IMedesy...    │
              │  IReferral...  │
              └────────────────┘
```

### File Dependency Graph

```
errors.sol (GenericErrors interface)
    ├── IMedesyActivityTracker.sol   (extends GenericErrors)
    │       └── MedesyActivityTracker.sol  (implements interface)
    │               ├── AccessControl (OZ)
    │               ├── Pausable (OZ)
    │               └── ERC165 (OZ)
    │
    └── IReferralSystem.sol          (extends GenericErrors)
            └── ReferralSystem.sol         (implements interface)
                    ├── AccessControl (OZ)
                    ├── ReentrancyGuard (OZ)
                    ├── SafeERC20 (OZ)
                    └── ERC165 (OZ)
```

### Deployment Architecture

Both contracts are **standard immutable deployments** — no proxy pattern, no upgrade mechanism. Each contract is:
- Deployed once with a `constructor`
- Verified on Basescan by uploading source code
- Immutable thereafter: bytecode cannot change post-deployment
- Independently addressable and auditable

---

## 4. Contract Suite Breakdown

### 4.1 Shared Error Library — `errors.sol`

**Type:** Solidity `interface`  
**Purpose:** Single source of truth for all shared protocol-wide custom errors.

Both `IMedesyActivityTracker` and `IReferralSystem` inherit from `GenericErrors`, meaning any contract implementing either interface automatically surfaces these errors in its ABI. This eliminates duplicated definitions and ensures consistent revert behaviour across the suite.

**Defined Errors:**

| Error | Category | Trigger Condition |
|---|---|---|
| `InvalidAddress()` | Input validation | Zero address (`address(0)`) supplied where a live address is required |
| `InvalidInput()` | Input validation | Empty string, zero value, or otherwise malformed scalar input |
| `NoArrayParity()` | Batch safety | Two parallel arrays in a batch call have different lengths |
| `BatchLimitExceeded()` | Batch safety | Batch call contains more than 30 items |
| `EmptyBatch()` | Batch safety | Batch array contains zero elements |
| `NotEnoughBalance()` | Funds | Insufficient token balance in the reward pool or caller wallet |

Custom errors (introduced in Solidity 0.8.4) are used throughout instead of `require` strings because they cost less gas to deploy and revert with, while encoding richer type information for off-chain tooling and indexers.

---

### 4.2 Activity Tracker Interface — `IMedesyActivityTracker.sol`

**Inherits:** `GenericErrors`  
**Purpose:** Defines the complete, versioned public API for the `MedesyActivityTracker` contract.

The interface is the authoritative specification. Any future reimplementation of the tracker must satisfy every function signature and event declared here. This allows the backend to code against the interface ABI, not the implementation, making the contracts independently swappable at the integration layer.

**Events declared:**

| Event | Parameters | Purpose |
|---|---|---|
| `IdentityLinked` | `userId (indexed), wallet (indexed)` | New userId–wallet binding created |
| `IdentityUnlinked` | `userId (indexed), wallet (indexed)` | Binding removed |
| `IdentityUpdated` | `userId (indexed), oldWallet (indexed), newWallet (indexed)` | Wallet replacement, distinct from unlink+relink |
| `ActivityAnchored` | `user (indexed), activityHash (indexed), points` | Single activity proof recorded on-chain |

**Contract-specific errors declared:**

| Error | Trigger |
|---|---|
| `InvalidIdentityMapping()` | Queried/written userId has no existing binding |
| `IdentityAlreadyLinked()` | Either side of a mapping is already occupied |
| `DuplicateActivityAnchor()` | Submitted `activityHash` already exists in `_activityAnchors` |
| `InvalidNonce()` | Supplied nonce does not match `_nonces[user]` |

**Roles referenced:**

| Role | Functions gated |
|---|---|
| `DEFAULT_ADMIN_ROLE` | `linkIdentity`, `unlinkIdentity`, `updateIdentity` |
| `RELAYER_ROLE` | `anchorActivity`, `anchorActivityBatch` |
| `PAUSER_ROLE` | `pause`, `unpause` |

---

### 4.3 Activity Tracker — `MedesyActivityTracker.sol`

**Inherits:** `ERC165`, `AccessControl`, `Pausable`, `IMedesyActivityTracker`  
**Deployment:** Standard constructor, no proxy

#### Constants

| Name | Value | Purpose |
|---|---|---|
| `RELAYER_ROLE` | `keccak256("RELAYER_ROLE")` | Backend activity submission key |
| `PAUSER_ROLE` | `keccak256("PAUSER_ROLE")` | Emergency halt key |
| `BATCH_LIMIT` | `30` | Hard cap on batch size |

#### State Variables

| Variable | Type | Visibility | Description |
|---|---|---|---|
| `_userIdToWallet` | `mapping(string => address)` | `private` | Forward identity mapping |
| `_walletToUserId` | `mapping(address => string)` | `private` | Reverse identity mapping |
| `_nonces` | `mapping(address => uint256)` | `private` | Per-user replay protection nonces |
| `_activityScores` | `mapping(address => uint256)` | `private` | Cumulative point totals |
| `_actionCount` | `mapping(address => uint256)` | `private` | Count of anchored activities per user |
| `_activityAnchors` | `mapping(bytes32 => bool)` | `private` | Global hash uniqueness registry |

#### Constructor

```solidity
constructor(address initialAdmin, address initialRelayer, address initialPauser)
```
Grants `DEFAULT_ADMIN_ROLE`, `RELAYER_ROLE`, and `PAUSER_ROLE` to their respective addresses. All three must be non-zero, or the deployment reverts with `InvalidAddress()`.

#### Function Reference

**Identity Layer (requires `DEFAULT_ADMIN_ROLE`):**

| Function | Description |
|---|---|
| `linkIdentity(userId, wallet)` | Creates bidirectional userId–wallet mapping. Reverts if either side already exists. |
| `unlinkIdentity(userId)` | Deletes both directions of an existing mapping atomically. |
| `updateIdentity(userId, newWallet)` | Replaces the wallet in a mapping atomically. Clears old reverse entry before writing new. |

**Activity Anchoring (requires `RELAYER_ROLE` + `whenNotPaused`):**

| Function | Description |
|---|---|
| `anchorActivity(user, activityHash, points, nonce)` | Anchors a single activity. Validates nonce and hash uniqueness. Follows checks-effects pattern. |
| `anchorActivityBatch(users[], activityHashes[], points[], nonces[])` | Batch version. Pre-loop validation of cap and parity before any state change. All-or-nothing processing. |

**Administration:**

| Function | Role | Description |
|---|---|---|
| `pause()` | `PAUSER_ROLE` | Halts `anchorActivity` and `anchorActivityBatch`. Identity functions unaffected. |
| `unpause()` | `PAUSER_ROLE` | Resumes anchoring. |

**View Functions (public, no role required):**

| Function | Returns |
|---|---|
| `getUserScore(user)` | Cumulative point score |
| `getUserActionCount(user)` | Total anchored activities |
| `getUserNonce(user)` | Current expected nonce |
| `isActivityAnchored(activityHash)` | `bool` — existence check |
| `getWalletByUserId(userId)` | Linked wallet address or `address(0)` |
| `getUserIdByWallet(wallet)` | Linked userId or empty string |

---

### 4.4 Referral System Interface — `IReferralSystem.sol`

**Inherits:** `GenericErrors`  
**Purpose:** Defines the complete public API for `ReferralSystem.sol`.

**Core invariants declared in the interface:**
1. A user's referrer is set exactly once — immutable post-registration.
2. A user cannot refer themselves (`SelfReferral`).
3. A zero address cannot be a referrer (`InvalidReferrer`).
4. Rewards accumulate in the contract and are claimable at any time by the referrer themselves.

**Events declared:**

| Event | Parameters | Purpose |
|---|---|---|
| `ReferralRegistered` | `user (indexed), referrer (indexed)` | New immutable referral link created |
| `RewardsAllocated` | `referrer (indexed), amount, newTotal` | Backend credits rewards; `newTotal` enables balance reconciliation without extra SLOAD |
| `RewardsClaimed` | `referrer (indexed), amount` | Referrer withdraws their balance |
| `RewardTokenUpdated` | `oldToken (indexed), newToken (indexed)` | Admin replaces ERC-20 token address |
| `RewardPoolDeposited` | `depositor (indexed), amount` | Reward pool funded |

**Contract-specific errors declared:**

| Error | Trigger |
|---|---|
| `SelfReferral()` | `user == referrer` |
| `AlreadyRegistered()` | `_userToReferrer[user]` already set |
| `NoRewardsToClaim()` | `_rewardBalances[msg.sender] == 0` |
| `InvalidReferrer()` | `referrer == address(0)` |

---

### 4.5 Referral System — `ReferralSystem.sol`

**Inherits:** `ERC165`, `AccessControl`, `ReentrancyGuard`, `IReferralSystem`  
**Deployment:** Standard constructor, no proxy  
**Token standard:** ERC-20 (via `SafeERC20`)

#### Constants

| Name | Value | Purpose |
|---|---|---|
| `REWARD_ROLE` | `keccak256("REWARD_ROLE")` | Backend reward allocation key |
| `BATCH_LIMIT` | `30` | Hard cap on batch size |

#### State Variables

| Variable | Type | Visibility | Description |
|---|---|---|---|
| `_rewardToken` | `IERC20` | `private` | ERC-20 token for reward distribution |
| `_userToReferrer` | `mapping(address => address)` | `private` | Immutable referral registry |
| `_rewardBalances` | `mapping(address => uint256)` | `private` | Pending unclaimed reward per referrer |
| `_referralCounts` | `mapping(address => uint256)` | `private` | Number of registered users per referrer |

#### Constructor

```solidity
constructor(address initialAdmin, address initialRewarder, address rewardToken_)
```
Sets the reward token and grants `DEFAULT_ADMIN_ROLE` and `REWARD_ROLE`. All three parameters must be non-zero.

#### Function Reference

**Referral Registration (open / `DEFAULT_ADMIN_ROLE`):**

| Function | Access | Description |
|---|---|---|
| `registerReferral(user, referrer)` | Open | Registers a single user–referrer pair. Immutable on success. |
| `batchRegisterReferral(users[], referrers[])` | `DEFAULT_ADMIN_ROLE` | Batch registration. Pre-loop cap and parity check. All-or-nothing. |

**Reward Allocation (requires `REWARD_ROLE`):**

| Function | Description |
|---|---|
| `allocateReward(referrer, amount)` | Credits a single referrer's balance. |
| `batchAllocateRewards(referrers[], amounts[])` | Batch credit. Pre-loop validation of cap and parity. Primary entry point for the backend reward engine. |

**Reward Claiming (open):**

| Function | Access | Description |
|---|---|---|
| `claimRewards()` | Open (caller = referrer) | Withdraws entire balance. CEI pattern + `nonReentrant`. |

**Administration:**

| Function | Access | Description |
|---|---|---|
| `depositRewardPool(amount)` | Open | Transfers ERC-20 into the contract's reward pool. |
| `setRewardToken(newToken)` | `DEFAULT_ADMIN_ROLE` | Replaces the reward token address. Warning: existing balances denominate in old token. |

**View Functions (public, no role required):**

| Function | Returns |
|---|---|
| `getReferrer(user)` | Referrer address or `address(0)` |
| `getRewardBalance(referrer)` | Pending reward balance |
| `getReferralCount(referrer)` | Number of registered referees |
| `isRegistered(user)` | `bool` |
| `getRewardToken()` | Current reward token address |
| `getRewardPoolBalance()` | Total tokens held by the contract |

---

## 5. Access Control & Roles

Both contracts use OpenZeppelin's `AccessControl` (role-based) rather than `Ownable`. This is a deliberate upgrade from the original codebase's `Ownable2Step` pattern, providing:
- Multiple simultaneous role holders (e.g., multiple backend relayer keys)
- Role revocation without transferring full ownership
- Separation of operational and administrative privileges

### Role Matrix

| Role | `bytes32` Identifier | `MedesyActivityTracker` | `ReferralSystem` |
|---|---|---|---|
| `DEFAULT_ADMIN_ROLE` | `bytes32(0)` | Identity management, role grants | Reward token management, batch registration, role grants |
| `RELAYER_ROLE` | `keccak256("RELAYER_ROLE")` | Activity anchoring | — |
| `PAUSER_ROLE` | `keccak256("PAUSER_ROLE")` | Pause/unpause | — |
| `REWARD_ROLE` | `keccak256("REWARD_ROLE")` | — | Reward allocation |

### Privilege Separation Rationale

| Design Decision | Justification |
|---|---|
| `RELAYER_ROLE` separate from `DEFAULT_ADMIN_ROLE` | A compromised backend signing key cannot alter identity mappings or grant new roles |
| `PAUSER_ROLE` separate from `DEFAULT_ADMIN_ROLE` | Operations team can halt anchoring in an emergency without holding full administrative keys |
| `REWARD_ROLE` separate from `DEFAULT_ADMIN_ROLE` | The reward calculation service cannot drain the pool or change the token contract |
| `registerReferral` open to all callers | Users or any relayer can self-register; this is intentional UX flexibility |
| `batchRegisterReferral` gated to `DEFAULT_ADMIN_ROLE` | Prevents bulk spam registrations from arbitrary parties |

### Role Administration

`DEFAULT_ADMIN_ROLE` is self-administering in OpenZeppelin's `AccessControl`: the role can grant and revoke any other role, including itself. In production, this role should be held by a multi-signature wallet (e.g., Safe/Gnosis) with a time-lock, not a single EOA.

---

## 6. Event Log

### MedesyActivityTracker Events

| Event | Indexed Parameters | Non-Indexed | Emitted By | Trigger |
|---|---|---|---|---|
| `IdentityLinked` | `userId`, `wallet` | — | `linkIdentity` | New binding created |
| `IdentityUnlinked` | `userId`, `wallet` | — | `unlinkIdentity`, `updateIdentity` | Binding removed |
| `IdentityUpdated` | `userId`, `oldWallet`, `newWallet` | — | `updateIdentity` | Wallet replaced atomically |
| `ActivityAnchored` | `user`, `activityHash` | `points` | `anchorActivity`, `anchorActivityBatch` (per item) | Activity hash recorded |

### ReferralSystem Events

| Event | Indexed Parameters | Non-Indexed | Emitted By | Trigger |
|---|---|---|---|---|
| `ReferralRegistered` | `user`, `referrer` | — | `registerReferral`, `batchRegisterReferral` (per item) | Immutable referral link set |
| `RewardsAllocated` | `referrer` | `amount`, `newTotal` | `allocateReward`, `batchAllocateRewards` (per item) | Backend credits balance |
| `RewardsClaimed` | `referrer` | `amount` | `claimRewards` | Referrer withdraws tokens |
| `RewardTokenUpdated` | `oldToken`, `newToken` | — | `setRewardToken` | Admin changes reward ERC-20 |
| `RewardPoolDeposited` | `depositor` | `amount` | `depositRewardPool` | Pool funded |

> **Note on `RewardsAllocated.newTotal`:** This field is computed in memory and emitted without a second storage read. Off-chain indexers can reconstruct the complete balance history of any referrer by summing `amount` fields or reading the terminal `newTotal` of the most recent event — without ever querying on-chain state.

---

## 7. Security Design

### 7.1 Reentrancy Protection — `ReentrancyGuard` + CEI Pattern

`ReferralSystem.claimRewards()` is the only function that performs an outbound ERC-20 transfer to an externally-supplied address. It is protected by two independent layers:

**Layer 1 — Checks-Effects-Interactions (CEI):** The referrer's balance is set to zero _before_ the `safeTransfer` call. Even if the receiving contract executes a callback that re-enters `claimRewards`, the balance will be `0` and the function will revert with `NoRewardsToClaim`.

**Layer 2 — `nonReentrant` modifier:** OpenZeppelin's `ReentrancyGuard` sets a lock flag on entry and clears it on exit. Any re-entrant call during the transfer will find the lock set and revert immediately, before reaching any logic.

```solidity
// Layer 1: zero the balance BEFORE the transfer (CEI)
_rewardBalances[msg.sender] = 0;

// Layer 2: nonReentrant modifier on the function
_rewardToken.safeTransfer(msg.sender, claimable);
```

### 7.2 SafeERC20 — Non-Standard Token Protection

All ERC-20 token operations in `ReferralSystem` use OpenZeppelin's `SafeERC20` wrapper:

| Call site | Method used | Protection |
|---|---|---|
| `depositRewardPool` | `safeTransferFrom` | Handles tokens returning `false` instead of reverting |
| `claimRewards` | `safeTransfer` | Handles tokens returning `false` instead of reverting |

Without `SafeERC20`, a non-standard token (such as USDT) that returns `false` on failure rather than reverting would silently pass the transfer check, creating a false accounting state.

### 7.3 Replay Protection — Per-User Nonces

`MedesyActivityTracker` maintains a `_nonces[user]` counter that increments by exactly 1 on every successful `anchorActivity` call. The relayer must supply the current nonce value matching what is stored on-chain. This prevents:

- **Replay attacks:** A previously valid transaction cannot be resubmitted to double-anchor an activity.
- **Out-of-order submission:** Activities must be submitted sequentially per user, preventing race conditions between concurrent relayer calls.

### 7.4 Hash Uniqueness — Global Activity Anchor Registry

The `_activityAnchors` mapping maintains a global set of all anchored hashes. Regardless of which user an activity is associated with, no hash can appear twice across the entire contract. This prevents:
- Inflating a user's score by reusing the same proof
- Cross-user hash reuse attacks

### 7.5 Immutable Referral Attribution

`_userToReferrer[user]` is written once via the `AlreadyRegistered` guard. The storage slot is never cleared or overwritten post-registration. This provides:
- **Non-repudiation for referrers:** Attribution cannot be revoked or transferred by any party, including admins.
- **Protection against override attacks:** Even `DEFAULT_ADMIN_ROLE` cannot change who referred a user after registration.

### 7.6 Batch Safety — Hard Cap and Pre-Loop Validation

All batch functions enforce safety in a consistent, ordered sequence before mutating any state:

```
1. if (length == 0) revert EmptyBatch();
2. if (length > BATCH_LIMIT) revert BatchLimitExceeded();
3. if (array_b.length != length) revert NoArrayParity();
4. // — only then — enter the loop
```

This ordering guarantees: (a) no partial state mutation on validation failures, (b) bounded gas consumption per transaction, and (c) protection against multi-array desync bugs that could corrupt data.

### 7.7 ERC-165 Interface Introspection

Both contracts implement `supportsInterface`, allowing other contracts and off-chain tooling to verify compatibility before integrating:

```solidity
supportsInterface(type(IMedesyActivityTracker).interfaceId) // → true
supportsInterface(type(IReferralSystem).interfaceId)        // → true
supportsInterface(type(IAccessControl).interfaceId)         // → true
```

### 7.8 Immutable Deployment

No proxy pattern is used. There is no `implementation` address that could be swapped out to alter contract behaviour post-deployment. The bytecode deployed to a given address is the bytecode that will execute for the lifetime of the contract. This simplifies the security model substantially: there are no upgrade keys to protect, no storage layout collisions to reason about, and no delegatecall attack surface.

---

## 8. Data Flow Diagrams

### Activity Anchoring Flow

```
Backend detects validated health activity
  │
  ├─ Compute activityHash = keccak256(userId, type, points, timestamp, nonce)
  ├─ Read current on-chain nonce: getUserNonce(userWallet)
  │
  └─ Call anchorActivity(userWallet, activityHash, points, nonce)
        │
        ├─ [RELAYER_ROLE check]
        ├─ [whenNotPaused check]
        ├─ if nonce != _nonces[user] → revert InvalidNonce()
        ├─ if _activityAnchors[hash] → revert DuplicateActivityAnchor()
        ├─ _nonces[user]++
        ├─ _activityAnchors[hash] = true
        ├─ _activityScores[user] += points
        ├─ _actionCount[user]++
        └─ emit ActivityAnchored(user, hash, points)
```

### Referral Registration & Reward Claim Flow

```
User signs up via Medesy app
  │
  └─ Call registerReferral(userWallet, referrerWallet)
        │
        ├─ if referrer == address(0) → revert InvalidReferrer()
        ├─ if user == address(0)     → revert InvalidAddress()
        ├─ if user == referrer       → revert SelfReferral()
        ├─ if already registered     → revert AlreadyRegistered()
        ├─ _userToReferrer[user] = referrer   ← immutable from this point
        ├─ _referralCounts[referrer]++
        └─ emit ReferralRegistered(user, referrer)

[Later — after reward calculation cycle]

Backend calls batchAllocateRewards([referrers], [amounts])
  │
  ├─ [REWARD_ROLE check]
  ├─ Pre-loop: EmptyBatch / BatchLimitExceeded / NoArrayParity checks
  └─ For each pair:
        ├─ _rewardBalances[referrer] += amount
        └─ emit RewardsAllocated(referrer, amount, newTotal)

Referrer calls claimRewards()
  │
  ├─ [nonReentrant lock acquired]
  ├─ claimable = _rewardBalances[msg.sender]
  ├─ if claimable == 0 → revert NoRewardsToClaim()
  ├─ _rewardBalances[msg.sender] = 0         ← CEI: effect before interaction
  ├─ _rewardToken.safeTransfer(msg.sender, claimable)
  ├─ emit RewardsClaimed(msg.sender, claimable)
  └─ [nonReentrant lock released]
```

---

## 9. Deployment Reference

### Constructor Parameters

**`MedesyActivityTracker`**
```solidity
constructor(
    address initialAdmin,    // Multi-sig wallet — DEFAULT_ADMIN_ROLE
    address initialRelayer,  // Backend signing key — RELAYER_ROLE
    address initialPauser    // Ops key — PAUSER_ROLE
)
```

**`ReferralSystem`**
```solidity
constructor(
    address initialAdmin,     // Multi-sig wallet — DEFAULT_ADMIN_ROLE
    address initialRewarder,  // Backend reward engine key — REWARD_ROLE
    address rewardToken_      // ERC-20 token contract address
)
```

### Recommended Deployment Checklist

1. **Deploy `errors.sol`** — No deployment needed; it is a `interface` imported by other files.
2. **Deploy `MedesyActivityTracker`** with multi-sig as `initialAdmin`.
3. **Deploy `ReferralSystem`** with multi-sig as `initialAdmin` and the ERC-20 token address.
4. **Verify source code** on Basescan for both contracts.
5. **Fund reward pool** — Call `depositRewardPool(amount)` after granting the contract an ERC-20 `allowance`.
6. **Transfer `DEFAULT_ADMIN_ROLE`** from the deployer EOA to the multi-sig if they differ.
7. **Revoke deployer role** from the EOA if the multi-sig is now the sole admin.

### OpenZeppelin Dependencies

```
@openzeppelin/contracts ^5.x
  ├── access/AccessControl.sol
  ├── utils/Pausable.sol
  ├── utils/ReentrancyGuard.sol
  ├── utils/introspection/ERC165.sol
  ├── utils/introspection/ERC165Checker.sol
  ├── token/ERC20/IERC20.sol
  └── token/ERC20/utils/SafeERC20.sol
```

---

## 10. Key Design Decisions & Trade-offs

| Decision | Chosen Approach | Alternative Considered | Rationale |
|---|---|---|---|
| Deployment model | Immutable constructor | Transparent proxy (UUPS/Transparent) | Simpler security model, no upgrade key risk, easier auditing |
| Access control | `AccessControl` (roles) | `Ownable2Step` | Supports multiple key holders per role; cleaner privilege separation |
| Reward calculation | Off-chain engine, on-chain settlement | Fully on-chain formula | Healthcare rewards depend on complex, evolving business rules not suited to immutable bytecode |
| Referral mutability | Immutable once set | Admin-updatable | Non-repudiable attribution is the core trust guarantee; mutability would undermine it |
| Batch cap | Hard 30-item limit | Unbounded or configurable | Predictable worst-case gas; prevents DoS; deterministic for off-chain schedulers |
| Pause scope (Tracker) | Anchoring only | Full contract pause | Identity management must remain available during incidents to support wallet compromise response |
| Token transfers | `SafeERC20` | Raw `transfer`/`transferFrom` | Guards against non-standard tokens that return `false`; industry standard |
| Nonce scope (Tracker) | Per-user global nonce | Per-activity-type nonce | Simpler; each user has one sequential channel; sufficient for the activity submission model |
| Reentrancy (Referral) | CEI + `nonReentrant` | CEI only | Defence in depth; second layer costs ~200 gas and eliminates entire class of complex callback attacks |
| Event design (`newTotal`) | `RewardsAllocated` includes `newTotal` | Separate balance query | Indexers reconstruct history without extra RPC calls; one less SLOAD per event |