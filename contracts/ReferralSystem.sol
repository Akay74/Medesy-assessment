// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./IReferralSystem.sol";

/**
 * @title ReferralSystem
 * @notice Immutable, non-upgradeable referral tracking system with off-chain reward distribution.
 * @dev Implements IReferralSystem with AccessControl, batch limits, and SafeERC20.
 * @custom:security-contact See security policy.
 */
contract ReferralSystem is IReferralSystem, AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// @notice Hard cap for batch operations (Polytrade standard).
    uint256 public constant MAX_BATCH_SIZE_LIMIT = 30;

    /// @notice Role authorised to allocate rewards (typically backend).
    bytes32 public constant REWARD_ROLE = keccak256("REWARD_ROLE");

    /// @notice Role authorised to register users (optional, can be same as admin or backend).
    bytes32 public constant REGISTRAR_ROLE = keccak256("REGISTRAR_ROLE");

    /// @notice Default admin role (manages roles and batch size).
    bytes32 public constant ADMIN_ROLE = DEFAULT_ADMIN_ROLE;

    /// @dev Mapping from user address to referrer address (immutable once set).
    mapping(address => address) private _userToReferrer;

    /// @dev Accumulated rewards per referrer (in token smallest units).
    mapping(address => uint256) private _rewards;

    /// @dev ERC20 token used for rewards.
    IERC20 private _rewardToken;

    /// @dev Current maximum batch size (adjustable by admin, never exceeds MAX_BATCH_SIZE_LIMIT).
    uint256 private _maxBatchSize;

    /// @notice Initialises the referral system with token and admin.
    /// @param rewardTokenAddress Address of the ERC20 reward token.
    /// @param initialAdmin Address that will receive DEFAULT_ADMIN_ROLE and REGISTRAR_ROLE.
    constructor(address rewardTokenAddress, address initialAdmin) {
        if (rewardTokenAddress == address(0) || initialAdmin == address(0)) revert InvalidAddress();
        _rewardToken = IERC20(rewardTokenAddress);
        _grantRole(ADMIN_ROLE, initialAdmin);
        _grantRole(REGISTRAR_ROLE, initialAdmin);
        // Optionally grant REWARD_ROLE to admin, but can be assigned separately.
        _setRoleAdmin(REWARD_ROLE, ADMIN_ROLE);
        _setRoleAdmin(REGISTRAR_ROLE, ADMIN_ROLE);
        _maxBatchSize = MAX_BATCH_SIZE_LIMIT;
        emit RewardTokenSet(rewardTokenAddress);
    }

    // ----------------------------- Core Functions -----------------------------

    /// @inheritdoc IReferralSystem
    function registerReferral(address user, address referrer) public nonReentrant {
        _registerReferral(user, referrer);
    }

    /// @inheritdoc IReferralSystem
    function batchRegisterReferral(address[] calldata users, address[] calldata referrers) external nonReentrant {
        uint256 length = users.length;
        if (length == 0) revert InvalidFraction();
        if (length > _maxBatchSize) revert BatchLimitExceeded();
        if (length != referrers.length) revert NoArrayParity();

        for (uint256 i = 0; i < length; i++) {
            _registerReferral(users[i], referrers[i]);
        }
    }

    /// @inheritdoc IReferralSystem
    function batchAddRewards(address[] calldata referrers, uint256[] calldata amounts) external onlyRole(REWARD_ROLE) nonReentrant {
        uint256 length = referrers.length;
        if (length == 0) revert InvalidFraction();
        if (length > _maxBatchSize) revert BatchLimitExceeded();
        if (length != amounts.length) revert NoArrayParity();

        for (uint256 i = 0; i < length; i++) {
            address referrer = referrers[i];
            uint256 amount = amounts[i];
            if (referrer == address(0)) revert InvalidAddress();
            if (amount == 0) continue; // Skip zero allocations, but no revert.
            _rewards[referrer] += amount;
            emit RewardAllocated(referrer, amount);
        }
    }

    /// @inheritdoc IReferralSystem
    function claimRewards() external nonReentrant {
        address referrer = msg.sender;
        uint256 amount = _rewards[referrer];
        if (amount == 0) revert NoRewardsToClaim();

        _rewards[referrer] = 0;
        _rewardToken.safeTransfer(referrer, amount);
        emit RewardClaimed(referrer, amount);
    }

    // ----------------------------- View Functions -----------------------------

    /// @inheritdoc IReferralSystem
    function getReferrer(address user) external view returns (address) {
        return _userToReferrer[user];
    }

    /// @inheritdoc IReferralSystem
    function getPendingRewards(address referrer) external view returns (uint256) {
        return _rewards[referrer];
    }

    /// @inheritdoc IReferralSystem
    function getRewardToken() external view returns (address) {
        return address(_rewardToken);
    }

    /// @inheritdoc IReferralSystem
    function getMaxBatchSize() external view returns (uint256) {
        return _maxBatchSize;
    }

    // ----------------------------- Admin Functions -----------------------------

    /// @inheritdoc IReferralSystem
    function setMaxBatchSize(uint256 newSize) external onlyRole(ADMIN_ROLE) {
        if (newSize == 0 || newSize > MAX_BATCH_SIZE_LIMIT) revert InvalidFraction();
        uint256 oldSize = _maxBatchSize;
        _maxBatchSize = newSize;
        emit MaxBatchSizeUpdated(oldSize, newSize);
    }

    // ----------------------------- Internal Helpers -----------------------------

    /// @dev Internal function to register a single user-referrer pair.
    /// @param user Address of the user.
    /// @param referrer Address of the referrer.
    function _registerReferral(address user, address referrer) internal {
        if (user == address(0) || referrer == address(0)) revert InvalidAddress();
        if (user == referrer) revert SelfReferral();
        if (_userToReferrer[user] != address(0)) revert AlreadyReferralSet();

        _userToReferrer[user] = referrer;
        emit UserRegistered(user, referrer);
    }
}