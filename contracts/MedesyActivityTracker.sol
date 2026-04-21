// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./IMedesyActivityTracker.sol";
import "./structs.sol";

/**
 * @title MedesyActivityTracker
 * @notice Immutable, non-upgradeable contract for healthcare activity tracking and identity anchoring.
 * @dev Implements IMedesyActivityTracker with AccessControl, batch limits, and gas optimisations.
 * @custom:security-contact See security policy.
 */
contract MedesyActivityTracker is IMedesyActivityTracker, AccessControl, ReentrancyGuard {
    using SharedStructs for *;

    /// @notice Maximum batch size hard cap (Polytrade standard: 30 items).
    uint256 public constant MAX_BATCH_SIZE_LIMIT = 30;

    /// @notice Role allowed to update system parameters (e.g., max batch size).
    bytes32 public constant ADMIN_ROLE = DEFAULT_ADMIN_ROLE;

    /// @dev Mapping from user address to an array of anchored activities.
    mapping(address => SharedStructs.Activity[]) private _activities;

    /// @dev Mapping from user address to identity anchor record.
    mapping(address => SharedStructs.IdentityAnchor) private _identityAnchors;

    /// @dev Current maximum batch size (can be reduced by admin, but never exceeds MAX_BATCH_SIZE_LIMIT).
    uint256 private _maxBatchSize;

    /// @notice Initialises the contract, sets up roles and default batch size.
    /// @param initialAdmin Address that will receive DEFAULT_ADMIN_ROLE.
    constructor(address initialAdmin) {
        if (initialAdmin == address(0)) revert InvalidAddress();
        _grantRole(ADMIN_ROLE, initialAdmin);
        _maxBatchSize = MAX_BATCH_SIZE_LIMIT;
    }

    // ----------------------------- Core Functions -----------------------------

    /// @inheritdoc IMedesyActivityTracker
    function anchorActivity(bytes32 activityHash) external nonReentrant {
        _anchorActivity(msg.sender, activityHash);
    }

    /// @inheritdoc IMedesyActivityTracker
    function anchorActivityBatch(bytes32[] calldata activityHashes) external nonReentrant {
        uint256 length = activityHashes.length;
        if (length == 0) revert InvalidFraction();
        if (length > _maxBatchSize) revert BatchLimitExceeded();

        for (uint256 i = 0; i < length; i++) {
            if (activityHashes[i] == bytes32(0)) revert InvalidActivityHash();
            _activities[msg.sender].push(SharedStructs.Activity(block.timestamp, activityHashes[i]));
        }

        emit BatchActivityAnchored(msg.sender, activityHashes, block.timestamp);
    }

    /// @inheritdoc IMedesyActivityTracker
    function anchorIdentity(bytes32 identityHash) external nonReentrant {
        if (identityHash == bytes32(0)) revert InvalidActivityHash();
        SharedStructs.IdentityAnchor storage anchor = _identityAnchors[msg.sender];
        if (anchor.isSet) revert IdentityAlreadySet();

        anchor.identityHash = identityHash;
        anchor.timestamp = block.timestamp;
        anchor.isSet = true;

        emit IdentityAnchored(msg.sender, identityHash, block.timestamp);
    }

    // ----------------------------- View Functions -----------------------------

    /// @inheritdoc IMedesyActivityTracker
    function getActivityCount(address user) external view returns (uint256) {
        return _activities[user].length;
    }

    /// @inheritdoc IMedesyActivityTracker
    function getActivities(address user, uint256 startIndex, uint256 endIndex) external view returns (SharedStructs.Activity[] memory) {
        uint256 count = _activities[user].length;
        if (startIndex >= count || endIndex > count || startIndex >= endIndex) {
            return new SharedStructs.Activity[](0);
        }
        uint256 resultLength = endIndex - startIndex;
        SharedStructs.Activity[] memory result = new SharedStructs.Activity[](resultLength);
        for (uint256 i = 0; i < resultLength; i++) {
            result[i] = _activities[user][startIndex + i];
        }
        return result;
    }

    /// @inheritdoc IMedesyActivityTracker
    function getIdentityAnchor(address user) external view returns (SharedStructs.IdentityAnchor memory) {
        return _identityAnchors[user];
    }

    /// @inheritdoc IMedesyActivityTracker
    function getMaxBatchSize() external view returns (uint256) {
        return _maxBatchSize;
    }

    // ----------------------------- Admin Functions -----------------------------

    /// @inheritdoc IMedesyActivityTracker
    function setMaxBatchSize(uint256 newSize) external onlyRole(ADMIN_ROLE) {
        if (newSize == 0 || newSize > MAX_BATCH_SIZE_LIMIT) revert InvalidFraction();
        uint256 oldSize = _maxBatchSize;
        _maxBatchSize = newSize;
        emit MaxBatchSizeUpdated(oldSize, newSize);
    }

    // ----------------------------- Internal Helpers -----------------------------

    /// @dev Internal function to anchor a single activity.
    /// @param user Address of the user anchoring the activity.
    /// @param activityHash Non-zero hash of the activity.
    function _anchorActivity(address user, bytes32 activityHash) internal {
        if (activityHash == bytes32(0)) revert InvalidActivityHash();
        _activities[user].push(SharedStructs.Activity(block.timestamp, activityHash));
        emit ActivityAnchored(user, activityHash, block.timestamp);
    }
}