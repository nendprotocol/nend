// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title IVault
 * @dev Interface for the Vault contract
 */
interface IVault {
    function initialize(string memory _name) external;

    function approveERC20Transfer(
        address _tokenAddress,
        address _spender,
        uint256 _amount
    ) external returns (bool);

    function transferERC20(
        address _tokenAddress,
        address _to,
        uint256 _amount
    ) external returns (bool);

    function setERC721ApprovalForAll(
        address _tokenAddress,
        address _operator,
        bool _approved
    ) external;

    function transferERC721(
        address _tokenAddress,
        address _to,
        uint256 _tokenId
    ) external;

    function transferERC1155(
        address _tokenAddress,
        address _to,
        uint256 _id,
        uint256 _value,
        bytes calldata _data
    ) external;

    function transferERC1155Batch(
        address _tokenAddress,
        address _to,
        uint256[] calldata _ids,
        uint256[] calldata _values,
        bytes calldata _data
    ) external;

    function setERC1155ApprovalForAll(
        address _tokenAddress,
        address _operator,
        bool _approved
    ) external;

    function getNativeBalance() external view returns (uint256);

    function transferNative(
        address payable _to,
        uint256 _amount
    ) external payable;

    function burn(address _token, uint256 _amount) external;

    function namedBalanceReceive(
        string memory _name,
        address _token,
        uint256 _amount
    ) external;

    function namedBalanceSpend(
        string memory _name,
        address _token,
        uint256 _amount
    ) external;

    function getNamedBalance(
        string memory _name,
        address _token
    ) external view returns (uint256);

    function claim(bytes[] memory _hashes, bytes[] memory _signatures) external;
}
