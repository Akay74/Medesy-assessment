// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MedesyActivityTracker
 * @notice On-chain activity tracking with rank derivation
 * @dev Optimized for gas efficiency with access control
 */
contract MedesyActivityTracker {
    
    // State Variables
    
    /// @notice Authorized relayer address that can record activities
    address public relayer;
    
    /// @notice Contract owner for administrative functions
    address public owner;
    
    /// @notice Mapping of user wallet => activity score
    mapping(address => uint256) public activityScores;
    
    /// @notice Mapping of user wallet => total actions count
    mapping(address => uint256) public actionCount;
    
    /// @notice Mapping of user wallet => last activity timestamp
    mapping(address => uint256) public lastActivity;
    
    // Rank Thresholds
    
    uint256 public constant BRONZE_THRESHOLD = 0;
    uint256 public constant SILVER_THRESHOLD = 100;
    uint256 public constant GOLD_THRESHOLD = 500;
    uint256 public constant PLATINUM_THRESHOLD = 1000;
    
    // Events
    
    event ActivityRecorded(
        address indexed user,
        uint256 points,
        uint256 newTotal,
        uint256 timestamp
    );
    
    event RelayerUpdated(address indexed oldRelayer, address indexed newRelayer);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    
    // Errors
    
    error Unauthorized();
    error InvalidAddress();
    error InvalidPoints();
    
    // Modifiers
    
    modifier onlyRelayer() {
        if (msg.sender != relayer) revert Unauthorized();
        _;
    }
    
    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }
    
    // Constructor
    
    constructor(address _relayer) {
        if (_relayer == address(0)) revert InvalidAddress();
        
        owner = msg.sender;
        relayer = _relayer;
        
        emit RelayerUpdated(address(0), _relayer);
    }
    
    // Core Functions
    
    /**
     * @notice Record activity for a user (callable only by relayer)
     * @param user The user's wallet address
     * @param points Points to award for this activity
     * @dev Gas optimized: single SSTORE for score, packed storage reads
     */
    function recordActivity(address user, uint256 points) external onlyRelayer {
        if (user == address(0)) revert InvalidAddress();
        if (points == 0) revert InvalidPoints();
        
        // Update state
        uint256 newScore = activityScores[user] + points;
        activityScores[user] = newScore;
        actionCount[user]++;
        lastActivity[user] = block.timestamp;
        
        emit ActivityRecorded(user, points, newScore, block.timestamp);
    }
    
    // View Functions - Rank Derivation
    
    /**
     * @notice Get user's rank based on activity score
     * @param user The user's wallet address
     * @return rank The rank as a string
     * @dev Pure on-chain derivation, no off-chain dependencies
     */
    function getRank(address user) external view returns (string memory rank) {
        uint256 score = activityScores[user];
        
        if (score >= PLATINUM_THRESHOLD) {
            return "Platinum";
        } else if (score >= GOLD_THRESHOLD) {
            return "Gold";
        } else if (score >= SILVER_THRESHOLD) {
            return "Silver";
        } else {
            return "Bronze";
        }
    }
    
    /**
     * @notice Get user's rank as uint (gas efficient for off-chain processing)
     * @param user The user's wallet address
     * @return rankLevel 0=Bronze, 1=Silver, 2=Gold, 3=Platinum
     */
    function getRankLevel(address user) external view returns (uint8 rankLevel) {
        uint256 score = activityScores[user];
        
        if (score >= PLATINUM_THRESHOLD) return 3;
        if (score >= GOLD_THRESHOLD) return 2;
        if (score >= SILVER_THRESHOLD) return 1;
        return 0;
    }
    
    /**
     * @notice Get complete user profile
     * @param user The user's wallet address
     * @return score Total activity score
     * @return actions Total number of actions
     * @return lastActive Timestamp of last activity
     * @return rank Current rank string
     */
    function getUserProfile(address user) 
        external 
        view 
        returns (
            uint256 score,
            uint256 actions,
            uint256 lastActive,
            string memory rank
        ) 
    {
        score = activityScores[user];
        actions = actionCount[user];
        lastActive = lastActivity[user];
        
        if (score >= PLATINUM_THRESHOLD) {
            rank = "Platinum";
        } else if (score >= GOLD_THRESHOLD) {
            rank = "Gold";
        } else if (score >= SILVER_THRESHOLD) {
            rank = "Silver";
        } else {
            rank = "Bronze";
        }
    }
    
    /**
     * @notice Check if user qualifies for a specific rank
     * @param user The user's wallet address
     * @param requiredRank 0=Bronze, 1=Silver, 2=Gold, 3=Platinum
     * @return qualified True if user meets or exceeds the rank
     */
    function hasRank(address user, uint8 requiredRank) external view returns (bool qualified) {
        uint256 score = activityScores[user];
        
        if (requiredRank == 3) return score >= PLATINUM_THRESHOLD;
        if (requiredRank == 2) return score >= GOLD_THRESHOLD;
        if (requiredRank == 1) return score >= SILVER_THRESHOLD;
        return true; // Everyone has Bronze
    }
    
    // Admin Functions
    
    /**
     * @notice Update the relayer address
     * @param newRelayer New relayer address
     */
    function updateRelayer(address newRelayer) external onlyOwner {
        if (newRelayer == address(0)) revert InvalidAddress();
        
        address oldRelayer = relayer;
        relayer = newRelayer;
        
        emit RelayerUpdated(oldRelayer, newRelayer);
    }
    
    /**
     * @notice Transfer contract ownership
     * @param newOwner New owner address
     */
    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert InvalidAddress();
        
        address oldOwner = owner;
        owner = newOwner;
        
        emit OwnershipTransferred(oldOwner, newOwner);
    }
}