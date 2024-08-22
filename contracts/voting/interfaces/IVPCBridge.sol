//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

abstract contract IVPCBridge {
    event EnterBridge(
        uint256 targetChainId,
        address sender,
        address recipient,
        uint8 cardLevel,
        uint256 tokenId,
        bool revealed,
        string tokenHash,
        uint256 nonce,
        uint48 enteredAt
    );

    event LeaveBridge(
        uint256 nonce,
        uint256 sourceChainId,
        uint48 leftAt
    );

    function enterBridge(
        uint256 _targetChainId,
        address _recipient,
        uint8 _cardLevel,
        uint256 _tokenId
    ) external virtual;

    function leaveBridge(
        uint256 _sourceChainId,
        address _recipient,
        uint8 _cardLevel,
        uint256 _tokenId,
        bool _revealed,
        string memory _tokenHash,
        uint256 _nonce,
        bytes memory _signature
    ) external virtual;
}
