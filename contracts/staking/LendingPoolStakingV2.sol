// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721URIStorageUpgradeable.sol";
import "../vault/Vault.sol";
import "./interfaces/ILendingPoolStaking.sol";
import "../test/TestingV2.sol";
import "../access/SimpleRoleAccessV2.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract LendingPoolStakingV2 is
    ILendingPoolStaking,
    ERC721URIStorageUpgradeable,
    TestingV2,
    SimpleRoleAccessV2,
    UUPSUpgradeable
{
    address public nend;
    Vault public lendingPool;
    mapping(address => bool) public activeStakeTokens;
    // Inflation roll-over pool for each token
    mapping(address => uint256) public inflationRollOver;
    address[] public stakeTokens;
    uint48 public escrowLockPeriod;
    // Active stake token count
    uint256 public stakeTokenCount;
    // Active stake count only for stakeStaus == STAKED
    uint256 public activeStakesCount;
    mapping(address => uint256) internal ifpTokenToAmount;
    // User address to this week's escrowed reward stake id
    mapping(address => mapping(address => uint256)) userToStakeTokenToLastEscrowId;
    // This week's escrowed inflation reward by duration and token
    mapping(address => mapping(uint8 => uint256))
        public lastEscrowRewardByToken_Duration;
    // Old storage (keep for backward compatibility)
    Stake[] private _oldStakes;
    uint48[3] public stakeDurations;
    // Total staked amount per token and per duration. Token address => duration id => amount
    mapping(address => mapping(uint8 => uint256))
        public totalStakedByToken_Duration;
    uint8[3] public rewardAllocations;
    // Inflation roll-over pool for the network
    uint256 public poolRollOver;

    // New storage
    mapping(uint256 => Stake) public stakes;
    uint256 public nextStakeId;
    // mapping(uint256 => bool) public isActiveStake;
    // mapping(uint256 => uint256) public activeStakeIndices; // stakeId => index
    // mapping(uint256 => uint256) public activeStakesById; // index => stakeId

    // A staker can claim from the previous fee period (7 days) only.
    // The periods stored and managed from [0], such that [0] is always
    // the current active reward period which is claimable until the
    // public function distributeInflationRewards() call the
    // current weeks inflated reward. [1] is last weeks feeperiod
    uint8 public constant REWARD_PERIOD_LENGTH = 2;
    // current reward period
    uint256 private _currentPeriod;
    // fee period
    RewardPeriod[REWARD_PERIOD_LENGTH] private _recentPeriods;
    // mapping(address => TokenReward) private _recentPeriods;
    mapping(address => mapping(uint256 => Stake)) public userStakesById; // user => stakeId ==> stake
    mapping(address => uint256) public userStakesCount; // user => stake count
    // Track which periods a user has claimed rewards for
    mapping(address => mapping(uint64 => bool)) private _userClaimedForPeriod; // user => periodId => claimed
    // Track the relationship between global stake IDs and user-specific stake indexes
    mapping(uint256 => mapping(address => uint256)) public stakeIdToUserIndex; // stakeId => user => userIndex
    // Add this state variable near your other mappings
    mapping(address => mapping(uint256 => uint256)) public userIndexToStakeId; // user => userIndex => stakeId
    // Add this at the contract level
    bool public stakesDeprecated = false;

    // Reserve space for future upgrades
    uint256[49] private __gap;

    function migrateStakesToUserMapping() external onlyOwner {
        require(!stakesDeprecated, "Stakes already migrated");

        for (uint256 i = 1; i < nextStakeId; ) {
            Stake memory stake = stakes[i];
            if (
                stake.staker != address(0) &&
                stake.stakeStatus != StakeStatus.FULFILLED
            ) {
                uint256 userStakeIdx = userStakesCount[stake.staker] + 1;
                stake.token = stake.isEscrow ? nend : stake.token;
                userStakesById[stake.staker][userStakeIdx] = stake;
                stakeIdToUserIndex[i][stake.staker] = userStakeIdx;

                // Add reverse mapping
                userIndexToStakeId[stake.staker][userStakeIdx] = i;

                userStakesCount[stake.staker]++;
            }

            unchecked {
                ++i;
            }
        }

        // Mark global stakes as deprecated
        stakesDeprecated = true;
        emit UserStakesMigrationCompleted();
    }

    // function resetActiveStakeIds(uint256 _activeIdCount) external onlyOwner {
    //     require(nextStakeId > 1, "No stakes to reset");

    //     if (_activeIdCount > 0) {
    //         require(_activeIdCount <= nextStakeId, "Invalid active ID count");
    //     } else {
    //         _activeIdCount = nextStakeId - 1;
    //     }

    //     // Reset counters first
    //     activeStakesCount = 0;

    //     // Correctly rebuild the active stakes tracking
    //     for (uint256 i = 1; i <= _activeIdCount; ) {
    //         if (i == _activeIdCount) {
    //             // set last element as nextStakeId
    //             nextStakeId = i + 1;
    //             break;
    //         }

    //         // Only process active stakes, but ALWAYS increment counter
    //         if (isActiveStake[i]) {
    //             // Add to active stakes in order
    //             activeStakesById[activeStakesCount] = i;
    //             activeStakeIndices[i] = activeStakesCount;

    //             unchecked {
    //                 ++activeStakesCount;
    //             }
    //         }

    //         // Always increment i regardless of stake active status
    //         unchecked {
    //             ++i;
    //         }
    //     }
    // }

    /**
     * @notice Import multiple stakes at once into the mapping storage
     * @dev Gas-optimized import function with support for custom stake IDs
     * @param _stakesToImport Array of Stake structs to import
     * @param _stakeIds Optional array of specific IDs to use (must match _stakesToImport.length)
     */
    function importStakes(
        Stake[] calldata _stakesToImport,
        uint256[] calldata _stakeIds
    ) external onlyOwner {
        uint256 length = _stakesToImport.length;

        // Early return for empty array
        if (length == 0) return;

        // Validate input arrays
        require(_stakeIds.length == length, "Array lengths must match");

        uint256 highestIdUsed = 0;

        for (uint256 i = 0; i < length; ) {
            uint256 stakeId = _stakeIds[i];

            // Track highest ID for nextStakeId update
            if (stakeId > highestIdUsed) {
                highestIdUsed = stakeId;
            }

            // Create a memory copy with the correct token value
            Stake memory stake = _stakesToImport[i];
            stake.token = stake.isEscrow ? nend : stake.token;

            // Only add if the staker is valid
            if (stake.staker != address(0)) {
                // Update totals if stake is active
                if (stake.stakeStatus == StakeStatus.STAKED) {
                    totalStakedByToken_Duration[stake.token][0] += stake
                        .amountsPerDuration[0];
                    totalStakedByToken_Duration[stake.token][1] += stake
                        .amountsPerDuration[1];
                    totalStakedByToken_Duration[stake.token][2] += stake
                        .amountsPerDuration[2];
                }

                // Add to user's stakes (ONLY ONCE)
                uint256 userStakeIdx = userStakesCount[stake.staker] + 1;
                userStakesById[stake.staker][userStakeIdx] = stake;
                stakeIdToUserIndex[stakeId][stake.staker] = userStakeIdx;
                userIndexToStakeId[stake.staker][userStakeIdx] = stakeId;
                userStakesCount[stake.staker]++;

                // Emit staking event
                _emitStaked(stakeId, stake);
            }

            unchecked {
                ++i;
            }
        }

        // Update nextStakeId to be after the highest ID used
        nextStakeId = highestIdUsed + 1;
    }

    function _recentPeriodsStorage(
        uint256 index
    ) internal view returns (RewardPeriod storage) {
        return
            _recentPeriods[
                (_currentPeriod + index) % uint256(REWARD_PERIOD_LENGTH)
            ];
    }

    function recentFeePeriods(
        uint8 index
    )
        external
        view
        returns (
            uint64 periodId,
            uint64 startTime,
            uint256 rewardsToDistribute,
            uint256 rewardsStaked,
            uint256 ifpRewardToDistribute,
            uint256 ifpRewardClaimed
        )
    {
        RewardPeriod memory rewardPeriod = _recentPeriodsStorage(index);
        return (
            rewardPeriod.periodId,
            rewardPeriod.startTime,
            rewardPeriod.rewardsToDistribute,
            rewardPeriod.rewardsStaked,
            rewardPeriod.ifpRewardToDistribute,
            rewardPeriod.ifpRewardClaimed
        );
    }

    function setRewardAllocations(
        uint8[3] memory _rewardAllocations
    ) external virtual onlyRole("admin") {
        if (
            _rewardAllocations[0] +
                _rewardAllocations[1] +
                _rewardAllocations[2] !=
            100
        ) {
            revert InvalidArgument("Must sum up to 100");
        }
        rewardAllocations = _rewardAllocations;
    }

    function initialize(
        address _nend,
        Vault _lendingPool
    ) public virtual initializer {
        nend = _nend;
        lendingPool = _lendingPool;

        // Set initial values
        nextStakeId = 1;

        // Add native token
        activeStakeTokens[address(0)] = true;
        stakeTokens.push(address(0));
        stakeTokenCount++;

        // Add nend
        activeStakeTokens[_nend] = true;
        stakeTokens.push(_nend);
        stakeTokenCount++;

        escrowLockPeriod = 30 weeks;
        stakeDurations = [1 weeks, 4 weeks, 12 weeks];
        rewardAllocations = [20, 30, 50];

        _recentPeriodsStorage(0).periodId = 1;

        __ERC721_init("Escrowed Asset Bond", "EAB");
        __Ownable_init();
        __Testing_init();

        __UUPSUpgradeable_init();
    }

    function deposit(
        address _token,
        uint256 _amount,
        uint8 _durationId
    ) external payable virtual override {
        if (_amount == 0) {
            revert InvalidArgument("Amount cannot be zero");
        }
        if (!activeStakeTokens[_token]) {
            revert InvalidArgument("Invalid stake token");
        }

        bool isNativeCoin = _token == address(0);

        if (!isNativeCoin && IERC20(_token).balanceOf(msg.sender) < _amount) {
            revert InsufficientBalance();
        }

        if (isNativeCoin) {
            if (msg.value != _amount) {
                revert InvalidArgument("Incorrect native coin stake amount");
            }

            (bool sent, ) = address(lendingPool).call{ value: _amount }("");
            require(sent, "Failed to transfer native token");
        } else {
            IERC20(_token).transferFrom(
                msg.sender,
                address(lendingPool),
                _amount
            );
        }

        uint256[3] memory _amounts;
        _amounts[_durationId] = _amount;

        uint256 stakeId = nextStakeId;
        nextStakeId++;

        Stake memory newStake = Stake(
            msg.sender,
            _token,
            uint48(block.timestamp),
            uint48(block.timestamp) +
                (stakeDurations[_durationId] / (testing ? 1008 : 1)),
            _amounts,
            0,
            false,
            EscrowStatus.DEFAULT,
            StakeStatus.STAKED
        );

        // Add to user's stakes
        uint256 userStakeIdx = userStakesCount[msg.sender] + 1;
        userStakesById[msg.sender][userStakeIdx] = newStake;
        userStakesCount[msg.sender]++;

        // Track relationship between global ID and user index
        stakeIdToUserIndex[stakeId][msg.sender] = userStakeIdx;

        // Add reverse mapping
        userIndexToStakeId[msg.sender][userStakeIdx] = stakeId;

        // Track active stake
        // isActiveStake[stakeId] = true;
        // activeStakesById[activeStakesCount] = stakeId;
        // activeStakeIndices[stakeId] = activeStakesCount;
        // activeStakesCount++;

        totalStakedByToken_Duration[_token][_durationId] += _amount;

        _emitStaked(stakeId, newStake);
    }

    function getStakeByUserIndex(
        address _user,
        uint256 _index
    ) public view returns (Stake memory) {
        require(
            _index > 0 && _index <= userStakesCount[_user],
            "Invalid stake index"
        );
        return userStakesById[_user][_index];
    }

    function stakeEscrowedReward(uint256 _stakeId) external virtual override {
        uint256 userIndex = stakeIdToUserIndex[_stakeId][msg.sender];
        require(userIndex > 0, "Stake not found or not owned by caller");
        Stake storage _stake = userStakesById[msg.sender][userIndex];
        if (_stake.staker != msg.sender) {
            revert Unauthorized();
        }

        // Stake is not escrow or is already staked
        if (!_stake.isEscrow || _stake.stakeStatus != StakeStatus.DEFAULT) {
            revert InvalidState();
        }

        _stake.stakeStatus = StakeStatus.STAKED;
        // ongoingStakeCount++;

        for (uint8 i = 0; i < 3; ) {
            totalStakedByToken_Duration[nend][i] += _stake.amountsPerDuration[
                i
            ];
            unchecked {
                ++i;
            }
        }

        // Mark as active
        // if (!isActiveStake[_stakeId]) {
        //     isActiveStake[_stakeId] = true;
        //     activeStakesById[activeStakesCount] = _stakeId;
        //     activeStakeIndices[_stakeId] = activeStakesCount;
        //     activeStakesCount++;
        // }

        emit StakeStatusChanged(_stakeId, _stake.stakeStatus);
    }

    function _createEscrowStake(
        address _staker,
        address _token,
        uint256 _rewardAmount
    ) internal returns (uint256) {
        uint256[3] memory _amounts;
        // Distribute the reward amount across durations according to your allocation policy
        for (uint8 i = 0; i < 3; ) {
            _amounts[i] = (_rewardAmount * rewardAllocations[i]) / 100;
            unchecked {
                ++i;
            }
        }

        uint256 stakeId = nextStakeId;
        nextStakeId++;

        // Create the escrow stake
        Stake memory newStake = Stake(
            _staker,
            _token,
            uint48(block.timestamp),
            uint48(block.timestamp) + (escrowLockPeriod / (testing ? 1008 : 1)),
            _amounts,
            0,
            true, // isEscrow
            EscrowStatus.DEFAULT,
            StakeStatus.DEFAULT // Not staked yet - user must call stakeEscrowedReward
        );

        // Add to user's stakes
        uint256 userStakeIdx = userStakesCount[_staker] + 1;
        userStakesById[_staker][userStakeIdx] = newStake;
        userStakesCount[_staker]++;

        // Add mappings in both directions
        stakeIdToUserIndex[stakeId][_staker] = userStakeIdx;
        userIndexToStakeId[_staker][userStakeIdx] = stakeId;

        // Emit the event
        _emitStaked(stakeId, newStake);

        return stakeId;
    }

    function distributeInflationRewards(
        uint256 _inflationReward
    ) external virtual override {
        if (msg.sender != nend) {
            revert Unauthorized();
        }

        (
            uint256 toDistributeReward,
            uint256 ifptoDistributeReward
        ) = _calculatePoolRollOver();
        toDistributeReward += _inflationReward;

        for (uint256 i = 0; i < stakeTokens.length; ) {
            // Get the staked amount for the token
            uint256 stakedTokenAmt = _getTotalStakedForToken(stakeTokens[i]);
            if (stakedTokenAmt != 0) {
                // Get the accrued IFP token balance for the token
                uint ifpAccredTokenAmt = lendingPool.getNamedBalance(
                    "ifp",
                    stakeTokens[i]
                );
                ifptoDistributeReward += ifpAccredTokenAmt;
                // subtract the IFP token balance from the pool for backward compatibility
                lendingPool.namedBalanceSpend(
                    "ifp",
                    stakeTokens[i],
                    ifpAccredTokenAmt
                );
                // Transfer the IFP tokens to the contract
                lendingPool.transferERC20(
                    stakeTokens[i],
                    address(this),
                    ifpAccredTokenAmt
                );
            }

            unchecked {
                ++i;
            }
        }

        _closeCurrentPeriod(toDistributeReward, ifptoDistributeReward);

        emit InflationRewardDistributed();
    }

    function _closeCurrentPeriod(
        uint256 toDistributeReward,
        uint ifptoDistributeReward
    ) internal virtual {
        uint256 nextPeriodIndex = 1;
        // Clear the old data
        delete _recentPeriods[nextPeriodIndex];
        // Set up the new period
        _recentPeriodsStorage(nextPeriodIndex).periodId =
            _recentPeriodsStorage(_currentPeriod).periodId +
            1;
        _recentPeriodsStorage(nextPeriodIndex).startTime = uint64(
            block.timestamp
        );
        // Set inflation rewards for the current period
        _recentPeriodsStorage(nextPeriodIndex)
            .rewardsToDistribute = toDistributeReward;
        // Set ifp rewards for the current period
        _recentPeriodsStorage(nextPeriodIndex)
            .ifpRewardToDistribute = ifptoDistributeReward;

        _currentPeriod =
            (_currentPeriod + REWARD_PERIOD_LENGTH - 1) %
            REWARD_PERIOD_LENGTH;

        emit NewPeriodStarted(
            _recentPeriodsStorage(0).periodId,
            _recentPeriodsStorage(0).startTime,
            toDistributeReward,
            ifptoDistributeReward
        );
    }

    function _getTotalStakedForToken(
        address _token
    ) internal view returns (uint256 totalStaked) {
        unchecked {
            totalStaked =
                totalStakedByToken_Duration[_token][0] +
                totalStakedByToken_Duration[_token][1] +
                totalStakedByToken_Duration[_token][2];
        }
    }

    function getClaimableRewards(
        address _user,
        address _token
    ) public view returns (uint256 inflationReward, uint256 ifpReward) {
        // Get the previous period (the one users can claim from)
        uint256 claimablePeriodIndex = 1; // Previous period
        RewardPeriod memory period = _recentPeriodsStorage(
            claimablePeriodIndex
        );

        // If the user already claimed for this period, return zeros
        if (_userClaimedForPeriod[_user][period.periodId]) {
            return (0, 0);
        }

        // Get total staked amount for this token
        uint256 totalTokenStaked = _getTotalStakedForToken(_token);

        // If nothing staked, no rewards
        if (totalTokenStaked == 0) {
            return (0, 0);
        }

        // Get user's total stake for this token
        uint256 userStakedAmount = _calculateUserStakesTotal(_user, _token);
        if (userStakedAmount == 0) {
            return (0, 0);
        }

        // Calculate proportional rewards based on user's stake
        inflationReward =
            (period.rewardsToDistribute * userStakedAmount) /
            totalTokenStaked;
        ifpReward =
            (period.ifpRewardToDistribute * userStakedAmount) /
            totalTokenStaked;

        return (inflationReward, ifpReward);
    }

    function _calculateUserStakesTotal(
        address _user,
        address _token
    ) internal view returns (uint256 totalAmount) {
        uint256 userStakeCount = userStakesCount[_user];

        for (uint256 i = 0; i < userStakeCount; ) {
            uint256 idx = i + 1; // Cache the index calculation
            Stake memory stake = userStakesById[_user][idx]; // Use memory instead of storage

            // Only include active stakes for the specific token
            bool isMatchingToken = stake.token == _token ||
                (stake.isEscrow && _token == nend);

            if (stake.stakeStatus == StakeStatus.STAKED && isMatchingToken) {
                // Sum up all durations in unchecked block
                unchecked {
                    totalAmount +=
                        stake.amountsPerDuration[0] +
                        stake.amountsPerDuration[1] +
                        stake.amountsPerDuration[2];
                }
            }

            unchecked {
                ++i;
            }
        }

        return totalAmount;
    }

    function claim(address _token) external {
        // Get the previous period (the claimable one)
        uint256 claimablePeriodIndex = 1;
        RewardPeriod storage period = _recentPeriodsStorage(
            claimablePeriodIndex
        );

        // Prevent duplicate claims
        require(
            !_userClaimedForPeriod[msg.sender][period.periodId],
            "Already claimed for this period"
        );

        // Calculate the rewards
        (uint256 inflationReward, uint256 ifpReward) = getClaimableRewards(
            msg.sender,
            _token
        );

        // Nothing to claim
        require(inflationReward > 0 || ifpReward > 0, "No rewards to claim");

        // Mark as claimed
        _userClaimedForPeriod[msg.sender][period.periodId] = true;

        // Update period totals
        period.rewardsStaked += inflationReward;
        period.ifpRewardClaimed += ifpReward;

        // Handle inflation reward - stake it automatically as an escrow
        if (inflationReward > 0) {
            // Create an escrow stake for the inflation reward
            _createEscrowStake(msg.sender, _token, inflationReward);
        }

        // Handle IFP reward - transfer directly to user
        if (ifpReward > 0) {
            IERC20(_token).transfer(msg.sender, ifpReward);
        }

        emit RewardsClaimed(
            msg.sender,
            _token,
            inflationReward,
            ifpReward,
            period.periodId
        );
    }

    function _calculatePoolRollOver()
        internal
        view
        virtual
        returns (uint256 poolRewardRemained, uint256 ifpPoolRewardRemained)
    {
        poolRewardRemained +=
            _recentPeriodsStorage(0).rewardsToDistribute -
            _recentPeriodsStorage(0).rewardsStaked;
        ifpPoolRewardRemained +=
            _recentPeriodsStorage(0).ifpRewardToDistribute -
            _recentPeriodsStorage(0).ifpRewardClaimed;
    }

    function _calculateInflationRollOver()
        external
        view
        virtual
        returns (uint256 inflationRewardRemained)
    {
        inflationRewardRemained =
            (_recentPeriodsStorage(_currentPeriod).rewardsToDistribute -
                _recentPeriodsStorage(_currentPeriod).rewardsStaked) /
            stakeTokenCount;
    }

    /**
     * @notice Placeholder for interface compatibility
     * @dev Implementation now uses claim-based reward system instead of direct distribution
     */
    function distributeNonInflationRewards()
        external
        virtual
        override
        onlyOwner
    {}

    function hasPendingNonInflationRewards()
        external
        view
        virtual
        override
        returns (bool)
    {
        for (uint256 i = 0; i < stakeTokens.length; ) {
            address token = stakeTokens[i];
            uint256 reward = lendingPool.getNamedBalance("ifp", token);

            uint256 stakedAmount = _getTotalStakedForToken(token);

            if (reward > 0 && stakedAmount > 0) {
                return true;
            }
            unchecked {
                ++i;
            }
        }

        return false;
    }

    function issueEAB(uint256 _stakeId) external virtual {
        uint256 userIndex = stakeIdToUserIndex[_stakeId][msg.sender];
        require(userIndex > 0, "Stake not found or not owned by caller");

        Stake storage _stake = userStakesById[msg.sender][userIndex];
        if (_stake.staker != msg.sender) {
            revert Unauthorized();
        }

        if (
            _stake.stakeStatus == StakeStatus.FULFILLED ||
            _stake.escrowStatus != EscrowStatus.DEFAULT
        ) {
            revert InvalidState();
        }

        _stake.escrowStatus = EscrowStatus.ISSUED;
        _mint(msg.sender, _stakeId);

        emit EscrowStatusChanged(_stakeId, EscrowStatus.ISSUED);
    }

    function unstake(uint256 _stakeId) external virtual override {
        // Stake storage _stake = stakes[_stakeId];
        uint256 userIndex = stakeIdToUserIndex[_stakeId][msg.sender];
        require(userIndex > 0, "Stake not found or not owned by caller");

        Stake storage _stake = userStakesById[msg.sender][userIndex];

        if (_stake.staker != msg.sender) {
            revert Unauthorized();
        }
        if (
            _stake.end > block.timestamp ||
            _stake.stakeStatus == StakeStatus.FULFILLED ||
            _stake.escrowStatus == EscrowStatus.CLAIMED
        ) {
            revert InvalidState();
        }

        // Transfer original staked amount
        uint256 _stakedAmount;
        unchecked {
            _stakedAmount =
                _stake.amountsPerDuration[0] +
                _stake.amountsPerDuration[1] +
                _stake.amountsPerDuration[2];
        }

        if (_stake.isEscrow) {
            IERC20(nend).transfer(msg.sender, _stakedAmount);
        } else {
            _lendingPoolTransfer(_stake.token, msg.sender, _stakedAmount);
        }

        // Transfer ifp reward
        if (_stake.rewardAllocated > 0) {
            IERC20(_stake.isEscrow ? nend : _stake.token).transfer(
                msg.sender,
                _stake.rewardAllocated
            );
        }

        if (_stake.stakeStatus == StakeStatus.STAKED) {
            // _removeActiveStake(_stakeId);

            for (uint8 i = 0; i < 3; ) {
                totalStakedByToken_Duration[
                    _stake.isEscrow ? nend : _stake.token
                ][i] -= _stake.amountsPerDuration[i];

                unchecked {
                    ++i;
                }
            }
        }

        // _stake will be deleted from userStakesById so skip to update
        // _stake.stakeStatus = StakeStatus.FULFILLED;
        emit StakeStatusChanged(_stakeId, StakeStatus.FULFILLED);

        if (_stake.escrowStatus == EscrowStatus.ISSUED || _stake.isEscrow) {
            // _stake will be deleted from userStakesById so skip to update
            // _stake.escrowStatus = EscrowStatus.CLAIMED;

            if (_exists(_stakeId)) {
                _burn(_stakeId);
            }

            emit EscrowStatusChanged(_stakeId, EscrowStatus.CLAIMED);
        }

        uint256 lastUserStakeIdx = userStakesCount[msg.sender];

        // If not the last element, swap with the last element
        if (userIndex != lastUserStakeIdx) {
            // Get last stake
            Stake storage lastStake = userStakesById[msg.sender][
                lastUserStakeIdx
            ];

            // Find the global ID of the last stake using reverse mapping
            uint256 lastStakeId = userIndexToStakeId[msg.sender][
                lastUserStakeIdx
            ];

            // Move last stake to the current position
            userStakesById[msg.sender][userIndex] = lastStake;

            // Update mappings for the moved stake
            stakeIdToUserIndex[lastStakeId][msg.sender] = userIndex;
            userIndexToStakeId[msg.sender][userIndex] = lastStakeId;
        }

        // Clean up
        delete userStakesById[msg.sender][lastUserStakeIdx];
        delete userIndexToStakeId[msg.sender][lastUserStakeIdx];
        userStakesCount[msg.sender]--;
        delete stakeIdToUserIndex[_stakeId][msg.sender];
    }

    function addStakeToken(
        address _stakeToken
    ) external virtual override onlyRole("admin") {
        if (!activeStakeTokens[_stakeToken]) {
            stakeTokenCount++;
            activeStakeTokens[_stakeToken] = true;
        }

        for (uint8 i = 0; i < stakeTokens.length; ) {
            if (stakeTokens[i] == _stakeToken) {
                return;
            }
            unchecked {
                ++i;
            }
        }

        stakeTokens.push(_stakeToken);
    }

    function removeStakeToken(
        address _stakeToken
    ) external override onlyRole("admin") {
        if (activeStakeTokens[_stakeToken]) {
            stakeTokenCount--;
            activeStakeTokens[_stakeToken] = false;
        }
    }

    function setTokenURI(
        uint256 _tokenId,
        string memory _tokenURI
    ) external virtual onlyOwner {
        _setTokenURI(_tokenId, _tokenURI);
    }

    // /**
    //  * @notice Removes a stake from the active stakes tracking arrays with O(1) complexity
    //  * @dev Uses the swap-and-pop pattern to maintain array integrity while efficiently removing elements
    //  * @param _stakeId The ID of the stake to remove from active tracking
    //  */
    // function _removeActiveStake(uint256 _stakeId) internal virtual {
    //     // Only process if the stake is actually marked as active
    //     if (isActiveStake[_stakeId]) {
    //         // First mark the stake as inactive
    //         isActiveStake[_stakeId] = false;

    //         // Get the index of this stake in the activeStakesById array
    //         uint256 indexToRemove = activeStakeIndices[_stakeId];

    //         // Only perform swap if not the last item (optimization to avoid unnecessary operations)
    //         if (indexToRemove < activeStakesCount - 1) {
    //             // Get the ID of the last active stake
    //             uint256 lastStakeId = activeStakesById[activeStakesCount - 1];

    //             // Move last item to the removed position
    //             activeStakesById[indexToRemove] = lastStakeId;
    //             activeStakeIndices[lastStakeId] = indexToRemove;
    //         }

    //         // Clean up and reduce count (only if we have active stakes)
    //         if (activeStakesCount > 0) {
    //             activeStakesCount--;
    //             delete activeStakesById[activeStakesCount];
    //         }

    //         // Remove index mapping for the removed stake
    //         delete activeStakeIndices[_stakeId];
    //     }
    // }

    function _lendingPoolTransfer(
        address _token,
        address _to,
        uint256 _amount
    ) internal virtual {
        bool isNativeCoin = _token == address(0);

        if (isNativeCoin) {
            if (address(lendingPool).balance < _amount) {
                revert InsufficientBalance();
            }
            lendingPool.transferNative(payable(_to), _amount);
        } else {
            if (IERC20(_token).balanceOf(address(lendingPool)) < _amount) {
                revert InsufficientBalance();
            }
            lendingPool.transferERC20(_token, _to, _amount);
        }
    }

    function _calculateReward(
        address _stakeToken,
        uint8 _durationId,
        uint256 _amountStaked,
        uint256 _reward
    ) internal view virtual returns (uint256) {
        return
            totalStakedByToken_Duration[_stakeToken][_durationId] == 0
                ? 0
                : (_reward * rewardAllocations[_durationId] * _amountStaked) /
                    100 /
                    totalStakedByToken_Duration[_stakeToken][_durationId];
    }

    function _emitStaked(
        uint256 _stakeId,
        Stake memory _stake
    ) internal virtual {
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

    function _afterTokenTransfer(
        address from,
        address to,
        uint256 tokenId,
        uint256
    ) internal virtual override {
        if (from != address(0) && to != address(0)) {
            // Find the user index for the token
            uint256 fromUserIndex = stakeIdToUserIndex[tokenId][from];
            if (fromUserIndex > 0) {
                // Get the stake
                Stake memory stake = userStakesById[from][fromUserIndex];

                // Update stake owner
                stake.staker = to;

                // O(1) removal from original owner using swap-and-pop
                uint256 lastUserStakeIdx = userStakesCount[from];

                if (fromUserIndex != lastUserStakeIdx) {
                    // Get last stake
                    Stake storage lastStake = userStakesById[from][
                        lastUserStakeIdx
                    ];

                    // Get last stake ID using the reverse mapping directly
                    uint256 lastStakeId = userIndexToStakeId[from][
                        lastUserStakeIdx
                    ];

                    // Move last stake to current position
                    userStakesById[from][fromUserIndex] = lastStake;

                    // Update mappings
                    stakeIdToUserIndex[lastStakeId][from] = fromUserIndex;
                    userIndexToStakeId[from][fromUserIndex] = lastStakeId;
                }

                delete userStakesById[from][lastUserStakeIdx];
                delete userIndexToStakeId[from][lastUserStakeIdx];
                userStakesCount[from]--;
                delete stakeIdToUserIndex[tokenId][from];

                // Add to new owner
                uint256 toUserIndex = userStakesCount[to] + 1;
                userStakesById[to][toUserIndex] = stake;
                stakeIdToUserIndex[tokenId][to] = toUserIndex;
                userStakesCount[to]++;
            }
        }
    }

    function _authorizeUpgrade(address) internal virtual override onlyOwner {}

    event UserStakesMigrationCompleted();
    event NewPeriodStarted(
        uint64 periodId,
        uint64 timestamp,
        uint256 inflationRewards,
        uint256 ifpRewards
    );
    event RewardsClaimed(
        address indexed user,
        address indexed token,
        uint256 inflationReward,
        uint256 ifpReward,
        uint64 periodId
    );
}
