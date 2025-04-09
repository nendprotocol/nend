// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721URIStorageUpgradeable.sol";
import "../vault/Vault.sol";
import "./interfaces/ILendingPoolStakingV2.sol";
import "../test/TestingV2.sol";
import "../access/SimpleRoleAccessV2.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "./StakingLib.sol";



// Storage layout v1: Used _oldStakes[] array
// Storage layout v2: Uses mapping(uint256 => Stake) stakes
// Storage layout v3: Uses userStakesById[user][index] for user-centric access

contract LendingPoolStakingV2 is
    ILendingPoolStakingV2,
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
    /** @dev DEPRECATED - Do not use. Kept for storage layout compatibility */
    uint256 public activeStakesCount;
    mapping(address => uint256) internal ifpTokenToAmount;
    /** @dev DEPRECATED - Do not use. Kept for storage layout compatibility */
    mapping(address => mapping(address => uint256)) userToStakeTokenToLastEscrowId;
    /** @dev DEPRECATED - Do not use. Kept for storage layout compatibility */
    mapping(address => mapping(uint8 => uint256))
        public lastEscrowRewardByToken_Duration;
    /** @dev DEPRECATED - Do not use. Kept for storage layout compatibility */
    Stake[] private _oldStakes;
    uint48[3] public stakeDurations;
    // Total staked amount per token and per duration. Token address => duration id => amount
    mapping(address => mapping(uint8 => uint256))
        public totalStakedByToken_Duration;
    uint8[3] public rewardAllocations;
    /** @dev DEPRECATED - Do not use. Kept for storage layout compatibility */
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
    // // Track the relationship between global stake IDs and user-specific stake indexes
    // mapping(uint256 => mapping(address => uint256)) public stakeIdToUserIndex; // stakeId => user => userIndex
    // // Add this state variable near your other mappings
    // mapping(address => mapping(uint256 => uint256)) public userIndexToStakeId; // user => userIndex => stakeId

    mapping(uint256 => StakeMappingEntry) private _stakeEntries;       // stakeId => metadata
    mapping(address => mapping(uint256 => uint256)) private _userIndexToId;  // user => userIndex => stakeId


    // Add this at the contract level
    bool public stakesDeprecated = false;

    // Add to contract header
    /**
     * @dev IMPORTANT: When adding new storage variables, add them BELOW 
     * this comment and ABOVE the storage gap.
     */
    // Reserve space for future upgrades
    uint256[50] private __gap;

    using StakingLib for *;

    // Helper functions for working with the optimized mappings
    /**
     * @notice Sets stake mapping entry with all relationships in a single operation
     * @dev Updates both mappings at once to ensure data consistency
     * @param _stakeId Global stake ID
     * @param _user Owner address
     * @param _userIndex Index in the user's personal mapping
     */
    function _setStakeMapping(
        uint256 _stakeId,
        address _user,
        uint256 _userIndex
    ) internal {
        // Create and store the mapping entry
        _stakeEntries[_stakeId] = StakeMappingEntry({
            user: _user,
            userIndex: _userIndex,
            stakeId: _stakeId,
            exists: true
        });
        
        // Update the reverse lookup
        _userIndexToId[_user][_userIndex] = _stakeId;
    }

    /**
     * @notice Gets stake entry by ID
     * @param _stakeId Global stake ID
     * @return The stake mapping entry
     */
    function getStakeEntry(uint256 _stakeId) public view returns (StakeMappingEntry memory) {
        return _stakeEntries[_stakeId];
    }

    /**
     * @notice Gets stake ID by user and index
     * @param _user Owner address
     * @param _userIndex Index in the user's personal mapping
     * @return The stake ID
     */
    function getUserStakeId(address _user, uint256 _userIndex) public view returns (uint256) {
        return _userIndexToId[_user][_userIndex];
    }

    /**
     * @notice Gets user index by stake ID
     * @param _stakeId Global stake ID
     * @return The user index
     */
    function getUserStakeIndex(uint256 _stakeId) public view returns (uint256) {
        StakeMappingEntry memory entry = _stakeEntries[_stakeId];
        if (entry.userIndex == 0) revert StakeNotFound();
        return entry.userIndex;
    }

    /**
     * @notice Clears stake mapping entry
     * @dev Updates both mappings at once to ensure data consistency
     * @param _stakeId Global stake ID
     */
    function _clearStakeMapping(uint256 _stakeId) internal {
        StakeMappingEntry memory entry = _stakeEntries[_stakeId];
        if (entry.exists) {
            delete _userIndexToId[entry.user][entry.userIndex];
            delete _stakeEntries[_stakeId];
        }
    }


    // Add batch migration capability for safe upgrades
    function migrateStakesInBatch(uint256 startId, uint256 batchSize) external onlyOwner {
        require(!stakesDeprecated, "Migration already completed");
        uint256 endId = (startId + batchSize) > nextStakeId 
            ? nextStakeId 
            : (startId + batchSize);
        
        for (uint256 i = startId; i < endId;) {
            Stake memory stake = stakes[i];
            if (
                stake.staker != address(0) &&
                stake.stakeStatus != StakeStatus.FULFILLED
            ) {
                uint256 userStakeIdx = userStakesCount[stake.staker] + 1;
                stake.token = stake.isEscrow ? nend : stake.token;
                userStakesById[stake.staker][userStakeIdx] = stake;
                // stakeIdToUserIndex[i][stake.staker] = userStakeIdx;

                // // Add reverse mapping
                // userIndexToStakeId[stake.staker][userStakeIdx] = i;
                _setStakeMapping(i, stake.staker, userStakeIdx);

                userStakesCount[stake.staker]++;
            }
            unchecked { ++i; }
        }
        
        if (endId >= nextStakeId) {
            stakesDeprecated = true;
        }
        
        emit BatchMigrationCompleted(startId, endId);
    }

    function _recentPeriodsStorage(
        uint256 index
    ) internal view returns (RewardPeriod storage) {
        return
            _recentPeriods[
                (_currentPeriod + index) % uint256(REWARD_PERIOD_LENGTH)
            ];
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
        // newStake.end = uint48(block.timestamp) + (stakeDurations[_durationId] / (testing ? 1008 : 1));
        newStake.end = _getDurationEnd(uint48(block.timestamp), stakeDurations[_durationId]);
        newStake.amountsPerDuration = _amounts;
        newStake.rewardAllocated = 0;
        newStake.isEscrow = false;
        newStake.escrowStatus = EscrowStatus.DEFAULT;
        newStake.stakeStatus = StakeStatus.STAKED;

        uint256 stakeId = nextStakeId;
        nextStakeId++;

        userStakesById[msg.sender][userStakeIdx] = newStake;
        userStakesCount[msg.sender]++;
        // // Track relationship between global ID and user index
        // stakeIdToUserIndex[stakeId][msg.sender] = userStakeIdx;

        // // Add reverse mapping
        // userIndexToStakeId[msg.sender][userStakeIdx] = stakeId;
        _setStakeMapping(stakeId, msg.sender, userStakeIdx);

        totalStakedByToken_Duration[_token][_durationId] += _amount;

        _emitStaked(stakeId, newStake);
    }

    function getStakeByUserIndex(
        address _user,
        uint256 _index
    ) external view returns (Stake memory) {
        require(
            _index > 0 && _index <= userStakesCount[_user],
            "Invalid stake index"
        );
        return userStakesById[_user][_index];
    }

    function stakeEscrowedReward(uint256 _stakeId) external virtual override {
        // uint256 userIndex = stakeIdToUserIndex[_stakeId][msg.sender];
        uint256 userIndex = getUserStakeIndex(_stakeId);
        if (userIndex == 0) revert StakeNotFound();
        Stake storage _stake = userStakesById[msg.sender][userIndex];
        if (_stake.staker != msg.sender) revert Unauthorized();

        // Stake is not escrow or is already staked
        if (!_stake.isEscrow || _stake.stakeStatus != StakeStatus.DEFAULT) 
            revert InvalidState();

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

    function _getDurationEnd(uint48 _startTime, uint48 _duration) internal view returns (uint48) {
        return _startTime + (_duration / (testing ? 1008 : 1));
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
        // newStake.end = uint48(block.timestamp) + (escrowLockPeriod / (testing ? 1008 : 1));
        newStake.end = _getDurationEnd(uint48(block.timestamp), escrowLockPeriod);
        newStake.amountsPerDuration = _amounts;
        newStake.rewardAllocated = 0;
        newStake.isEscrow = true; // isEscrow
        newStake.escrowStatus = EscrowStatus.DEFAULT;
        newStake.stakeStatus = StakeStatus.DEFAULT; // will be staked by stakeEscrowedReward

        userStakesById[_staker][userStakeIdx] = newStake;
        userStakesCount[_staker]++;

        uint256 stakeId = nextStakeId;
        nextStakeId++;

        // Add mappings in both directions
        // stakeIdToUserIndex[stakeId][_staker] = userStakeIdx;
        // userIndexToStakeId[_staker][userStakeIdx] = stakeId;
        _setStakeMapping(stakeId, _staker, userStakeIdx);

        // Emit the event
        _emitStaked(stakeId, newStake);

        return stakeId;
    }

    function distributeInflationRewards(
        uint256 _inflationReward
    ) external virtual override {
        if (msg.sender != nend) revert Unauthorized();

        (
            uint256 toDistributeReward,
            uint256 ifptoDistributeReward
        ) = StakingLib.calculatePoolRollOver(_recentPeriods, _currentPeriod, REWARD_PERIOD_LENGTH);
        toDistributeReward += _inflationReward;

        for (uint256 i = 0; i < stakeTokens.length; ) {
            // Get the staked amount for the token
            uint256 stakedTokenAmt = StakingLib.getTotalStakedForToken(totalStakedByToken_Duration, stakeTokens[i]);
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
        uint256 totalTokenStaked = StakingLib.getTotalStakedForToken(totalStakedByToken_Duration, _token);

        // If nothing staked, no rewards
        if (totalTokenStaked == 0) {
            return (0, 0);
        }

        // Get user's total stake for this token
        uint256 userStakedAmount = StakingLib.calculateUserStakesTotal(userStakesById, userStakesCount, _user, _token, nend);
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

    function claim(address _token) external {
        // Get the previous period (the claimable one)
        uint256 claimablePeriodIndex = 1;
        RewardPeriod storage period = _recentPeriodsStorage(
            claimablePeriodIndex
        );

        // Prevent duplicate claims
        if (_userClaimedForPeriod[msg.sender][period.periodId]) revert AlreadyClaimed();

        // Calculate the rewards
        (uint256 inflationReward, uint256 ifpReward) = getClaimableRewards(
            msg.sender,
            _token
        );

        // Nothing to claim
        // require(inflationReward > 0 || ifpReward > 0, "No rewards to claim");
        if (inflationReward == 0 && ifpReward == 0) revert NoRewardsAvailable();

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

    function hasPendingNonInflationRewards()
        external
        view
        virtual
        override
        returns (bool)
    {
        for (uint256 i = 0; i < stakeTokens.length; ) {
            uint256 reward = lendingPool.getNamedBalance("ifp", stakeTokens[i]);
            uint256 stakedAmount = StakingLib.getTotalStakedForToken(totalStakedByToken_Duration, stakeTokens[i]);

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
        // uint256 userIndex = stakeIdToUserIndex[_stakeId][msg.sender];
        uint256 userIndex = getUserStakeIndex(_stakeId);
        if (userIndex == 0) revert StakeNotFound();

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
        // uint256 userIndex = stakeIdToUserIndex[_stakeId][msg.sender];
        uint256 userIndex = getUserStakeIndex(_stakeId);
        if (userIndex == 0) revert StakeNotFound();

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
            StakingLib.lendingPoolTransfer(lendingPool, _stake.token, msg.sender, _stakedAmount);
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
        emit StakeStatusChanged(_stakeId, StakeStatus.FULFILLED);

        if (_stake.escrowStatus == EscrowStatus.ISSUED || _stake.isEscrow) {
            

            if (_exists(_stakeId)) {
                _burn(_stakeId);
            }
            // _stake will be deleted from userStakesById so skip to update
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
            uint256 lastStakeId = getUserStakeId(_user, lastUserStakeIdx);

            // Move last stake to current position
            userStakesById[_user][_userIndex] = lastStake;

            // Update mappings
            // stakeIdToUserIndex[lastStakeId][_user] = _userIndex;
            // userIndexToStakeId[_user][_userIndex] = lastStakeId;
            _setStakeMapping(lastStakeId, _user, _userIndex);
        }

        // Clean up
        delete userStakesById[_user][lastUserStakeIdx];
        _clearStakeMapping(_stakeId);
        // delete userIndexToStakeId[_user][lastUserStakeIdx];
        userStakesCount[_user]--;
        // delete stakeIdToUserIndex[_stakeId][_user];
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
            uint256 fromUserIndex = getUserStakeIndex(tokenId);
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
                _setStakeMapping(tokenId, to, toUserIndex);
                userStakesCount[to]++;
            }
        }
    }

    function _authorizeUpgrade(address newImplementation) internal virtual override onlyOwner {}

}
