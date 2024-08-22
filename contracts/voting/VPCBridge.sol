//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "./ScenarioOneV2.sol";
import "./interfaces/IVPCBridge.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../vault/Vault.sol";
import "../token/ERC20/NEND.sol";
import "../helpers/SignatureHelper.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract VPCBridge is IVPCBridge, MWOwnable, UUPSUpgradeable {
    using SignatureHelper for bytes32;

    PERIv2[] public vpcs;
    Vault internal curationRewardPool;
    NEND internal nend;

    modifier validDestinationChain(uint256 chainId) virtual {
        require(
            _isChainSupported(chainId) && block.chainid != chainId,
            "Invalid destination chain"
        );
        _;
    }

    modifier validCardLevel(uint8 cardLevel) virtual {
        require(cardLevel >= 1 && cardLevel <= 4, "Invalid card level");
        _;
    }

    mapping(uint256 => mapping(uint256 => bool))
        private chainNonceToExecutedMapping;
    uint256 private nonce;

    uint256[] public supportedChainIds;

    function initialize(
        PERIv2[] memory _vpcs,
        IERC20[] memory _tickets,
        uint256[] memory _supportedChainIds,
        Vault _curationRewardPool,
        NEND _nend
    ) public virtual initializer {
        require(_vpcs.length == 4, "Invalid vpc levels");
        for (uint8 i = 0; i < 4; i++) {
            _tickets[i].approve(address(_vpcs[i]), 10000);
        }
        vpcs = _vpcs;
        require(
            _supportedChainIds.length > 1,
            "Must have at least two destination chains"
        );
        supportedChainIds = _supportedChainIds;
        require(
            _isChainSupported(block.chainid),
            "The hosted chain must be one of the supported chains"
        );
        curationRewardPool = _curationRewardPool;
        nend = _nend;

        __MWOwnable_init();
    }

    function enterBridge(
        uint256 _targetChainId,
        address _recipient,
        uint8 _cardLevel,
        uint256 _tokenId
    ) external virtual override validCardLevel(_cardLevel) {
        PERIv2 vpc = vpcs[_cardLevel - 1];
        require(vpc.ownerOf(_tokenId) == msg.sender, "Not card owner");

        curationRewardPool.burn(address(nend), vpc.MINT_PRICE());
        vpc.transferFrom(msg.sender, address(this), _tokenId);
        bool _revealed = vpc.revealChecked(_tokenId);
        string memory uri = vpc.tokenURI(_tokenId);

        emit EnterBridge(
            _targetChainId,
            msg.sender,
            _recipient,
            _cardLevel,
            _tokenId,
            _revealed,
            _revealed ? _substring(uri, 67, bytes(uri).length - 5) : "",
            nonce++,
            uint48(block.timestamp)
        );
    }

    function leaveBridge(
        uint256 _sourceChainId,
        address _recipient,
        uint8 _cardLevel,
        uint256 _tokenId,
        bool _revealed,
        string memory _tokenHash,
        uint256 _nonce,
        bytes memory _signature
    ) external virtual override validCardLevel(_cardLevel) {
        bytes32 messageHash = keccak256(
            abi.encodePacked(
                _sourceChainId,
                _recipient,
                _cardLevel,
                _tokenId,
                _revealed,
                _tokenHash,
                _nonce
            )
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
        PERIv2 vpc = vpcs[_cardLevel - 1];
        require(
            _tokenId >= vpc.mintIndexForSale() ||
                vpc.ownerOf(_tokenId) == address(this),
            "VPC not owned by bridge"
        );

        // Ensure VPC is minted
        if (_tokenId >= vpc.mintIndexForSale()) {
            vpc.ticketMint(_tokenId - vpc.mintIndexForSale() + 1);
        }

        if (_revealed && !vpc.revealChecked(_tokenId)) {
            uint256[] memory _tokenIds = new uint256[](1);
            _tokenIds[0] = _tokenId;
            string[] memory _tokenHashes = new string[](1);
            _tokenHashes[0] = _tokenHash;

            vpc.revealTokens(_tokenIds, _tokenHashes);
        }

        vpc.transferFrom(address(this), _recipient, _tokenId);
        nend.mint(address(curationRewardPool), vpc.MINT_PRICE());

        emit LeaveBridge(_nonce, _sourceChainId, uint48(block.timestamp));
    }

    function _substring(
        string memory str,
        uint256 startIndex,
        uint256 endIndex
    ) internal pure virtual returns (string memory) {
        bytes memory strBytes = bytes(str);
        bytes memory result = new bytes(endIndex - startIndex);
        for (uint256 i = startIndex; i < endIndex; i++) {
            result[i - startIndex] = strBytes[i];
        }
        return string(result);
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

    function _authorizeUpgrade(address) internal virtual override onlyOwner {}
}
