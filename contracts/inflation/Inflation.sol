// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "../staking/interfaces/ILendingPoolStaking.sol";
import "../vault/Vault.sol";
import "../test/Testing.sol";
import "../access/MWOwnable.sol";
import "../helpers/SignatureHelper.sol";

abstract contract Inflation is ERC20Upgradeable, MWOwnable, Testing {
    using SignatureHelper for bytes32;

    uint48 public lastInflation;
    ILendingPoolStaking public staking;

    mapping(uint8 => bool) public isProcessed;

    function setStaking(address _staking) external virtual onlyOwner {
        staking = ILendingPoolStaking(_staking);
    }

    function reset() external virtual onlyOwner {
        uint8 i = 0;
        while (true) {
            isProcessed[i] = false;
            if (i == 255) {
                break;
            }
            i++;
        }
    }

    function inflate(
        uint8 _count,
        uint256 _amount,
        bytes memory _signature
    ) external virtual onlyOwner {
        require(address(staking) != address(0), "Staking not set");
        if (isProcessed[_count]) {
            return;
        }

        isProcessed[_count] = true;

        bytes32 messageHash = keccak256(abi.encodePacked(_count, _amount));

        require(
            messageHash.recoverSigner(_signature) == msg.sender,
            "Invalid signature"
        );

        _mint(address(staking), _amount);

        staking.distributeInflationRewards(_amount);

        lastInflation = uint48(block.timestamp);
    }
}
