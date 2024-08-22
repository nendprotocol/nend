// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "./interfaces/ILiquidityPoolStaking.sol";
import "../access/SimpleRoleAccess.sol";
import "../vault/Vault.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract LiquidityPoolStaking is ILiquidityPoolStaking, Vault {
    address public nend;
    Farm[] public farms;
    Stake[] public stakes;

    function lpsInitialize(address _nend) public virtual initializer {
        nend = _nend;

        __Vault_init("Liquidity Pool");
        __MWOwnable_init();
    }

    function create(
        address _stakeToken,
        uint48 _end,
        uint256 _totalReward
    ) external virtual override onlyRole("admin") {
        require(_end > block.timestamp, "Invalid end time");
        require(
            IERC20(nend).balanceOf(address(this)) >= _totalReward,
            "Not enough liquidity supply"
        );

        farms.push(
            Farm(_stakeToken, uint48(block.timestamp), _end, _totalReward, 0)
        );

        emit FarmCreated(
            farms.length - 1,
            _stakeToken,
            uint48(block.timestamp),
            _end,
            _totalReward
        );
    }

    function deposit(
        uint256 _farmId,
        uint256 _amount
    ) external virtual override {
        Farm storage _farm = farms[_farmId];
        require(_farm.end > block.timestamp, "Farm closed");
        require(
            IERC20(_farm.token).balanceOf(msg.sender) >= _amount,
            "Insufficient lp token balance"
        );

        IERC20(_farm.token).transferFrom(msg.sender, address(this), _amount);

        _farm.totalStaked += _amount;

        stakes.push(
            Stake(
                msg.sender,
                _farmId,
                uint48(block.timestamp),
                0,
                uint48(block.timestamp),
                _amount,
                0
            )
        );

        emit Staked(
            stakes.length - 1,
            msg.sender,
            _farmId,
            uint48(block.timestamp),
            _amount
        );
    }

    function unstake(uint256 _stakeId) external virtual override {
        Stake storage _stake = stakes[_stakeId];
        Farm storage _farm = farms[_stake.farmId];
        require(_stake.end == 0, "Already unstaked");

        _claim(_stakeId);
        _stake.end = uint48(block.timestamp);
        _farm.totalStaked -= _stake.amount;
        IERC20(_farm.token).transfer(_stake.staker, _stake.amount);

        emit Unstaked(_stakeId, uint48(block.timestamp));
    }

    function claim(uint256 _stakeId) external virtual override {
        require(stakes[_stakeId].staker == msg.sender, "Not own stake");
        require(stakes[_stakeId].end == 0, "Already unstaked");

        _claim(_stakeId);
    }

    function claimBatch(uint256 _farmId) external virtual override {
        for (uint i = 0; i < stakes.length; i++) {
            Stake memory _stake = stakes[i];

            if (_stake.farmId != _farmId || _stake.end != 0) {
                continue;
            }

            _claim(i);
        }
    }

    function _claim(uint256 _stakeId) internal virtual {
        Stake storage _stake = stakes[_stakeId];
        Farm storage _farm = farms[_stake.farmId];
        uint256 reward = calculateReward(_stakeId);

        if (reward > 0) {
            require(
                IERC20(nend).balanceOf(address(this)) >= reward,
                "Insufficient liquidity supply"
            );

            _farm.totalReward -= reward;
            _stake.rewardClaimed += reward;
            _stake.lastClaimedAt = uint48(block.timestamp);
            IERC20(nend).transfer(_stake.staker, reward);

            emit RewardClaimed(
                _stakeId,
                _stake.rewardClaimed,
                uint48(_stake.lastClaimedAt)
            );
        }
    }

    function calculateReward(
        uint256 _stakeId
    ) public view virtual returns (uint256) {
        Stake memory _stake = stakes[_stakeId];
        // Unstaked
        if (_stake.end != 0) {
            return 0;
        }
        Farm memory _farm = farms[_stake.farmId];
        uint48 elapsed = (
            block.timestamp <= _farm.end ? uint48(block.timestamp) : _farm.end
        ) - _stake.lastClaimedAt;

        return
            (_stake.amount * _farm.totalReward * elapsed) /
            _farm.totalStaked /
            (_farm.end - _farm.start);
    }

    function _authorizeUpgrade(address) internal virtual override onlyOwner {}
}
