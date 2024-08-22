// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "../helpers/SignatureHelper.sol";
import "../access/SimpleRoleAccess.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract Vault is SimpleRoleAccess, UUPSUpgradeable {
    using SignatureHelper for bytes32;

    event Claimed(bytes _hash);

    bytes4 private ERC1155_INTERFACE_ID;
    string public name;

    mapping(bytes => bool) public claimed;
    // Balance name => token => amount
    mapping(string => mapping(address => uint256)) public namedBalances;

    function initialize(string memory _name) public virtual initializer {
        __Vault_init(_name);
        __MWOwnable_init();
    }

    function __Vault_init(
        string memory _name
    ) internal virtual onlyInitializing {
        name = _name;
        ERC1155_INTERFACE_ID = 0xd9b67a26;
    }

    function approveERC20Transfer(
        address _tokenAddress,
        address _spender,
        uint256 _amount
    ) external virtual onlyRole("spender") returns (bool) {
        IERC20 erc20 = IERC20(_tokenAddress);
        return erc20.approve(_spender, _amount);
    }

    function transferERC20(
        address _tokenAddress,
        address _to,
        uint256 _amount
    ) external virtual onlyRole("spender") returns (bool) {
        IERC20 erc20 = IERC20(_tokenAddress);
        return erc20.transfer(_to, _amount);
    }

    function setERC721ApprovalForAll(
        address _tokenAddress,
        address _operator,
        bool _approved
    ) external virtual onlyRole("spender") {
        IERC721 erc721 = IERC721(_tokenAddress);
        erc721.setApprovalForAll(_operator, _approved);
    }

    function transferERC721(
        address _tokenAddress,
        address _to,
        uint256 _tokenId
    ) external virtual onlyRole("spender") {
        IERC721 erc721 = IERC721(_tokenAddress);
        erc721.transferFrom(address(this), _to, _tokenId);
    }

    function transferERC1155(
        address _tokenAddress,
        address _to,
        uint256 _id,
        uint256 _value,
        bytes calldata _data
    ) external virtual onlyRole("spender") {
        IERC1155 erc1155 = IERC1155(_tokenAddress);
        require(
            erc1155.supportsInterface(ERC1155_INTERFACE_ID),
            "given token address doesn't support ERC1155"
        );
        erc1155.safeTransferFrom(address(this), _to, _id, _value, _data);
    }

    function transferERC1155Batch(
        address _tokenAddress,
        address _to,
        uint256[] calldata _ids,
        uint256[] calldata _values,
        bytes calldata _data
    ) external virtual onlyRole("spender") {
        IERC1155 erc1155 = IERC1155(_tokenAddress);
        require(
            erc1155.supportsInterface(ERC1155_INTERFACE_ID),
            "given token address doesn't support ERC1155"
        );
        erc1155.safeBatchTransferFrom(address(this), _to, _ids, _values, _data);
    }

    function setERC1155ApprovalForAll(
        address _tokenAddress,
        address _operator,
        bool _approved
    ) external virtual onlyRole("spender") {
        IERC1155 erc1155 = IERC1155(_tokenAddress);
        require(
            erc1155.supportsInterface(ERC1155_INTERFACE_ID),
            "given token address doesn't support ERC1155"
        );
        erc1155.setApprovalForAll(_operator, _approved);
    }

    function getNativeBalance() external view virtual returns (uint256) {
        return address(this).balance;
    }

    function transferNative(
        address payable _to,
        uint256 _amount
    ) public payable virtual onlyRole("spender") {
        (bool sent, ) = _to.call{ value: _amount }("");
        require(sent, "Failed to send Ether");
    }

    function burn(
        address _token,
        uint256 _amount
    ) public virtual onlyRole("spender") {
        ERC20Burnable(_token).burn(_amount);
    }

    function namedBalanceReceive(
        string memory _name,
        address _token,
        uint256 _amount
    ) external virtual onlyRole("spender") {
        namedBalances[_name][_token] += _amount;
    }

    function namedBalanceSpend(
        string memory _name,
        address _token,
        uint256 _amount
    ) external virtual onlyRole("spender") {
        require(
            namedBalances[_name][_token] >= _amount,
            "Insufficient balance"
        );
        namedBalances[_name][_token] -= _amount;
    }

    function getNamedBalance(
        string memory _name,
        address _token
    ) external view virtual returns (uint256) {
        uint256 balance = namedBalances[_name][_token];
        uint256 actualBalance = _token == address(0)
            ? payable(this).balance
            : IERC20(_token).balanceOf(address(this));

        return balance <= actualBalance ? balance : actualBalance;
    }

    function claim(
        bytes[] memory _hashes,
        bytes[] memory _signatures
    ) external virtual {
        require(
            _hashes.length == _signatures.length,
            "Not matching hash and signature count"
        );

        for (uint256 i = 0; i < _hashes.length; i++) {
            if (claimed[_hashes[i]]) {
                continue;
            }

            (
                address _recipientAddress,
                address _tokenAddress,
                uint256 _amount,
                uint48 _timestamp
            ) = abi.decode(_hashes[i], (address, address, uint256, uint48));

            bytes32 _messageHash = keccak256(
                abi.encodePacked(
                    _recipientAddress,
                    _tokenAddress,
                    _amount,
                    _timestamp
                )
            );

            require(
                _messageHash.recoverSigner(_signatures[i]) == owner(),
                "Invalid signature"
            );

            require(_recipientAddress == msg.sender, "Not recipient");
            require(block.timestamp >= _timestamp, "Invalid timestamp");
            require(
                IERC20(_tokenAddress).balanceOf(address(this)) >= _amount,
                "Insufficient pool balance"
            );

            claimed[_hashes[i]] = true;
            IERC20(_tokenAddress).transfer(msg.sender, _amount);
            emit Claimed(_hashes[i]);
        }
    }

    receive() external payable {}

    fallback() external payable {}

    function _authorizeUpgrade(address) internal virtual override onlyOwner {}
}
