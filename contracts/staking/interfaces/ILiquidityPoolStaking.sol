// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

interface ILiquidityPoolStaking {
    event FarmCreated(
        uint256 farmId,
        address token,
        uint48 start,
        uint48 end,
        uint256 totalReward
    );
    event FarmClosed(
        uint256 farmId
    );
    event Staked(
        uint256 stakeId,
        address staker,
        uint256 farmId,
        uint48 start,
        uint256 amount
    );
    event Unstaked(uint256 stakeId, uint48 unstakedAt);
    event RewardClaimed(uint256 stakeId, uint256 rewardClaimed, uint48 lastClaimedAt);

    struct Farm {
        address token;
        uint48 start;
        uint48 end;
        uint256 totalReward;
        uint256 totalStaked;
    }

    struct Stake {
        // Staker address
        address staker;
        // Stake token address
        uint256 farmId;
        // The time of deposit
        uint48 start;
        // The time of unstake
        uint48 end;
        // The time of last reward claim
        uint48 lastClaimedAt;
        // The staked amount
        uint256 amount;
        // The amount of NEND claimed
        uint256 rewardClaimed;
    }

    function create(
        address _stakeToken,
        uint48 _end,
        uint256 _totalReward
    ) external;

    function deposit(
        uint256 _farmId,
        uint256 _amount
    ) external;

    function unstake(uint256 _stakeId) external;

    function claim(uint256 _stakeId) external;

    function claimBatch(uint256 _farmId) external;
}
