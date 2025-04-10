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
    ) public pure {
        if (amount == 0) {
            revert ILendingPoolStakingV2.InvalidArgument("Amount cannot be zero");
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
        mapping(uint256 => ILendingPoolStakingV2.Stake) storage stakesByIdx,
        mapping(address => uint256) storage userStakesCount,
        mapping(uint256 => ILendingPoolStakingV2.StakeMappingEntry) storage _stakeEntries,
        mapping(address => mapping(uint256 => uint256)) storage _userIndexToId,
        uint256 stakeId,
        address nend
    ) public returns (bool migrated) {
        ILendingPoolStakingV2.Stake storage stake = stakes[stakeId];
        
        if (
            stake.staker != address(0) &&
            stake.stakeStatus != ILendingPoolStakingV2.StakeStatus.FULFILLED
        ) {
            // Skip if already migrated
            if (_stakeEntries[stakeId].exists) {
                return false;
            }
            
            uint256 userStakeIdx = userStakesCount[stake.staker] + 1;
            stake.token = stake.isEscrow ? nend : stake.token;
            stakesByIdx[userStakeIdx] = stake;
            
            // Create mapping entry
            setStakeMapping(
                _stakeEntries,
                _userIndexToId,
                stakeId,
                stake.staker,
                userStakeIdx
            );
            
            userStakesCount[stake.staker]++;
            return true;
        }
        return false;
    }

    /**
     * @notice Complete implementation of getClaimableRewards
     * @dev Moved entirely from main contract to reduce bytecode
     */
    function getClaimableRewards(
        mapping(uint256 => ILendingPoolStakingV2.Stake) storage stakesByIdx,
        uint256 userStakeCount,
        ILendingPoolStakingV2.RewardPeriod[2] storage _recentPeriods,
        mapping(address => mapping(uint64 => bool))
            storage _userClaimedForPeriod,
        mapping(address => mapping(uint8 => uint256))
            storage totalStakedByToken_Duration,
        uint256 _currentPeriod,
        address nend,
        address _user,
        address _token
    ) public view returns (uint256 inflationReward, uint256 ifpReward) {
        // Get the previous period (the one users can claim from)
        uint256 idx = 1; // Previous period
        uint256 periodIndex = (_currentPeriod + idx) %
            uint256(REWARD_PERIOD_LENGTH);
        ILendingPoolStakingV2.RewardPeriod storage period = _recentPeriods[
            periodIndex
        ];

        // If the user already claimed for this period, return zeros
        if (_userClaimedForPeriod[_user][period.periodId]) {
            return (0, 0);
        }

        // Get total staked amount for this token
        uint256 totalTokenStaked = getTotalStakedForToken(
            totalStakedByToken_Duration,
            _token
        );

        // If nothing staked, no rewards
        if (totalTokenStaked == 0) {
            return (0, 0);
        }

        // Get user's total stake for this token
        uint256 userStakedAmount = calculateUserStakesTotal(
            stakesByIdx,
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
            (period.ifpRewardToDistribute * userStakedAmount) /
            totalTokenStaked;

        return (inflationReward, ifpReward);
    }

    /**
     * @notice Complete implementation of claim function logic
     * @dev Moved entirely from main contract to reduce bytecode
     */
    function processClaim(
        mapping(uint256 => ILendingPoolStakingV2.Stake) storage stakesByIdx,
        mapping(address => mapping(uint8 => uint256))
            storage totalStakedByToken_Duration,
        uint256 userStakeCount,
        mapping(address => mapping(uint64 => bool))
            storage _userClaimedForPeriod,
        ILendingPoolStakingV2.RewardPeriod storage period,
        address _token,
        address nend
    )
        public
        returns (uint256 inflationReward, uint256 ifpReward, uint64 periodId)
    {
        // Check if already claimed
        if (_userClaimedForPeriod[msg.sender][period.periodId]) {
            revert ILendingPoolStakingV2.AlreadyClaimed();
        }

        // Get total staked amount for this token
        uint256 totalTokenStakeAmount = getTotalStakedForToken(
            totalStakedByToken_Duration,
            _token
        );

        // If nothing staked, no rewards
        if (totalTokenStakeAmount == 0) {
            revert ILendingPoolStakingV2.NoStakeYet();
        }

        // Get user's total stake for this token
        uint256 userStakeAmount = calculateUserStakesTotal(
            stakesByIdx,
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
            (period.ifpRewardToDistribute * userStakeAmount) /
            totalTokenStakeAmount;

        if (inflationReward == 0 && ifpReward == 0) {
            revert ILendingPoolStakingV2.NoRewardsAvailable();
        }

        // Update period totals
        period.rewardsStaked += inflationReward;
        period.ifpRewardClaimed += ifpReward;

        periodId = period.periodId;

        // Mark as claimed for this period
        _userClaimedForPeriod[msg.sender][period.periodId] = true;

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
        public
        returns (
            uint256 stakedAmount,
            uint256 rewardAmount,
            address tokenToUse,
            bool needsBurn
        )
    {
        // Validate
        if (stake.staker != msgSender) {
            revert ILendingPoolStakingV2.Unauthorized();
        }

        if (
            stake.end > block.timestamp ||
            stake.stakeStatus == ILendingPoolStakingV2.StakeStatus.FULFILLED ||
            stake.escrowStatus == ILendingPoolStakingV2.EscrowStatus.CLAIMED
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

        // Get reward and token
        rewardAmount = stake.rewardAllocated;
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

        // Check if burn needed
        needsBurn =
            stake.escrowStatus == ILendingPoolStakingV2.EscrowStatus.ISSUED ||
            stake.isEscrow;

        if (needsBurn) {
            stake.escrowStatus = ILendingPoolStakingV2.EscrowStatus.CLAIMED;
        }

        return (stakedAmount, rewardAmount, tokenToUse, needsBurn);
    }

    /**
     * @notice Complete implementation of closing the current period
     */
    function closeCurrentPeriod(
        ILendingPoolStakingV2.RewardPeriod[2] storage _recentPeriods,
        uint256 _currentPeriod,
        uint256 toDistributeReward,
        uint256 ifptoDistributeReward
    ) public returns (uint256 newCurrentPeriod) {
        // Logic for period closing
        uint256 nextCalcIndex = (_currentPeriod + 1) %
            uint256(REWARD_PERIOD_LENGTH);

        // Clear old data
        delete _recentPeriods[nextCalcIndex];

        // Set up new period
        _recentPeriods[nextCalcIndex].periodId =
            _recentPeriods[_currentPeriod].periodId +
            1;
        _recentPeriods[nextCalcIndex].startTime = uint64(block.timestamp);
        _recentPeriods[nextCalcIndex].rewardsToDistribute = toDistributeReward;
        _recentPeriods[nextCalcIndex]
            .ifpRewardToDistribute = ifptoDistributeReward;

        // Update current period
        newCurrentPeriod =
            (_currentPeriod + REWARD_PERIOD_LENGTH - 1) %
            REWARD_PERIOD_LENGTH;

        return (newCurrentPeriod);
    }

    /**
     * @notice Create escrow stake with complete logic
     */
    function setStakeData(
        ILendingPoolStakingV2.Stake storage stake,
        address _staker,
        uint256[3] memory _amounts,
        address _token,
        uint48 lockPeriod,
        bool isEscrow,
        bool testing
    ) public {
        // Get lock period for escrow
        uint48 start = uint48(block.timestamp);

        stake.staker = _staker;
        stake.token = _token;
        stake.start = start;
        stake.end = start + lockPeriod / (testing ? 1008 : 1);
        stake.amountsPerDuration = _amounts;
        stake.rewardAllocated = 0;
        stake.isEscrow = isEscrow;
        stake.escrowStatus = ILendingPoolStakingV2.EscrowStatus.DEFAULT;
        stake.stakeStatus = ILendingPoolStakingV2.StakeStatus.STAKED;
    }

    /**
     * @notice Calculates total staked amount by a user for a specific token
     */
    function calculateUserStakesTotal(
        mapping(uint256 => ILendingPoolStakingV2.Stake) storage stakesByIdx,
        uint256 userStakeCount,
        address _token,
        address nend
    ) public view returns (uint256 totalAmount) {
        for (uint256 i = 0; i < userStakeCount; ) {
            // Using storage to avoid unnecessary copying
            ILendingPoolStakingV2.Stake storage stake = stakesByIdx[i + 1];

            // Only include active stakes for the specific token
            if (stake.stakeStatus == ILendingPoolStakingV2.StakeStatus.STAKED) {
                bool isMatchingToken = stake.token == _token ||
                    (stake.isEscrow && _token == nend);

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
    function getTotalStakedForToken(
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
        ILendingPoolStakingV2.RewardPeriod[2] storage _recentPeriods,
        uint256 _currentPeriod
    )
        public
        view
        returns (uint256 poolRewardRemained, uint256 ifpPoolRewardRemained)
    {
        // Get the storage slot for the current period
        uint256 idx = (_currentPeriod + 0) % uint256(REWARD_PERIOD_LENGTH);

        // Calculate remaining rewards
        poolRewardRemained =
            _recentPeriods[idx].rewardsToDistribute -
            _recentPeriods[idx].rewardsStaked;

        ifpPoolRewardRemained =
            _recentPeriods[idx].ifpRewardToDistribute -
            _recentPeriods[idx].ifpRewardClaimed;
    }

    /**
     * @notice Safely transfers assets from lending pool to recipient
     */
    function lendingPoolTransfer(
        Vault lendingPool,
        address _token,
        address _to,
        uint256 _amount
    ) public {
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
        mapping(uint256 => ILendingPoolStakingV2.Stake) storage stakesByIdx,
        mapping(uint256 => ILendingPoolStakingV2.StakeMappingEntry)
            storage _stakeEntries,
        mapping(address => mapping(uint256 => uint256)) storage _userIndexToId,
        mapping(address => uint256) storage userStakesCount,
        address _user,
        uint256 _stakeId,
        uint256 _userIndex
    ) public {
        // Get the last stake index for this user
        uint256 lastUserStakeIdx = userStakesCount[_user];

        // If not the last element, swap with the last element
        if (_userIndex != lastUserStakeIdx) {
            // Get the last stake
            ILendingPoolStakingV2.Stake storage lastStake = stakesByIdx[
                lastUserStakeIdx
            ];
            //
            // Get last stake ID using the reverse mapping directly
            uint256 lastStakeId = _userIndexToId[_user][lastUserStakeIdx];

            // Move last stake to current position
            stakesByIdx[_userIndex] = lastStake;

            // Update the stake ID mapping
            setStakeMapping(
                _stakeEntries,
                _userIndexToId,
                lastStakeId,
                _user,
                _userIndex
            );
        }

        // Clean up
        delete stakesByIdx[lastUserStakeIdx];
        if (_stakeEntries[lastUserStakeIdx].exists) {
            delete _userIndexToId[_stakeEntries[lastUserStakeIdx].user][
                _stakeEntries[lastUserStakeIdx].userIndex
            ];
            delete _stakeEntries[_stakeId];
        }
        userStakesCount[_user]--;
    }

    function _saveStakedRewards(
        mapping(address => mapping(uint8 => uint256))
            storage totalStakedByToken_Duration,
        address nend,
        uint256[3] memory _amounts) internal {
        for (uint8 i = 0; i < 3; ) {
            totalStakedByToken_Duration[nend][i] += _amounts[i];
            unchecked {
                ++i;
            }
        }
    }


    function _createAndMapStake(
        mapping(uint256 => ILendingPoolStakingV2.Stake) storage stakesByIdx,
        uint256 userStakeIdx,
        address _staker,
        uint256[3] memory _amounts,
        address _token,
        uint48 _duration,
        bool _isEscrow,
        uint256 stakeId,
        mapping(address => uint256) storage userStakesCount,
        mapping(uint256 => ILendingPoolStakingV2.StakeMappingEntry)
            storage _stakeEntries,
        mapping(address => mapping(uint256 => uint256)) storage _userIndexToId,
        bool testing
    ) internal returns (uint256) {
        // Directly initialize the stake in storage
        // This avoids copying from memory to storage
        ILendingPoolStakingV2.Stake storage newStake = stakesByIdx[userStakeIdx];
        setStakeData(
            newStake,
            _staker,
            _amounts,
            _token,
            _duration,
            _isEscrow,
            testing
        );

        stakesByIdx[userStakesCount[_staker]] = newStake;
        userStakesCount[_staker]++;

        // Map the stake ID to the user and index
        setStakeMapping(
            _stakeEntries,
            _userIndexToId,
            stakeId,
            _staker,
            userStakesCount[_staker]
        );

        _emitStaked(stakeId, newStake);

        return stakeId;
    }

    function _emitStaked(
        uint256 _stakeId,
        ILendingPoolStakingV2.Stake memory _stake
    ) public {
        emit Staked(
            _stakeId,
            _stake.staker,
            _stake.token,
            _stake.start,
            _stake.end,
            _stake.amountsPerDuration,
            _stake.isEscrow
        );
    }

}
