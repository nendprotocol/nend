// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "../access/MWOwnable.sol";
import "../helpers/SignatureHelper.sol";

abstract contract NENDBridge is ERC20Upgradeable, MWOwnable {
    using SignatureHelper for bytes32;

    event EnterBridge(
        uint48 enteredAt,
        uint256 targetChainId,
        address sender,
        address receiver,
        uint256 amount,
        uint256 nonce
    );

    event LeaveBridge(uint256 nonce, uint256 sourceChainId, uint48 leftAt);

    modifier validDestinationChain(uint256 chainId) virtual {
        require(
            _isChainSupported(chainId) && block.chainid != chainId,
            "Invalid destination chain"
        );
        _;
    }

    function __Bridge_init(
        uint256[] memory _chains
    ) internal virtual onlyInitializing {
        supportedChainIds = _chains;

        require(
            _chains.length > 1,
            "Must have at least two destination chains"
        );

        require(
            _isChainSupported(block.chainid),
            "The hosted chain must be one of the supported chains"
        );
    }

    mapping(uint256 => mapping(uint256 => bool))
        private chainNonceToExecutedMapping;
    uint256 private nonce;

    uint256[] public supportedChainIds;

    function enterBridge(
        uint256 _targetChainId,
        address _receiver,
        uint256 _amount
    ) external virtual validDestinationChain(_targetChainId) {
        require(_amount > 0, "Invalid amount");
        require(balanceOf(msg.sender) >= _amount, "Insufficient balance");

        _burn(msg.sender, _amount);

        emit EnterBridge(
            uint48(block.timestamp),
            _targetChainId,
            msg.sender,
            _receiver,
            _amount,
            nonce++
        );
    }

    function leaveBridge(
        uint256 _sourceChainId,
        address _receiver,
        uint256 _amount,
        uint256 _nonce,
        bytes memory _signature
    ) external virtual {
        bytes32 messageHash = keccak256(
            abi.encodePacked(_sourceChainId, _receiver, _amount, _nonce)
        );

        require(
            messageHash.recoverSigner(_signature) == owner(),
            "Invalid signature"
        );

        // Duplicate request, already left bridge
        if (chainNonceToExecutedMapping[_sourceChainId][_nonce]) {
            return;
        }
        chainNonceToExecutedMapping[_sourceChainId][_nonce] = true;

        _mint(_receiver, _amount);

        emit LeaveBridge(_nonce, _sourceChainId, uint48(block.timestamp));
    }

    function _isChainSupported(
        uint256 chainId
    ) internal view virtual returns (bool) {
        for (uint256 i = 0; i < supportedChainIds.length; i++) {
            if (supportedChainIds[i] == chainId) {
                return true;
            }
        }

        return false;
    }
}
