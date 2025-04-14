// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../vault/Vault.sol";
import "./interfaces/ILendingPoolStakingV2.sol";

/**
 * @title StakingLib
 * @dev Library containing complete function implementations moved from LendingPoolStakingV2
 */
library StakingLib {
    uint8 public constant REWARD_PERIOD_LENGTH = 2;
    event Staked(
        uint256 stakeId,
        address staker,
        address token,
        uint48 start,
        uint48 end,
        uint256[3] amountsPerDuration,
        bool isEscrow
    );

    function validateStake(
        bool isActiveStakeToken,
        uint8 durationId,
        uint256 amount
    ) external pure {
        if (amount == 0) {
            revert ILendingPoolStakingV2.InvalidArgument(
                "Amount cannot be zero"
            );
        }
        if (!isActiveStakeToken) {
            revert ILendingPoolStakingV2.InvalidArgument("Invalid stake token");
        }
        if (durationId > 2) {
            revert ILendingPoolStakingV2.InvalidArgument("Invalid duration ID");
        }
    }

    function migrateStake(
        mapping(uint256 => ILendingPoolStakingV2.Stake) storage stakes,
        mapping(uint256 => ILendingPoolStakingV2.Stake)
            storage userSpecificStakes,
        mapping(address => uint256) storage userStakesCount,
        mapping(uint256 => ILendingPoolStakingV2.StakeMappingEntry)
            storage _stakeEntries,
        mapping(address => mapping(uint256 => uint256)) storage _userIndexToId,
        uint256 stakeId,
        address nend
    ) external returns (bool migrated) {
        ILendingPoolStakingV2.Stake storage stake = stakes[stakeId];

        if (
            stake.staker != address(0) &&
            stake.stakeStatus != ILendingPoolStakingV2.StakeStatus.FULFILLED
        ) {
            // Skip if already migrated
            if (_stakeEntries[stakeId].exists) {
                return false;
            }

            // Create a memory copy of the stake
            ILendingPoolStakingV2.Stake memory stakeCopy = stakes[stakeId];

            // Modify the token if it's an escrow stake
            if (stakeCopy.isEscrow) {
                stakeCopy.token = nend;
            }

            // Get the next available user stake index
            uint256 userStakeIdx = userStakesCount[stakeCopy.staker] + 1;

            // Store the modified copy, not the original storage reference
            userSpecificStakes[userStakeIdx] = stakeCopy;

            // Create mapping entry
            setStakeMapping(
                _stakeEntries,
                _userIndexToId,
                stakeId,
                stakeCopy.staker,
                userStakeIdx
            );

            userStakesCount[stakeCopy.staker]++;
            return true;
        }
        return false;
    }

    /**
     * @notice Complete implementation of getClaimableRewards
     * @dev Moved entirely from main contract to reduce bytecode
     */
    function getClaimableRewards(
        mapping(uint256 => ILendingPoolStakingV2.Stake)
            storage userSpecificStakes,
        uint256 userStakeCount,
        ILendingPoolStakingV2.RewardPeriod[2] storage _recentPeriods,
        mapping(address => mapping(uint64 => mapping(address => bool)))
            storage _userClaimedForPeriod,
        mapping(address => mapping(uint8 => uint256))
            storage totalStakedByToken_Duration,
        uint256 _currentPeriodId,
        address nend,
        address _user,
        address _token
    ) external view returns (uint256 inflationReward, uint256 ifpReward) {
        // Get the current period (the one users can claim from)
        //
        ILendingPoolStakingV2.RewardPeriod storage period = _recentPeriods[
            _currentPeriodId
        ];

        // If the user already claimed for this period, return zeros
        if (_userClaimedForPeriod[_user][period.periodId][_token]) {
            return (0, 0);
        }

        // Get total staked amount for this token
        uint256 totalTokenStaked = getTotalStakesForToken(
            totalStakedByToken_Duration,
            _token
        );

        // If nothing staked, no rewards
        if (totalTokenStaked == 0) {
            return (0, 0);
        }

        // Get user's total stake for this token
        uint256 userStakedAmount = calculateUserStakesTotal(
            userSpecificStakes,
            userStakeCount,
            _token,
            nend
        );

        if (userStakedAmount == 0) {
            return (0, 0);
        }

        // Calculate proportional rewards
        inflationReward =
            (period.rewardsToDistribute * userStakedAmount) /
            totalTokenStaked;
        ifpReward =
            (period.ifpRewardPeriod[_token].rewardToDistribute *
                userStakedAmount) /
            totalTokenStaked;

        return (inflationReward, ifpReward);
    }

    /**
     * @notice Complete implementation of claim function logic
     * @dev Moved entirely from main contract to reduce bytecode
     */
    function processClaim(
        mapping(uint256 => ILendingPoolStakingV2.Stake)
            storage userSpecificStakes,
        mapping(address => mapping(uint8 => uint256))
            storage totalStakedByToken_Duration,
        uint256 userStakeCount,
        mapping(address => mapping(uint64 => mapping(address => bool)))
            storage _userClaimedForPeriod,
        ILendingPoolStakingV2.RewardPeriod storage period,
        address _token,
        address nend,
        address user
    )
        external
        returns (uint256 inflationReward, uint256 ifpReward, uint64 periodId)
    {
        // Check if already claimed
        if (_userClaimedForPeriod[user][period.periodId][_token]) {
            revert ILendingPoolStakingV2.AlreadyClaimed();
        }

        // Get total staked amount for this token
        uint256 totalTokenStakeAmount = getTotalStakesForToken(
            totalStakedByToken_Duration,
            _token
        );

        // If nothing staked, no rewards
        if (totalTokenStakeAmount == 0) {
            revert ILendingPoolStakingV2.NoStakeYet();
        }

        // Get user's total stake for this token
        uint256 userStakeAmount = calculateUserStakesTotal(
            userSpecificStakes,
            userStakeCount,
            _token,
            nend
        );

        if (userStakeAmount == 0) {
            revert ILendingPoolStakingV2.StakeNotFound();
        }

        // Calculate proportional rewards
        inflationReward =
            (period.rewardsToDistribute * userStakeAmount) /
            totalTokenStakeAmount;
        ifpReward =
            (period.ifpRewardPeriod[_token].rewardToDistribute *
                userStakeAmount) /
            totalTokenStakeAmount;

        if (inflationReward == 0 && ifpReward == 0) {
            revert ILendingPoolStakingV2.NoRewardsAvailable();
        }

        // Update period totals
        period.rewardsStaked += inflationReward;
        period.ifpRewardPeriod[_token].rewardClaimed += ifpReward;

        periodId = period.periodId;

        // Mark as claimed for this period
        _userClaimedForPeriod[user][period.periodId][_token] = true;

        return (inflationReward, ifpReward, periodId);
    }

    /**
     * @notice Process unstake operation completely
     * @dev Moved from main contract with all logic intact
     */
    function processUnstake(
        ILendingPoolStakingV2.Stake storage stake,
        mapping(address => mapping(uint8 => uint256))
            storage totalStakedByToken_Duration,
        address nend,
        address msgSender
    )
        external
        returns (
            uint256 stakedAmount,
            address tokenToUse
        )
    {
        // Validate
        if (stake.staker != msgSender) {
            revert ILendingPoolStakingV2.Unauthorized();
        }

        if (
            stake.end > block.timestamp ||
            stake.stakeStatus == ILendingPoolStakingV2.StakeStatus.FULFILLED
        ) {
            revert ILendingPoolStakingV2.InvalidState();
        }

        // Calculate amount to return
        unchecked {
            stakedAmount =
                stake.amountsPerDuration[0] +
                stake.amountsPerDuration[1] +
                stake.amountsPerDuration[2];
        }

        tokenToUse = stake.isEscrow ? nend : stake.token;

        // Update totals if staked
        if (stake.stakeStatus == ILendingPoolStakingV2.StakeStatus.STAKED) {
            for (uint8 i = 0; i < 3; ) {
                totalStakedByToken_Duration[
                    stake.isEscrow ? nend : stake.token
                ][i] -= stake.amountsPerDuration[i];
                unchecked {
                    ++i;
                }
            }
        }

        // Update state
        stake.stakeStatus = ILendingPoolStakingV2.StakeStatus.FULFILLED;
    }

    /**
     * @notice Complete implementation of closing the current period
     */
    function closeCurrentPeriod(
        ILendingPoolStakingV2.RewardPeriod[2] storage _recentPeriods,
        uint256 _currentPeriodId,
        uint256 _toDistributeReward,
        uint[] memory _ifptoDistributeReward,
        address[] memory _tokens
    ) external returns (uint256 newCurrentPeriod) {
        // get new current period index(= previous period != current period)
        // when old current period is 0, next period is 1
        // when old current period is 1, next period is 0
        newCurrentPeriod =
            (_currentPeriodId + REWARD_PERIOD_LENGTH - 1) %
            REWARD_PERIOD_LENGTH;

        // Set up new period
        _recentPeriods[newCurrentPeriod].periodId =
            _recentPeriods[_currentPeriodId].periodId +
            1;
        // Set up new period start time
        _recentPeriods[newCurrentPeriod].startTime = uint64(block.timestamp);

        // Set up new inflation rewards
        _recentPeriods[newCurrentPeriod]
            .rewardsToDistribute = _toDistributeReward;
        _recentPeriods[newCurrentPeriod].rewardsStaked = 0;

        // Set up IFP rewards
        for (uint8 i = 0; i < _tokens.length; ) {
            _recentPeriods[newCurrentPeriod]
                .ifpRewardPeriod[_tokens[i]]
                .rewardToDistribute = _ifptoDistributeReward[i];
            _recentPeriods[newCurrentPeriod]
                .ifpRewardPeriod[_tokens[i]]
                .rewardClaimed = 0;
            unchecked {
                ++i;
            }
        }

        return (newCurrentPeriod);
    }

    /**
     * @notice Calculates total staked amount by a user for a specific token
     */
    function calculateUserStakesTotal(
        mapping(uint256 => ILendingPoolStakingV2.Stake)
            storage userSpecificStakes,
        uint256 userStakesCount,
        address _token,
        address nend
    ) public view returns (uint256 totalAmount) {
        for (uint256 i = 0; i < userStakesCount; ) {
            // Using storage to avoid unnecessary copying
            ILendingPoolStakingV2.Stake storage stake = userSpecificStakes[
                i + 1
            ];

            // Only include active stakes for the specific token
            if (stake.stakeStatus == ILendingPoolStakingV2.StakeStatus.STAKED) {
                // 1. For escrow stakes, we use nend token
                // 2. For regular stakes, use the actual token
                bool isMatchingToken = stake.isEscrow
                    ? (_token == nend)
                    : (stake.token == _token);

                if (isMatchingToken) {
                    // Sum up all durations in unchecked block
                    unchecked {
                        totalAmount +=
                            stake.amountsPerDuration[0] +
                            stake.amountsPerDuration[1] +
                            stake.amountsPerDuration[2];
                    }
                }
            }

            unchecked {
                ++i;
            }
        }
    }

    /**
     * @notice Gets total staked amount for a token across all durations
     */
    function getTotalStakesForToken(
        mapping(address => mapping(uint8 => uint256))
            storage totalStakedByToken_Duration,
        address _token
    ) public view returns (uint256 totalStaked) {
        unchecked {
            totalStaked =
                totalStakedByToken_Duration[_token][0] +
                totalStakedByToken_Duration[_token][1] +
                totalStakedByToken_Duration[_token][2];
        }
    }

    /**
     * @notice Calculates pool rollover amounts from previous period
     */
    function calculatePoolRollOver(
        ILendingPoolStakingV2.RewardPeriod storage _currentPeriod,
        address[] memory _tokens
    )
        external
        view
        returns (
            uint256 poolRewardRemained,
            uint256[] memory ifpPoolRewardRemained
        )
    {
        // Calculate remaining rewards
        poolRewardRemained = _currentPeriod.rewardsToDistribute <=
            _currentPeriod.rewardsStaked
            ? 0
            : _currentPeriod.rewardsToDistribute - _currentPeriod.rewardsStaked;

        // Calculate remaining IFP rewards for each token
        ifpPoolRewardRemained = new uint256[](_tokens.length);
        for (uint8 i = 0; i < _tokens.length; ) {
            ifpPoolRewardRemained[i] = _currentPeriod.ifpRewardPeriod[_tokens[i]].rewardToDistribute <=
                _currentPeriod.ifpRewardPeriod[_tokens[i]].rewardClaimed
                ? 0
                : _currentPeriod.ifpRewardPeriod[_tokens[i]].rewardToDistribute -
                    _currentPeriod.ifpRewardPeriod[_tokens[i]].rewardClaimed;
            unchecked {
                ++i;
            }
        }
    }

    /**
     * @notice Safely transfers assets from lending pool to recipient
     */
    function lendingPoolTransfer(
        Vault lendingPool,
        address _token,
        address _to,
        uint256 _amount
    ) external {
        bool isNativeCoin = _token == address(0);

        if (isNativeCoin) {
            require(
                address(lendingPool).balance >= _amount,
                "Insufficient balance"
            );
            lendingPool.transferNative(payable(_to), _amount);
        } else {
            require(
                IERC20(_token).balanceOf(address(lendingPool)) >= _amount,
                "Insufficient balance"
            );
            lendingPool.transferERC20(_token, _to, _amount);
        }
    }

    function setStakeMapping(
        mapping(uint256 => ILendingPoolStakingV2.StakeMappingEntry)
            storage _stakeEntries,
        mapping(address => mapping(uint256 => uint256)) storage _userIndexToId,
        uint256 _stakeId,
        address _user,
        uint256 _userIndex
    ) public {
        // Create and store the mapping entry
        _stakeEntries[_stakeId] = ILendingPoolStakingV2.StakeMappingEntry({
            user: _user,
            userIndex: _userIndex,
            stakeId: _stakeId,
            exists: true
        });

        // Update the reverse lookup
        _userIndexToId[_user][_userIndex] = _stakeId;
    }

    function removeUserStake(
        mapping(uint256 => ILendingPoolStakingV2.Stake)
            storage userSpecificStakes,
        mapping(uint256 => ILendingPoolStakingV2.StakeMappingEntry)
            storage _stakeEntries,
        mapping(address => mapping(uint256 => uint256)) storage _userIndexToId,
        mapping(address => uint256) storage userStakesCount,
        address _user,
        uint256 _stakeId,
        uint256 _userIndex
    ) external {
        // Get the last stake index for this user
        uint256 lastUserStakeIdx = userStakesCount[_user];

        // If not the last element, swap with the last element
        if (_userIndex != lastUserStakeIdx) {
            // Get the last stake
            ILendingPoolStakingV2.Stake storage lastStake = userSpecificStakes[
                lastUserStakeIdx
            ];

            // Get last stake ID using the reverse mapping
            uint256 lastStakeId = _userIndexToId[_user][lastUserStakeIdx];

            // Move last stake to current position
            userSpecificStakes[_userIndex] = lastStake;

            // Update the stake ID mapping for the moved stake
            setStakeMapping(
                _stakeEntries,
                _userIndexToId,
                lastStakeId,
                _user,
                _userIndex
            );
        }

        // Clean up the last position
        delete userSpecificStakes[lastUserStakeIdx];

        // Delete the original stake mapping
        delete _userIndexToId[_user][lastUserStakeIdx];
        delete _stakeEntries[_stakeId];

        // Decrement the user's stake count
        userStakesCount[_user]--;
    }

    function _saveStakedRewards(
        mapping(address => mapping(uint8 => uint256))
            storage totalStakedByToken_Duration,
        address nend,
        uint256[3] memory _amounts
    ) internal {
        for (uint8 i = 0; i < 3; ) {
            totalStakedByToken_Duration[nend][i] += _amounts[i];
            unchecked {
                ++i;
            }
        }
    }

    function _createAndMapStake(
        ILendingPoolStakingV2.Stake storage newStake,
        address _staker,
        uint256[3] memory _amounts,
        address _token,
        uint48 _duration,
        bool _isEscrow,
        uint256 stakeId,
        uint256 userStakeIdx,
        mapping(uint256 => ILendingPoolStakingV2.StakeMappingEntry)
            storage _stakeEntries,
        mapping(address => mapping(uint256 => uint256)) storage _userIndexToId,
        bool testing
    ) internal returns (uint256) {
        // Get lock period for escrow
        uint48 start = uint48(block.timestamp);

        newStake.staker = _staker;
        newStake.token = _token;
        newStake.start = start;
        newStake.end = start + _duration / (testing ? 1008 : 1);
        newStake.amountsPerDuration = _amounts;
        newStake.rewardAllocated = 0;
        newStake.isEscrow = _isEscrow;
        newStake.escrowStatus = ILendingPoolStakingV2.EscrowStatus.DEFAULT;
        newStake.stakeStatus = ILendingPoolStakingV2.StakeStatus.STAKED;

        // Map the stake ID to the user and index
        setStakeMapping(
            _stakeEntries,
            _userIndexToId,
            stakeId,
            _staker,
            userStakeIdx
        );

        return userStakeIdx;
    }
}
