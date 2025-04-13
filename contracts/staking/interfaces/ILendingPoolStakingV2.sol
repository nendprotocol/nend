// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

interface ILendingPoolStakingV2 {
    error InsufficientBalance();
    error InvalidArgument(string details);
    error InvalidState();
    error Unauthorized();
    error AlreadyClaimed();
    error NoRewardsAvailable();
    error StakeNotFound();
    error NotOwned();
    error NoStakeYet();

    enum StakeStatus {
        DEFAULT, // Not staked, only applicable to escrowed reward
        STAKED, // Stake ongoing
        FULFILLED // Stake ended gracefully
    }

    enum EscrowStatus {
        DEFAULT, // Not issued
        ISSUED,
        CLAIMED
    }
    struct IFPRewardPeriod {
        uint256 rewardToDistribute;
        uint256 rewardClaimed;
    }

    struct RewardPeriod {
        uint64 periodId;
        uint64 startTime;
        uint256 rewardsToDistribute;
        uint256 rewardsStaked;
        mapping(address => IFPRewardPeriod) ifpRewardPeriod;
    }

    /**
     * @notice Combined stake mapping data structure
     * @dev Used to optimize storage by consolidating bidirectional mappings
     */
    struct StakeMappingEntry {
        address user; // Owner of the stake
        uint256 userIndex; // Index in user's personal mapping
        uint256 stakeId; // Global stake ID
        bool exists; // Flag to confirm entry exists
    }

    struct Stake {
        // Staker address
        address staker;
        // Stake token address
        address token;
        // The time of deposit
        uint48 start;
        // The time of withdrawal
        uint48 end;
        // The amount staked by each stake duration
        uint256[3] amountsPerDuration;
        // The amount of stake token that will be rewarded upon finishing the stake duration
        uint256 rewardAllocated;
        // Stake is escrow
        bool isEscrow;
        // Status of eab
        EscrowStatus escrowStatus;
        // Status of stake
        StakeStatus stakeStatus;
    }

    event Staked(
        uint256 indexed stakeId,
        address indexed staker,
        address indexed token,
        uint48 start,
        uint48 end,
        uint256[3] amountsPerDuration,
        bool isEscrow
    );
    event StakeStatusChanged(uint256 indexed stakeId, StakeStatus status);
    event EscrowStatusChanged(uint256 indexed stakeId, EscrowStatus status);
    event InflationRewardDistributed();
    event BatchMigrationCompleted(uint256 indexed startId, uint256 endId);

    event NewPeriodStarted(
        uint64 periodId,
        uint64 timestamp
    );

    event RewardsClaimed(
        uint256 indexed stakeId,
        address indexed user,
        address indexed token,
        uint256 inflationReward,
        uint256 ifpReward,
        uint64 periodId
    );
    function deposit(
        address _stakeToken,
        uint256 _amount,
        uint8 _durationId
    ) external payable;

    function stakeEscrowedReward(uint256 _stakeId) external;

    function distributeInflationRewards(uint256 _inflationReward) external;

    function unstake(uint256 _stakeId) external;

    function addStakeToken(address _stakeToken) external;

    function removeStakeToken(address _stakeToken) external;
}
