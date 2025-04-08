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
    mapping(uint256 => bool) public isActiveStake;
    mapping(uint256 => uint256) public activeStakeIndices; // stakeId => index
    mapping(uint256 => uint256) public activeStakesById; // index => stakeId
    // current reward period
    uint256 private _currentPeriod;
    struct TokenReward {
        RewardPeriod[2] rewardPeriods;
    }

    // A staker can claim from the previous fee period (7 days) only.
    // The periods stored and managed from [0], such that [0] is always
    // the current active reward period which is claimable until the
    // public function distributeInflationRewards() call the
    // current weeks inflated reward. [1] is last weeks feeperiod
    uint8 private constant PERIOD_LENGTH = 2;
    // RewardPeriod[PERIOD_LENGTH] private _recentPeriods;
    mapping(address => mapping(uint8 =>TokenReward)) private _recentPeriods;

    // Flag to track if migration has happened
    // bool public migrationCompleted;

    // Add event for monitoring
    // event StakeMigrationCompleted(uint256 stakedMigrated);
    // Add a new event to track clearing
    // event OldStakesCleared(uint256 clearedStakes);

    // event InPutParam(
    //     uint256 stakeId,
    //     address staker,
    //     address token,
    //     uint48 start,
    //     uint48 end,
    //     uint256[3] amountsPerDuration,
    //     uint256 rewardAllocated,
    //     bool isEscrow,
    //     EscrowStatus escrowStatus,
    //     StakeStatus stakeStatus
    // );

    function resetActiveStakeIds(uint256 _activeIdCount) external onlyOwner {
        require(nextStakeId > 1, "No stakes to reset");

        if (_activeIdCount > 0) {
            require(_activeIdCount <= nextStakeId, "Invalid active ID count");
        } else {
            _activeIdCount = nextStakeId - 1;
        }

        // Reset counters first
        activeStakesCount = 0;

        // Correctly rebuild the active stakes tracking
        for (uint256 i = 1; i <= _activeIdCount; ) {
            if (i == _activeIdCount) {
                // set last element as nextStakeId
                nextStakeId = i + 1;
                break;
            }
            
            // Only process active stakes, but ALWAYS increment counter
            if (isActiveStake[i]) {
                // Add to active stakes in order
                activeStakesById[activeStakesCount] = i;
                activeStakeIndices[i] = activeStakesCount;
                
                unchecked {
                    ++activeStakesCount;
                }
            }
            
            // Always increment i regardless of stake active status
            unchecked {
                ++i;
            }
        }
    }

    // function migrateStakeTokenToNend(address _token) external onlyOwner {
    //     require(_token != nend, "Cannot migrate to the same token");

    //     totalStakedByToken_Duration[nend][0] += totalStakedByToken_Duration[_token][0];
    //     totalStakedByToken_Duration[nend][1] += totalStakedByToken_Duration[_token][1];
    //     totalStakedByToken_Duration[nend][2] += totalStakedByToken_Duration[_token][2];

    //     // empty the old token's data
    //     totalStakedByToken_Duration[_token][0] = 0;
    //     totalStakedByToken_Duration[_token][1] = 0;
    //     totalStakedByToken_Duration[_token][2] = 0;
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
    ) external onlyOwner  {
        uint256 length = _stakesToImport.length;
        
        // Early return for empty array
        if (length == 0) return;
        
        uint256 currentActiveCount = activeStakesCount;
        uint256 addedActiveCount = 0;
        uint256 highestIdUsed = 0;
        
        for (uint256 i = 0; i < length;) {
            // Use custom ID if provided, otherwise use sequential ID
            uint256 stakeId = _stakeIds[i];
            
            // Track highest ID for nextStakeId update
            if (stakeId > highestIdUsed) {
                highestIdUsed = stakeId;
            }
            
            Stake calldata stake = _stakesToImport[i]; // Cache the current stake
            
            // Store in mapping
            stakes[stakeId] = stake;
            
            // Track active stakes
            if (stake.stakeStatus == StakeStatus.STAKED) {
                isActiveStake[stakeId] = true;
                
                // Add to active stakes tracking
                activeStakesById[currentActiveCount] = stakeId;
                activeStakeIndices[stakeId] = currentActiveCount;
                
                // Update duration totals - unroll the loop for efficiency
                totalStakedByToken_Duration[stake.token][0] += stake.amountsPerDuration[0];
                totalStakedByToken_Duration[stake.token][1] += stake.amountsPerDuration[1];
                totalStakedByToken_Duration[stake.token][2] += stake.amountsPerDuration[2];
                
                unchecked {
                    ++currentActiveCount;
                    ++addedActiveCount;
                }
            }
            
            // Emit staking event
            _emitStaked(stakeId);

            unchecked { ++i; }
        }
        
        // Update nextStakeId to be after the highest ID used
        nextStakeId = highestIdUsed + 1;

        activeStakesCount = currentActiveCount;
    }

    // function migrateStakesToMapping() external onlyOwner {
    //     // require(!migrationCompleted, "Migration already performed");

    //     uint256 oldStakesLength = _oldStakes.length;
    //     for (uint256 i = 0; i < oldStakesLength; i++) {
    //         Stake memory oldStake = _oldStakes[i];
    //         uint256 stakeId = i + 1; // Maintain the same IDs

    //         // Copy to mapping
    //         stakes[stakeId] = oldStake;

    //         // Track active stakes
    //         if (oldStake.stakeStatus == StakeStatus.STAKED) {
    //             isActiveStake[stakeId] = true;
    //             // Add to active stakes tracking
    //             activeStakesById[activeStakesCount] = stakeId;
    //             activeStakeIndices[stakeId] = activeStakesCount;
    //             activeStakesCount++;
    //         }
    //     }

    //     // Set the next ID to be after all existing stakes
    //     nextStakeId = oldStakesLength + 1;
    //     // migrationCompleted = true;

    //     // emit StakeMigrationCompleted(oldStakesLength);
    // }

    function _recentPeriodsStorage(address token, uint8 duration, uint8 index) internal view returns (RewardPeriod storage) {
        return _recentPeriods[token][duration].rewardPeriods[(_currentPeriod + index) % uint256(PERIOD_LENGTH)];
    }

    function recentFeePeriods(address token, uint8 duration, uint8 index) external view
        returns (
            uint256 rewardsToDistribute,
            uint256 rewardsClaimed
        )
    {
        RewardPeriod memory rewardPeriod = _recentPeriodsStorage(token, duration, index);
        return (
            rewardPeriod.rewardsToDistribute,
            rewardPeriod.rewardsClaimed
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

        __ERC721_init("Escrowed Asset Bond", "EAB");
        __Ownable_init();
        __Testing_init();
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

        uint256 stakeId = nextStakeId > 0 ? nextStakeId : 1;
        nextStakeId++;

        stakes[stakeId] = Stake(
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

        // Track active stake
        isActiveStake[stakeId] = true;
        activeStakesById[activeStakesCount] = stakeId;
        activeStakeIndices[stakeId] = activeStakesCount;
        activeStakesCount++;

        totalStakedByToken_Duration[_token][_durationId] += _amount;
        // ongoingStakeCount++;

        _emitStaked(stakeId);
    }

    function stakeEscrowedReward(uint256 _stakeId) external virtual override {
        Stake storage _stake = stakes[_stakeId];
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
            totalStakedByToken_Duration[nend][i] += _stake.amountsPerDuration[i];
            unchecked {
                ++i;
            }
        }

        // Mark as active
        if (!isActiveStake[_stakeId]) {
            isActiveStake[_stakeId] = true;
            activeStakesById[activeStakesCount] = _stakeId;
            activeStakeIndices[_stakeId] = activeStakesCount;
            activeStakesCount++;
        }

        emit StakeStatusChanged(_stakeId, _stake.stakeStatus);
    }

    function _compoundEscrow(
        uint256 _stakeId,
        uint256 _inflationReward
    ) internal virtual  {
        Stake storage _stake = stakes[_stakeId];
        address tokenAddress = _stake.isEscrow ? nend : _stake.token;
        uint256 lastEscrowId = userToStakeTokenToLastEscrowId[_stake.staker][
            tokenAddress
        ];
        if (
            lastEscrowId == 0 ||
            stakes[lastEscrowId].start != uint48(block.timestamp)
        ) {
            uint256[3] memory _amounts;

            uint256 newEscrowId = nextStakeId;
            nextStakeId++;


            userToStakeTokenToLastEscrowId[_stake.staker][
                tokenAddress
            ] = lastEscrowId;

            for (uint8 i = 0; i < 3; ) {
                uint256 _reward = _calculateReward(
                    tokenAddress,
                    i,
                    _stake.amountsPerDuration[i],
                    (_inflationReward / stakeTokenCount) + inflationRollOver[tokenAddress]
                );
                _amounts[i] += _reward;
                unchecked {
                    ++i;
                }
            }

            emit Staked(
                lastEscrowId,
                _stake.staker,
                tokenAddress,
                uint48(block.timestamp),
                uint48(block.timestamp) + (escrowLockPeriod / (testing ? 1008 : 1)),
                _stake.amountsPerDuration,
                true
            );
        }
    }

    function _accrueNonInflationReward(
        uint256 _stakeId,
        uint256 _nonInflationReward
    ) internal virtual {
        Stake storage _stake = stakes[_stakeId];

        for (uint8 i = 0; i < 3; ) {
            uint256 _reward = _calculateReward(
                _stake.isEscrow ? nend : _stake.token,
                i,
                _stake.amountsPerDuration[i],
                _nonInflationReward
            );
            _stake.rewardAllocated += _reward;

            lendingPool.namedBalanceSpend(
                "ifp",
                _stake.isEscrow ? nend : _stake.token,
                _reward
            );
            unchecked {
                ++i;
            }
        }
    }

    function distributeInflationRewards(
        uint256 _inflationReward
    ) external virtual override {
        if (msg.sender != nend) {
            revert Unauthorized();
        }

        // require(migrationCompleted, "Must migrate stakes first");

        uint256 toDistributeReward = _inflationReward + _calculatePoolRollOver();

        for (uint256 i = 0; i < activeStakesCount; ) {
            uint256 stakeId = activeStakesById[i];
            // Combined condition check to save on branching
            if (
                isActiveStake[stakeId] &&
                stakes[stakeId].stakeStatus == StakeStatus.STAKED
            ) {
                _compoundEscrow(stakeId, toDistributeReward);
            }
            unchecked {
                ++i;
            }
        }

        // for (uint256 i = 0; i < stakeTokens.length; i++) {
        //     address tokenAddr = stakeTokens[i];
        //     uint256 poolReward = _rolledOverInflationReward /
        //         stakeTokenCount +
        //         inflationRollOver[tokenAddr];
        //     inflationRollOver[tokenAddr] = 0;
        //     uint8 predefinedRollOverCount = 0;
        //     for (uint8 j = 0; j < 3; j++) {
        //         uint256 predefinedDurationReward = (poolReward *
        //             rewardAllocations[j]) / 100;
        //         if (totalStakedByToken_Duration[tokenAddr][j] == 0) {
        //             inflationRollOver[tokenAddr] += predefinedDurationReward;
        //             predefinedRollOverCount++;
        //         }
        //         lastEscrowRewardByToken_Duration[tokenAddr][
        //             j
        //         ] = predefinedDurationReward;
        //     }
        //     // Reward for all durations was rolled over => Pool rollover
        //     if (predefinedRollOverCount == 3) {
        //         inflationRollOver[tokenAddr] = 0;
        //         poolRollOver += _inflationReward / stakeTokenCount;
        //     }
        // }
        _closeCurrentPeriod(toDistributeReward);

        emit InflationRewardDistributed();
    }

    function _closeCurrentPeriod(uint256 toDistributeReward) internal virtual {
        uint256 tokenPoolReward = toDistributeReward / stakeTokenCount;

        _currentPeriod = (_currentPeriod + PERIOD_LENGTH - 1) % PERIOD_LENGTH;

        for (uint256 i = 0; i < stakeTokens.length; ) {
            for (uint8 j = 0; j < 3; ) {
                if (totalStakedByToken_Duration[stakeTokens[i]][j] != 0) {
                    uint256 durationReward = (tokenPoolReward * rewardAllocations[j]) / 100;
                    // delete _recentPeriods[stakeTokens[i]][j].rewardPeriods[_currentPeriod];
                    _recentPeriodsStorage(stakeTokens[i], j, 0).rewardsToDistribute = durationReward;
                    _recentPeriodsStorage(stakeTokens[i], j, 0).rewardsClaimed = 0;
                }

                unchecked {
                    ++j;
                }
            }

            unchecked {
                ++i;
            }
        }
    }

    function _calculatePoolRollOver() internal virtual view returns (uint256 poolRewardRemained) {
        for (uint256 i = 0; i < stakeTokens.length; ) {
            poolRewardRemained += _calculateInflationRollOver(
                stakeTokens[i]
            );
            unchecked {
                ++i;
            }
        }
    }

    function _calculateInflationRollOver(address _token) internal virtual view returns (uint256 inflationRewardRemained) {
        for (uint8 j = 0; j < 3; ) {
            inflationRewardRemained += _recentPeriodsStorage(_token, j, 0).rewardsToDistribute
                - _recentPeriodsStorage(_token, j, 1).rewardsClaimed;
            unchecked {
                ++j;
            }
        }
    }

    function distributeNonInflationRewards()
        external
        virtual
        override
        onlyOwner
    {
        // require(migrationCompleted, "Must migrate stakes first");

        for (uint256 i = 0; i < stakeTokens.length; i++) {
            ifpTokenToAmount[stakeTokens[i]] = lendingPool.getNamedBalance(
                "ifp",
                stakeTokens[i]
            );
        }

        for (uint256 i = 0; i < activeStakesCount; i++) {
            uint256 stakeId = activeStakesById[i];
            if (!isActiveStake[stakeId]) continue;

            Stake storage _stake = stakes[stakeId];
            if (_stake.stakeStatus != StakeStatus.STAKED) {
                continue;
            }

            _accrueNonInflationReward(
                stakeId,
                ifpTokenToAmount[_stake.isEscrow ? nend : _stake.token]
            );
        }

        for (uint256 i = 0; i < stakeTokens.length; i++) {
            uint256 distributedAmount = ifpTokenToAmount[stakeTokens[i]] -
                lendingPool.getNamedBalance("ifp", stakeTokens[i]);

            if (distributedAmount > 0) {
                lendingPool.transferERC20(
                    stakeTokens[i],
                    address(this),
                    distributedAmount
                );
            }
        }

        emit NonInflationRewardDistributed();
    }

    function hasPendingNonInflationRewards()
        external
        view
        virtual
        override
        returns (bool)
    {
        for (uint256 i = 0; i < stakeTokens.length; i++) {
            address token = stakeTokens[i];
            uint256 reward = lendingPool.getNamedBalance("ifp", token);

            uint256 stakedAmount = totalStakedByToken_Duration[token][0] +
                totalStakedByToken_Duration[token][1] +
                totalStakedByToken_Duration[token][2];

            if (reward > 0 && stakedAmount > 0) {
                return true;
            }
        }

        return false;
    }

    function issueEAB(uint256 _stakeId) external virtual {
        Stake storage _stake = stakes[_stakeId];
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
        Stake storage _stake = stakes[_stakeId];

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
            // ongoingStakeCount--;
            _removeActiveStake(_stakeId);

            for (uint8 i = 0; i < 3; i++) {
                totalStakedByToken_Duration[
                    _stake.isEscrow ? nend : _stake.token
                ][i] -= _stake.amountsPerDuration[i];
            }
        }

        _stake.stakeStatus = StakeStatus.FULFILLED;
        emit StakeStatusChanged(_stakeId, StakeStatus.FULFILLED);

        if (_stake.escrowStatus == EscrowStatus.ISSUED || _stake.isEscrow) {
            _stake.escrowStatus = EscrowStatus.CLAIMED;

            if (_exists(_stakeId)) {
                _burn(_stakeId);
            }

            emit EscrowStatusChanged(_stakeId, EscrowStatus.CLAIMED);
        }

        // // O(1) removal process: swap the element to remove with the last element and then remove the last
        // if (isActiveStake[_stakeId]) {
        //     isActiveStake[_stakeId] = false;

        //     uint256 indexToRemove = activeStakeIndices[_stakeId];

        //     // Only perform swap if not the last item
        //     if (indexToRemove < activeStakesCount - 1) {
        //         // Get last stake ID
        //         uint256 lastStakeId = activeStakesById[activeStakesCount - 1];

        //         // Move last item to the removed position
        //         activeStakesById[indexToRemove] = lastStakeId;
        //         activeStakeIndices[lastStakeId] = indexToRemove;
        //     }

        //     // Clean up and reduce count
        //     if (activeStakesCount > 0) {
        //         activeStakesCount--;
        //         delete activeStakesById[activeStakesCount];
        //     }
        //     delete activeStakeIndices[_stakeId];
        // }

        delete stakes[_stakeId];
    }

    function addStakeToken(
        address _stakeToken
    ) external virtual override onlyRole("admin") {
        if (!activeStakeTokens[_stakeToken]) {
            stakeTokenCount++;
            activeStakeTokens[_stakeToken] = true;
        }

        for (uint8 i = 0; i < stakeTokens.length; i++) {
            if (stakeTokens[i] == _stakeToken) {
                return;
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
     * @notice Removes a stake from the active stakes tracking arrays with O(1) complexity
     * @dev Uses the swap-and-pop pattern to maintain array integrity while efficiently removing elements
     * @param _stakeId The ID of the stake to remove from active tracking
     */
    function _removeActiveStake(uint256 _stakeId) internal virtual {
        // Only process if the stake is actually marked as active
        if (isActiveStake[_stakeId]) {
            // First mark the stake as inactive
            isActiveStake[_stakeId] = false;
    
            // Get the index of this stake in the activeStakesById array
            uint256 indexToRemove = activeStakeIndices[_stakeId];
    
            // Only perform swap if not the last item (optimization to avoid unnecessary operations)
            if (indexToRemove < activeStakesCount - 1) {
                // Get the ID of the last active stake
                uint256 lastStakeId = activeStakesById[activeStakesCount - 1];
    
                // Move last item to the removed position
                activeStakesById[indexToRemove] = lastStakeId;
                activeStakeIndices[lastStakeId] = indexToRemove;
            }
    
            // Clean up and reduce count (only if we have active stakes)
            if (activeStakesCount > 0) {
                activeStakesCount--;
                delete activeStakesById[activeStakesCount];
            }
            
            // Remove index mapping for the removed stake
            delete activeStakeIndices[_stakeId];
        }
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

    function _emitStaked(uint256 _stakeId) internal virtual {
        Stake memory _stake = stakes[_stakeId];
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

    // function _emitBulkInput(uint256 _stakeId, Stake memory _stake) internal virtual {
    //     emit InPutParam(
    //         _stakeId,
    //         _stake.staker,
    //         _stake.token,
    //         _stake.start,
    //         _stake.end,
    //         _stake.amountsPerDuration,
    //         _stake.rewardAllocated,
    //         _stake.isEscrow,
    //         _stake.escrowStatus,
    //         _stake.stakeStatus
    //     );
    // }

    function _afterTokenTransfer(
        address from,
        address to,
        uint256 tokenId,
        uint256
    ) internal virtual override {
        if (from != address(0) && to != address(0)) {
            stakes[tokenId].staker = to;
        }
    }

    function _authorizeUpgrade(address) internal virtual override onlyOwner {}

    // /**
    //  * @notice Clears the old stakes array to free up storage after migration
    //  * @dev Can only be called after migration is complete
    //  */
    // function clearOldStakesStorage() external onlyOwner {
    //     require(migrationCompleted, "Migration must be completed first");

    //     // Get current length of old stakes array
    //     uint256 length = _oldStakes.length;

    //     // Clear the array by setting its length to 0
    //     // This is the proper way to clear a storage array in Solidity
    //     assembly {
    //         // Store array length (0) at the array's storage slot
    //         sstore(_oldStakes.slot, 0)
    //     }

    //     emit OldStakesCleared(length);
    // }
}
