// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./errors.sol";
import "./structs.sol";

/**
 * @title IMedesyActivityTracker
 * @notice Interface for healthcare activity tracking and identity anchoring.
 * @dev Follows Polytrade interface-driven design.
 */
interface IMedesyActivityTracker is GenericErrors {
    // Events

    /// @notice Emitted when a single activity is anchored.
    /// @param user Address of the user anchoring the activity.
    /// @param activityHash Hash of the activity data.
    /// @param timestamp Block timestamp of the anchoring.
    event ActivityAnchored(address indexed user, bytes32 indexed activityHash, uint256 timestamp);

    /// @notice Emitted when multiple activities are anchored in a batch.
    /// @param user Address of the user.
    /// @param activityHashes Array of activity hashes.
    /// @param timestamp Block timestamp.
    event BatchActivityAnchored(address indexed user, bytes32[] activityHashes, uint256 timestamp);

    /// @notice Emitted when a user anchors an identity commitment.
    /// @param user Address of the user.
    /// @param identityHash Hash of identity document or commitment.
    /// @param timestamp Block timestamp.
    event IdentityAnchored(address indexed user, bytes32 indexed identityHash, uint256 timestamp);

    /// @notice Emitted when the maximum batch size is updated by admin.
    /// @param oldSize Previous maximum batch size.
    /// @param newSize New maximum batch size.
    event MaxBatchSizeUpdated(uint256 oldSize, uint256 newSize);

    // Core Functions

    /// @notice Anchors a single activity hash for the caller.
    /// @param activityHash Hash of the off-chain activity data (must be non-zero).
    function anchorActivity(bytes32 activityHash) external;

    /// @notice Anchors multiple activity hashes for the caller in a single transaction.
    /// @param activityHashes Array of activity hashes.
    /// @dev Reverts if array length exceeds MAX_BATCH_SIZE or if any hash is zero.
    function anchorActivityBatch(bytes32[] calldata activityHashes) external;

    /// @notice Anchors an identity hash for the caller. Can only be set once.
    /// @param identityHash Hash of identity document or commitment (non-zero).
    function anchorIdentity(bytes32 identityHash) external;

    // View Functions

    /// @notice Returns the total number of activities anchored by a user.
    /// @param user Address of the user.
    /// @return Count of activities.
    function getActivityCount(address user) external view returns (uint256);

    /// @notice Returns a paginated list of activities for a user.
    /// @param user Address of the user.
    /// @param startIndex Starting index (inclusive).
    /// @param endIndex Ending index (exclusive).
    /// @return An array of Activity structs.
    function getActivities(address user, uint256 startIndex, uint256 endIndex) external view returns (SharedStructs.Activity[] memory);

    /// @notice Returns the identity anchor information for a user.
    /// @param user Address of the user.
    /// @return IdentityAnchor struct (identityHash, timestamp, isSet).
    function getIdentityAnchor(address user) external view returns (SharedStructs.IdentityAnchor memory);

    /// @notice Returns the current maximum batch size.
    /// @return Maximum allowed batch size (default 30).
    function getMaxBatchSize() external view returns (uint256);

    // Admin Functions

    /// @notice Updates the maximum allowed batch size. Only callable by DEFAULT_ADMIN_ROLE.
    /// @param newSize New maximum batch size (must be > 0).
    function setMaxBatchSize(uint256 newSize) external;
}