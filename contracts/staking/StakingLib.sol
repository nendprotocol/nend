// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../vault/Vault.sol";
import "./interfaces/ILendingPoolStakingV2.sol";

/**
 * @title StakingLib
 * @dev Library containing calculation functions extracted from LendingPoolStakingV2
 * to reduce contract size
 */
library StakingLib {
    /**
     * @notice Calculates total staked amount by a user for a specific token
     * @param userStakesById Mapping of user stakes
     * @param userStakesCount Mapping of user stake counts
     * @param _user Address of the user
     * @param _token Token address to calculate for 
     * @param nend NEND token address for escrow calculations
     * @return totalAmount Total amount staked by user for this token
     */
    function calculateUserStakesTotal(
        mapping(address => mapping(uint256 => ILendingPoolStakingV2.Stake)) storage userStakesById,
        mapping(address => uint256) storage userStakesCount,
        address _user,
        address _token,
        address nend
    ) external view returns (uint256 totalAmount) {
        uint256 userStakeCount = userStakesCount[_user];

        for (uint256 i = 0; i < userStakeCount; ) {
            uint256 idx = i + 1;
            
            // Preliminary check on stake status to avoid loading full struct
            if (userStakesById[_user][idx].stakeStatus == ILendingPoolStakingV2.StakeStatus.STAKED) {
                ILendingPoolStakingV2.Stake storage stake = userStakesById[_user][idx];
                
                // Only include active stakes for the specific token
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
     * @param totalStakedByToken_Duration Mapping of token stakes by duration
     * @param _token Token address to calculate for
     * @return totalStaked Total amount staked for this token
     */
    function getTotalStakedForToken(
        mapping(address => mapping(uint8 => uint256)) storage totalStakedByToken_Duration,
        address _token
    ) external view returns (uint256 totalStaked) {
        unchecked {
            totalStaked =
                totalStakedByToken_Duration[_token][0] +
                totalStakedByToken_Duration[_token][1] +
                totalStakedByToken_Duration[_token][2];
        }
    }

    /**
     * @notice Calculates pool rollover amounts from previous period
     * @param _recentPeriods Storage for reward periods
     * @param _currentPeriod Current period index
     * @param REWARD_PERIOD_LENGTH Length of the reward period array
     * @return poolRewardRemained Remaining inflation rewards
     * @return ifpPoolRewardRemained Remaining IFP rewards
     */
    function calculatePoolRollOver(
        ILendingPoolStakingV2.RewardPeriod[2] storage _recentPeriods,
        uint256 _currentPeriod,
        uint8 REWARD_PERIOD_LENGTH
    ) external view returns (uint256 poolRewardRemained, uint256 ifpPoolRewardRemained) {
        // Get the storage slot for the current period
        uint256 idx = (_currentPeriod + 0) % uint256(REWARD_PERIOD_LENGTH);
        
        // Calculate remaining rewards
        poolRewardRemained +=
            _recentPeriods[idx].rewardsToDistribute -
            _recentPeriods[idx].rewardsStaked;
            
        ifpPoolRewardRemained +=
            _recentPeriods[idx].ifpRewardToDistribute -
            _recentPeriods[idx].ifpRewardClaimed;
    }

    /**
     * @notice Safely transfers assets from lending pool to recipient
     * @param lendingPool Vault contract reference
     * @param _token Token address (address(0) for native)
     * @param _to Recipient address
     * @param _amount Amount to transfer
     */
    function lendingPoolTransfer(
        Vault lendingPool,
        address _token,
        address _to,
        uint256 _amount
    ) external {
        bool isNativeCoin = _token == address(0);

        if (isNativeCoin) {
            require(address(lendingPool).balance >= _amount, "Insufficient balance");
            lendingPool.transferNative(payable(_to), _amount);
        } else {
            require(IERC20(_token).balanceOf(address(lendingPool)) >= _amount, "Insufficient balance");
            lendingPool.transferERC20(_token, _to, _amount);
        }
    }

}