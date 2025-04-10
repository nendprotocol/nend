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
    /** @dev DEPRECATED - Do not use. Kept for storage layout compatibility */
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
    // V1 storage
    /** @dev DEPRECATED - Do not use. Kept for storage layout compatibility */
    Stake[] private _oldStakes;
    uint48[3] public stakeDurations;
    // Total staked amount per token and per duration. Token address => duration id => amount
    mapping(address => mapping(uint8 => uint256))
        public totalStakedByToken_Duration;
    uint8[3] public rewardAllocations;
    /** @dev DEPRECATED - Do not use. Kept for storage layout compatibility */
    uint256 public poolRollOver;

    // V2 storage
    /** @dev DEPRECATED - Do not use. Kept for storage layout compatibility */
    mapping(uint256 => Stake) public stakes;
    uint256 public nextStakeId;

    // A staker can claim from the previous fee period (7 days) only.
    // The periods stored and managed from [0], such that [0] is always
    // the current active reward period which is claimable until the
    // public function distributeInflationRewards() call the
    // current weeks inflated reward. [1] is last weeks feeperiod
    // library StakingLib has the same constant
    uint8 public constant REWARD_PERIOD_LENGTH = 2;
    // current reward period
    uint256 private _currentPeriod;
    // fee period
    RewardPeriod[REWARD_PERIOD_LENGTH] private _recentPeriods;
    // V3 storage
    mapping(address => mapping(uint256 => Stake)) public userStakesById; // user => stakeId ==> stake
    mapping(address => uint256) public userStakesCount; // user => stake count
    // Track which periods a user has claimed rewards for
    mapping(address => mapping(uint64 => bool)) private _userClaimedForPeriod; // user => periodId => claimed
    mapping(uint256 => StakeMappingEntry) private _stakeEntries; // stakeId => metadata
    mapping(address => mapping(uint256 => uint256)) private _userIndexToId; // user => userIndex => stakeId

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
     * @notice Gets stake entry by ID
     * @param _stakeId Global stake ID
     * @return The stake mapping entry
     */
    function getStakeEntry(
        uint256 _stakeId
    ) external view returns (StakeMappingEntry memory) {
        return _stakeEntries[_stakeId];
    }

    /**
     * @notice Gets stake ID by user and index
     * @param _user Owner address
     * @param _userIndex Index in the user's personal mapping
     * @return The stake ID
     */
    function getUserStakeId(
        address _user,
        uint256 _userIndex
    ) public view returns (uint256) {
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

    // Add batch migration capability for safe upgrades
    function migrateStakesInBatch(
        uint256 startId,
        uint256 batchSize
    ) external onlyOwner {
        require(!stakesDeprecated, "Migration already completed");
        uint256 endId = (startId + batchSize) > nextStakeId
            ? nextStakeId
            : (startId + batchSize);

        for (uint256 i = startId; i < endId; ) {
            StakingLib.migrateStake(
                stakes,
                userStakesById[stakes[i].staker],
                userStakesCount,
                _stakeEntries,
                _userIndexToId,
                i,
                nend
            );
            unchecked {
                ++i;
            }
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
        StakingLib.validateStake(
            activeStakeTokens[_token],
            _durationId,
            _amount
        );

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

        uint256 stakeId = nextStakeId;
        nextStakeId++;

        // Create the stake
        StakingLib._createAndMapStake(
            userStakesById[msg.sender],
            userStakeIdx,
            msg.sender,
            _amounts,
            _token,
            stakeDurations[_durationId],
            false,
            stakeId,
            userStakesCount,
            _stakeEntries,
            _userIndexToId,
            testing
        );

        totalStakedByToken_Duration[_token][_durationId] += _amount;

        _emitStaked(stakeId, userStakesById[msg.sender][userStakeIdx]);
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

        // Update the total staked amount for the escrowed stake
        StakingLib._saveStakedRewards(
            totalStakedByToken_Duration,
            nend,
            _stake.amountsPerDuration
        );

        emit StakeStatusChanged(_stakeId, _stake.stakeStatus);
    }

    function _createEscrowStake(
        address _staker,
        uint256 _rewardAmount
    ) internal {
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

        uint256 stakeId = nextStakeId;
        nextStakeId++;

        // Create the escrow stake - direct initialization avoids memory/storage copying
        StakingLib._createAndMapStake(
            userStakesById[_staker],
            userStakeIdx,
            _staker,
            _amounts,
            nend,
            escrowLockPeriod,
            true,
            stakeId,
            userStakesCount,
            _stakeEntries,
            _userIndexToId,
            testing
        );

        // Update the total staked amount for the escrowed stake
        StakingLib._saveStakedRewards(
            totalStakedByToken_Duration,
            nend,
            _amounts
        );

        // Emit the event
        _emitStaked(stakeId, userStakesById[_staker][userStakeIdx]);
    }

    function distributeInflationRewards(
        uint256 _inflationReward
    ) external virtual override {
        if (msg.sender != nend) revert Unauthorized();

        (uint256 toDistributeReward, uint256 ifptoDistributeReward) = StakingLib
            .calculatePoolRollOver(_recentPeriods, _currentPeriod);
        toDistributeReward += _inflationReward;

        for (uint256 i = 0; i < stakeTokens.length; ) {
            // Get the staked amount for the token
            uint256 stakedTokenAmt = StakingLib.getTotalStakedForToken(
                totalStakedByToken_Duration,
                stakeTokens[i]
            );
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
        _currentPeriod = StakingLib.closeCurrentPeriod(
            _recentPeriods,
            _currentPeriod,
            toDistributeReward,
            ifptoDistributeReward
        );

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
    ) external view returns (uint256 inflationReward, uint256 ifpReward) {
        return
            StakingLib.getClaimableRewards(
                userStakesById[_user],
                userStakesCount[_user],
                _recentPeriods,
                _userClaimedForPeriod,
                totalStakedByToken_Duration,
                _currentPeriod,
                nend,
                _user,
                _token
            );
    }

    function claim(address _token) external {
        // Get the previous period (the claimable one)
        RewardPeriod storage period = _recentPeriodsStorage(1);

        (
            uint256 inflationReward,
            uint256 ifpReward,
            uint64 periodId
        ) = StakingLib.processClaim(
                userStakesById[msg.sender],
                totalStakedByToken_Duration,
                userStakesCount[msg.sender],
                _userClaimedForPeriod,
                period,
                _token,
                nend,
                msg.sender
            );

        // Create an escrow stake for the inflation reward
        _createEscrowStake(msg.sender, inflationReward);
        IERC20(_token).transfer(msg.sender, ifpReward);

        emit RewardsClaimed(
            msg.sender,
            _token,
            inflationReward,
            ifpReward,
            periodId
        );
    }

    function _calculateInflationRollOver()
        internal
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
            uint256 stakedAmount = StakingLib.getTotalStakedForToken(
                totalStakedByToken_Duration,
                stakeTokens[i]
            );

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

        // Use library to handle most of the logic
        (
            uint256 stakedAmount,
            uint256 rewardAmount,
            address tokenToUse,
            bool needsBurn
        ) = StakingLib.processUnstake(
                _stake,
                totalStakedByToken_Duration,
                nend,
                msg.sender
            );

        // Handle transfers (kept in contract due to external calls)
        if (_stake.isEscrow) {
            IERC20(nend).transfer(msg.sender, stakedAmount);
        } else {
            StakingLib.lendingPoolTransfer(
                lendingPool,
                tokenToUse,
                msg.sender,
                stakedAmount
            );
        }

        if (rewardAmount > 0) {
            IERC20(tokenToUse).transfer(msg.sender, rewardAmount);
        }

        // Handle events and burns
        emit StakeStatusChanged(_stakeId, StakeStatus.FULFILLED);

        if (needsBurn) {
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

    function _removeUserStake(
        address _user,
        uint256 _stakeId,
        uint256 _userIndex
    ) internal virtual {
        StakingLib.removeUserStake(
            userStakesById[_user],
            _stakeEntries,
            _userIndexToId,
            userStakesCount,
            _user,
            _stakeId,
            _userIndex
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
                StakingLib.setStakeMapping(
                    _stakeEntries,
                    _userIndexToId,
                    tokenId,
                    to,
                    toUserIndex
                );
                userStakesCount[to]++;
            }
        }
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

    function _authorizeUpgrade(
        address newImplementation
    ) internal virtual override onlyOwner {}
}
