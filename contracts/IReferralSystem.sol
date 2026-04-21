// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./errors.sol";

/**
 * @title IReferralSystem
 * @notice Interface for a Web3 referral tracking system with off-chain reward calculation.
 * @dev Follows Polytrade patterns: batch operations, array parity checks, 30-item cap.
 */
interface IReferralSystem is GenericErrors {
    // Events

    /// @notice Emitted when a user registers with a referrer.
    /// @param user Address of the new user.
    /// @param referrer Address of the referring user.
    event UserRegistered(address indexed user, address indexed referrer);

    /// @notice Emitted when rewards are allocated to a referrer.
    /// @param referrer Address receiving the reward.
    /// @param amount Amount of reward tokens allocated.
    event RewardAllocated(address indexed referrer, uint256 amount);

    /// @notice Emitted when a referrer claims rewards.
    /// @param referrer Address claiming rewards.
    /// @param amount Amount of reward tokens claimed.
    event RewardClaimed(address indexed referrer, uint256 amount);

    /// @notice Emitted when the reward token is updated (only on initialisation via constructor, but kept for transparency).
    /// @param token Address of the ERC20 reward token.
    event RewardTokenSet(address indexed token);

    // Core Functions

    /// @notice Registers a single user with a referrer. Can only be called once per user.
    /// @param user Address of the user being registered.
    /// @param referrer Address of the referrer (cannot be zero or equal to user).
    /// @dev The caller must be authorised (e.g., backend with DEFAULT_ADMIN_ROLE or user self-registration).
    function registerReferral(address user, address referrer) external;

    /// @notice Batch registers multiple users with their referrers.
    /// @param users Array of user addresses.
    /// @param referrers Array of referrer addresses (same length as users).
    /// @dev Reverts if array lengths mismatch, exceeds 30 items, or any registration fails.
    function batchRegisterReferral(address[] calldata users, address[] calldata referrers) external;

    /// @notice Adds rewards to multiple referrers. Only callable by accounts with REWARD_ROLE.
    /// @param referrers Array of referrer addresses.
    /// @param amounts Array of reward amounts (in token decimals).
    /// @dev Reverts if array lengths mismatch or exceeds 30 items.
    function batchAddRewards(address[] calldata referrers, uint256[] calldata amounts) external;

    /// @notice Allows a referrer to claim their accumulated rewards.
    function claimRewards() external;

    // View Functions

    /// @notice Returns the referrer of a given user.
    /// @param user Address of the user.
    /// @return Referrer address, or zero address if not registered.
    function getReferrer(address user) external view returns (address);

    /// @notice Returns the pending reward balance of a referrer.
    /// @param referrer Address of the referrer.
    /// @return Amount of unclaimed rewards.
    function getPendingRewards(address referrer) external view returns (uint256);

    /// @notice Returns the address of the ERC20 token used for rewards.
    function getRewardToken() external view returns (address);

    /// @notice Returns the current maximum batch size.
    function getMaxBatchSize() external view returns (uint256);

    // Admin Functions

    /// @notice Updates the maximum allowed batch size. Only callable by DEFAULT_ADMIN_ROLE.
    /// @param newSize New maximum batch size (cannot exceed MAX_BATCH_SIZE_LIMIT).
    function setMaxBatchSize(uint256 newSize) external;
}