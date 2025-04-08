// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

interface ILendingPoolStaking {
    error InsufficientBalance();
    error InvalidArgument(string details);
    error InvalidState();
    error Unauthorized();

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

    struct RewardPeriod {
        uint256 rewardsToDistribute;
        uint256 rewardsClaimed;
    }

    event Staked(
        uint256 stakeId,
        address staker,
        address token,
        uint48 start,
        uint48 end,
        uint256[3] amountsPerDuration,
        bool isEscrow
    );
    event StakeStatusChanged(uint256 stakeId, StakeStatus status);
    event EscrowStatusChanged(uint256 stakeId, EscrowStatus status);
    event InflationRewardDistributed();
    event NonInflationRewardDistributed();

    function deposit(
        address _stakeToken,
        uint256 _amount,
        uint8 _durationId
    ) external payable;

    function stakeEscrowedReward(uint256 _stakeId) external;

    function distributeInflationRewards(uint256 _inflationReward) external;

    function distributeNonInflationRewards() external;

    function hasPendingNonInflationRewards() external view returns (bool);

    function unstake(uint256 _stakeId) external;

    function addStakeToken(address _stakeToken) external;

    function removeStakeToken(address _stakeToken) external;
}
