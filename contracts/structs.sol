// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

/**
 * @title SharedStructs
 * @notice Common data structures used across multiple contracts.
 * @dev Follows Polytrade pattern of centralising struct definitions.
 */
library SharedStructs {
    /// @notice Represents a single anchored activity.
    struct Activity {
        uint256 timestamp;   ///< Block timestamp when activity was anchored.
        bytes32 activityHash; ///< Hash of the off-chain activity data.
    }

    /// @notice Identity anchoring record.
    struct IdentityAnchor {
        bytes32 identityHash; ///< Hash of identity document or commitment.
        uint256 timestamp;    ///< Block timestamp when identity was anchored.
        bool isSet;           ///< Whether identity is already set.
    }
}