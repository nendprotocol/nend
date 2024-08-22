// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721URIStorageUpgradeable.sol";
import "../vault/Vault.sol";
import "./interfaces/ILendingPoolStaking.sol";
import "../test/Testing.sol";
import "../access/SimpleRoleAccess.sol";
import "../access/MWOwnable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract LendingPoolStaking is
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
    Stake[] public stakes;
    uint48[3] public stakeDurations;
    // Token address => duration id => amount
    mapping(address => mapping(uint8 => uint256))
        public totalStakedByToken_Duration;
    uint8[3] public rewardAllocations;
    uint256 public poolRollOver;

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

        stakes.push(
            Stake(
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
            )
        );

        totalStakedByToken_Duration[_token][_durationId] += _amount;
        ongoingStakeCount++;

        _emitStaked(stakes.length);
    }

    function stakeEscrowedReward(uint256 _stakeId) external virtual override {
        Stake storage _stake = stakes[_stakeId - 1];
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

        emit StakeStatusChanged(_stakeId, _stake.stakeStatus);
    }

    function _compoundEscrow(
        uint256 _stakeId,
        uint256 _inflationReward
    ) internal virtual {
        Stake storage _stake = stakes[_stakeId - 1];
        uint256 lastEscrowId = userToStakeTokenToLastEscrowId[_stake.staker][
            _stake.isEscrow ? nend : _stake.token
        ];
        if (
            lastEscrowId == 0 ||
            stakes[lastEscrowId - 1].start != uint48(block.timestamp)
        ) {
            uint256[3] memory _amounts;
            stakes.push(
                Stake(
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
                )
            );

            lastEscrowId = userToStakeTokenToLastEscrowId[_stake.staker][
                _stake.isEscrow ? nend : _stake.token
            ] = stakes.length;
        }

        Stake storage _escrow = stakes[lastEscrowId - 1];

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
        Stake storage _stake = stakes[_stakeId - 1];

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

        uint256 _rolledOverInflationReward = _inflationReward + poolRollOver;
        poolRollOver = 0;

        // Deal with list being modified during loop
        uint256 _stakeCount = stakes.length;

        for (uint256 i = 0; i < _stakeCount; i++) {
            Stake storage _stake = stakes[i];

            if (_stake.stakeStatus != StakeStatus.STAKED) {
                continue;
            }

            _compoundEscrow(i + 1, _rolledOverInflationReward);
        }

        for (uint256 i = _stakeCount; i < stakes.length; i++) {
            _emitStaked(i + 1);
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
        for (uint256 i = 0; i < stakeTokens.length; i++) {
            ifpTokenToAmount[stakeTokens[i]] = lendingPool.getNamedBalance(
                "ifp",
                stakeTokens[i]
            );
        }

        for (uint256 i = 0; i < stakes.length; i++) {
            Stake storage _stake = stakes[i];

            if (_stake.stakeStatus != StakeStatus.STAKED) {
                continue;
            }

            _accrueNonInflationReward(
                i + 1,
                ifpTokenToAmount[_stake.isEscrow ? nend : _stake.token]
            );
        }

        for (uint256 i = 0; i < stakeTokens.length; i++) {
            uint256 distributedAmount = ifpTokenToAmount[stakeTokens[i]] -
                lendingPool.getNamedBalance(
                    "ifp",
                    stakeTokens[i]
                );

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
            uint256 reward = lendingPool.getNamedBalance(
                "ifp",
                token
            );

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
        Stake storage _stake = stakes[_stakeId - 1];
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
        Stake storage _stake = stakes[_stakeId - 1];

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

        delete stakes[_stakeId - 1];
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
        Stake memory _stake = stakes[_stakeId - 1];
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
            stakes[tokenId - 1].staker = to;
        }
    }

    function _authorizeUpgrade(address) internal virtual override onlyOwner {}
}
