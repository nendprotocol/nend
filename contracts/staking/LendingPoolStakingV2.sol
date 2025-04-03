// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721URIStorageUpgradeable.sol";
import "../vault/Vault.sol";
import "./interfaces/ILendingPoolStaking.sol";
import "../test/Testing.sol";
import "../access/SimpleRoleAccess.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract LendingPoolStakingV2 is
    ILendingPoolStaking,
    ERC721URIStorageUpgradeable,
    Testing,
    SimpleRoleAccess,
    UUPSUpgradeable
{
    address public nend;
    Vault public lendingPool;
    mapping(address => bool) public activeStakeTokens;
    mapping(address => uint256) public inflationRollOver;
    address[] public stakeTokens;
    uint48 public escrowLockPeriod;
    // Active stake token count
    uint256 public stakeTokenCount;
    // Active stake count
    uint256 public ongoingStakeCount;
    mapping(address => uint256) internal ifpTokenToAmount;
    // User address to this week's escrowed reward stake id
    mapping(address => mapping(address => uint256)) userToStakeTokenToLastEscrowId;
    mapping(address => mapping(uint8 => uint256))
        public lastEscrowRewardByToken_Duration;
    // Old storage (keep for backward compatibility)
    Stake[] private _oldStakes;
    uint48[3] public stakeDurations;
    // Token address => duration id => amount
    mapping(address => mapping(uint8 => uint256))
        public totalStakedByToken_Duration;
    uint8[3] public rewardAllocations;
    uint256 public poolRollOver;

    // New storage
    mapping(uint256 => Stake) public stakes;
    uint256 public nextStakeId = 1;
    mapping(uint256 => bool) public isActiveStake;
    uint256[] public activeStakeIds;


    // Flag to track if migration has happened
    bool public migrationCompleted;

    // Add event for monitoring
    event StakeMigrationCompleted(uint256 stakedMigrated);

    function migrateStakesToMapping() external onlyOwner {
        require(!migrationCompleted, "Migration already performed");

        uint256 oldStakesLength = _oldStakes.length;
        for (uint256 i = 0; i < oldStakesLength; i++) {
            Stake memory oldStake = _oldStakes[i];
            uint256 stakeId = i + 1; // Maintain the same IDs

            // Copy to mapping
            stakes[stakeId] = oldStake;

            // Track active stakes
            if (oldStake.stakeStatus == StakeStatus.STAKED) {
                isActiveStake[stakeId] = true;
                activeStakeIds.push(stakeId);
            }
        }

        // Set the next ID to be after all existing stakes
        nextStakeId = oldStakesLength + 1;
        migrationCompleted = true;

        emit StakeMigrationCompleted(oldStakesLength);
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
        __MWOwnable_init();
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

        uint256 stakeId = nextStakeId;
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
        activeStakeIds.push(stakeId);

        totalStakedByToken_Duration[_token][_durationId] += _amount;
        ongoingStakeCount++;

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
        ongoingStakeCount++;

        for (uint8 i = 0; i < 3; i++) {
            totalStakedByToken_Duration[nend][i] += _stake.amountsPerDuration[
                i
            ];
        }

        // Mark as active
        if (!isActiveStake[_stakeId]) {
            isActiveStake[_stakeId] = true;
            activeStakeIds.push(_stakeId);
        }

        emit StakeStatusChanged(_stakeId, _stake.stakeStatus);
    }

    function _compoundEscrow(
        uint256 _stakeId,
        uint256 _inflationReward
    ) internal virtual {
        Stake storage _stake = stakes[_stakeId];
        uint256 lastEscrowId = userToStakeTokenToLastEscrowId[_stake.staker][
            _stake.isEscrow ? nend : _stake.token
        ];
        if (
            lastEscrowId == 0 ||
            stakes[lastEscrowId].start != uint48(block.timestamp)
        ) {
            uint256[3] memory _amounts;

            uint256 newEscrowId = nextStakeId;
            nextStakeId++;

            stakes[newEscrowId] = Stake(
                _stake.staker,
                _stake.isEscrow ? nend : _stake.token,
                uint48(block.timestamp),
                uint48(block.timestamp) +
                    escrowLockPeriod /
                    (testing ? 1008 : 1),
                _amounts,
                0,
                true,
                EscrowStatus.DEFAULT,
                StakeStatus.DEFAULT
            );

            lastEscrowId = userToStakeTokenToLastEscrowId[_stake.staker][
                _stake.isEscrow ? nend : _stake.token
            ] = newEscrowId;
        }

        Stake storage _escrow = stakes[lastEscrowId];

        for (uint8 i = 0; i < 3; i++) {
            uint256 _reward = _calculateReward(
                _stake.isEscrow ? nend : _stake.token,
                i,
                _stake.amountsPerDuration[i],
                _inflationReward /
                    stakeTokenCount +
                    inflationRollOver[_stake.isEscrow ? nend : _stake.token]
            );
            _escrow.amountsPerDuration[i] += _reward;
        }
    }

    function _accrueNonInflationReward(
        uint256 _stakeId,
        uint256 _nonInflationReward
    ) internal virtual {
        Stake storage _stake = stakes[_stakeId];

        for (uint8 i = 0; i < 3; i++) {
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
        }
    }

    function distributeInflationRewards(
        uint256 _inflationReward
    ) external virtual override {
        if (msg.sender != nend) {
            revert Unauthorized();
        }

        require(migrationCompleted, "Must migrate stakes first");

        uint256 _rolledOverInflationReward = _inflationReward + poolRollOver;
        poolRollOver = 0;

        uint256 currentActiveCount = activeStakeIds.length;
        uint256 newStakesStartIdx = currentActiveCount;

        for (uint256 i = 0; i < currentActiveCount; i++) {
            uint256 stakeId = activeStakeIds[i];
            if (!isActiveStake[stakeId]) continue;

            Stake storage _stake = stakes[stakeId];
            if (_stake.stakeStatus != StakeStatus.STAKED) {
                continue;
            }

            _compoundEscrow(stakeId, _rolledOverInflationReward);
        }

        // Process any new stakes created during distribution
        for (uint256 i = newStakesStartIdx; i < activeStakeIds.length; i++) {
            _emitStaked(activeStakeIds[i]);
        }

        for (uint256 i = 0; i < stakeTokens.length; i++) {
            address tokenAddr = stakeTokens[i];
            uint256 poolReward = _rolledOverInflationReward /
                stakeTokenCount +
                inflationRollOver[tokenAddr];
            inflationRollOver[tokenAddr] = 0;
            uint8 predefinedRollOverCount = 0;
            for (uint8 j = 0; j < 3; j++) {
                uint256 predefinedDurationReward = (poolReward *
                    rewardAllocations[j]) / 100;
                if (totalStakedByToken_Duration[tokenAddr][j] == 0) {
                    inflationRollOver[tokenAddr] += predefinedDurationReward;
                    predefinedRollOverCount++;
                }
                lastEscrowRewardByToken_Duration[tokenAddr][
                    j
                ] = predefinedDurationReward;
            }
            // Reward for all durations was rolled over => Pool rollover
            if (predefinedRollOverCount == 3) {
                inflationRollOver[tokenAddr] = 0;
                poolRollOver += _inflationReward / stakeTokenCount;
            }
        }

        emit InflationRewardDistributed();
    }

    function distributeNonInflationRewards()
        external
        virtual
        override
        onlyOwner
    {
        require(migrationCompleted, "Must migrate stakes first");

        for (uint256 i = 0; i < stakeTokens.length; i++) {
            ifpTokenToAmount[stakeTokens[i]] = lendingPool.getNamedBalance(
                "ifp",
                stakeTokens[i]
            );
        }

        for (uint256 i = 0; i < activeStakeIds.length; i++) {
            uint256 stakeId = activeStakeIds[i];
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
        uint256 _stakedAmount = _stake.amountsPerDuration[0] +
            _stake.amountsPerDuration[1] +
            _stake.amountsPerDuration[2];

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
            ongoingStakeCount--;

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

        // Mark stake as inactive
        if (isActiveStake[_stakeId]) {
            isActiveStake[_stakeId] = false;
        }

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
            _amountStaked == 0
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
}
