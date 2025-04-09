// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721URIStorageUpgradeable.sol";
import "../vault/Vault.sol";
import "./interfaces/ILendingPoolStaking.sol";
import "../test/TestingV2.sol";
import "../access/SimpleRoleAccessV2.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

// Storage layout v1: Used _oldStakes[] array
// Storage layout v2: Uses mapping(uint256 => Stake) stakes
// Storage layout v3: Uses userStakesById[user][index] for user-centric access

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

    // Add to contract header
    /**
     * @dev IMPORTANT: When adding new storage variables, add them BELOW 
     * this comment and ABOVE the storage gap.
     */
    // Reserve space for future upgrades
    uint256[50] private __gap;

    // Add batch migration capability for safe upgrades
    function migrateStakesInBatch(uint256 startId, uint256 batchSize) external onlyOwner {
        require(!stakesDeprecated, "Migration already completed");
        uint256 endId = Math.min(startId + batchSize, nextStakeId);
        
        for (uint256 i = startId; i < endId;) {
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
            unchecked { ++i; }
        }
        
        if (endId >= nextStakeId) {
            stakesDeprecated = true;
        }
        
        emit BatchMigrationCompleted(startId, endId);
    }

    function _migrateStakesToUserMapping() internal onlyOwner {
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
    }

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
        require(
            _nend != address(0) && address(_lendingPool) != address(0),
            "Invalid address"
        );
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

        // Add to user's stakes
        uint256 userStakeIdx = userStakesCount[msg.sender] + 1;

        // Direct initialization avoids memory/storage copying
        Stake storage newStake = userStakesById[msg.sender][userStakeIdx];
        newStake.staker = msg.sender;
        newStake.token = _token;
        newStake.start = uint48(block.timestamp);
        newStake.end = uint48(block.timestamp) + (stakeDurations[_durationId] / (testing ? 1008 : 1));
        newStake.amountsPerDuration = _amounts;
        newStake.rewardAllocated = 0;
        newStake.isEscrow = false;
        newStake.escrowStatus = EscrowStatus.DEFAULT;
        newStake.stakeStatus = StakeStatus.STAKED;

        uint256 stakeId = nextStakeId;
        nextStakeId++;

        userStakesById[msg.sender][userStakeIdx] = newStake;
        userStakesCount[msg.sender]++;
        // Track relationship between global ID and user index
        stakeIdToUserIndex[stakeId][msg.sender] = userStakeIdx;

        // Add reverse mapping
        userIndexToStakeId[msg.sender][userStakeIdx] = stakeId;

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

    /*
     * @notice Emit the Staked event
     * @dev For backward compatibility, specifically for escrowed stake with 'StakeStatus.DEFAULT'
     * @param _stakeId The ID of the stake
     * @param _stake The stake object
     */
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

        // Add to user's stakes
        uint256 userStakeIdx = userStakesCount[_staker] + 1;

        // Create the escrow stake - direct initialization avoids memory/storage copying
        Stake storage newStake = userStakesById[msg.sender][userStakeIdx];
        newStake.staker = _staker;
        newStake.token = _token;
        newStake.start = uint48(block.timestamp);
        newStake.end = uint48(block.timestamp) + (escrowLockPeriod / (testing ? 1008 : 1));
        newStake.amountsPerDuration = _amounts;
        newStake.rewardAllocated = 0;
        newStake.isEscrow = true; // isEscrow
        newStake.escrowStatus = EscrowStatus.DEFAULT;
        newStake.stakeStatus = StakeStatus.STAKED; // by calling claim, the escrow is staked

        userStakesById[_staker][userStakeIdx] = newStake;
        userStakesCount[_staker]++;

        uint256 stakeId = nextStakeId;
        nextStakeId++;

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
        uint256 idx = 1; // Previous period
        RewardPeriod storage period = _recentPeriodsStorage(idx);

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
            
            // Preliminary check on stake status to avoid loading full struct
            if (userStakesById[_user][idx].stakeStatus == StakeStatus.STAKED) {
                Stake storage stake = userStakesById[_user][idx];

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

        _removeUserStake(msg.sender, _stakeId, userIndex);
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

    /**
     * @notice Removes a stake from a user's storage using O(1) swap-and-pop pattern
     * @dev Maintains data integrity when removing stakes from user mappings
     * @param _user Address of the user whose stake is being removed
     * @param _stakeId Global ID of the stake to remove
     * @param _userIndex Index of the stake in the user's personal mapping
     */
    function _removeUserStake(
        address _user,
        uint256 _stakeId,
        uint256 _userIndex
    ) internal virtual {
        // Get the last stake index for this user
        uint256 lastUserStakeIdx = userStakesCount[_user];

        // If not the last element, swap with the last element
        if (_userIndex != lastUserStakeIdx) {
            // Get last stake
            Stake storage lastStake = userStakesById[_user][lastUserStakeIdx];

            // Get last stake ID using the reverse mapping directly
            uint256 lastStakeId = userIndexToStakeId[_user][lastUserStakeIdx];

            // Move last stake to current position
            userStakesById[_user][_userIndex] = lastStake;

            // Update mappings
            stakeIdToUserIndex[lastStakeId][_user] = _userIndex;
            userIndexToStakeId[_user][_userIndex] = lastStakeId;
        }

        // Clean up
        delete userStakesById[_user][lastUserStakeIdx];
        delete userIndexToStakeId[_user][lastUserStakeIdx];
        userStakesCount[_user]--;
        delete stakeIdToUserIndex[_stakeId][_user];
    }

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
    
                // Remove stake from original owner using extracted function
                _removeUserStake(from, tokenId, fromUserIndex);
    
                // Add to new owner
                uint256 toUserIndex = userStakesCount[to] + 1;
                userStakesById[to][toUserIndex] = stake;
                stakeIdToUserIndex[tokenId][to] = toUserIndex;
                userStakesCount[to]++;
            }
        }
    }

    /**
     * @notice Authorizes an upgrade to a new implementation
     * @dev This function will automatically run migrations if needed
     * @param newImplementation Address of the new implementation contract
     */
    function _authorizeUpgrade(address newImplementation) internal virtual override onlyOwner {
        // Run necessary migrations automatically during upgrade
        if (!stakesDeprecated) {
            _migrateStakesToUserMapping();
        }
        emit ImplementationUpgraded(newImplementation);
    }

    // Add this event
    event ImplementationUpgraded(address indexed newImplementation);
    event BatchMigrationCompleted(uint256 startId, uint256 endId);
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
