// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title GenericErrors
 * @notice Central custom errors used across all protocol contracts.
 * @dev Inherited by interface contracts to standardise error handling.
 */
interface GenericErrors {
    /// @notice Thrown when a zero or forbidden address is provided.
    error InvalidAddress();

    /// @notice Thrown when batch input arrays have mismatched lengths.
    error NoArrayParity();

    /// @notice Thrown when a batch operation exceeds the hard cap of 30 items.
    error BatchLimitExceeded();

    /// @notice Thrown when a fraction (or amount) fails a constraint.
    error InvalidFraction();

    /// @notice Thrown when a price or value is zero or invalid.
    error InvalidPrice();

    /// @notice Thrown when a caller or owner lacks sufficient balance.
    error NotEnoughBalance();

    /// @notice Thrown when a due date is not yet passed.
    error DueDateNotPassed();

    /// @notice Thrown when a due date is in the past or invalid.
    error InvalidDueDate();

    /// @notice Thrown when an ERC-165 interface check fails.
    error UnsupportedInterface();

    // Referral System Specific Errors

    /// @notice Thrown when a user tries to refer themselves.
    error SelfReferral();

    /// @notice Thrown when a referrer address is invalid (zero or same as user).
    error InvalidReferrer();

    /// @notice Thrown when a referral mapping is already set for a user.
    error AlreadyReferralSet();

    /// @notice Thrown when a referrer has no rewards to claim.
    error NoRewardsToClaim();

    /// @notice Thrown when a fee value exceeds the maximum allowed (10000 basis points).
    error InvalidFee();

    // Activity Tracker Specific Errors

    /// @notice Thrown when an activity hash is zero.
    error InvalidActivityHash();

    /// @notice Thrown when an identity hash is already set for a user.
    error IdentityAlreadySet();
}