// SPDX-License-Identifier: MIT
pragma solidity >=0.8.7;

interface INonStandardERC721Transfer {
    function transfer(address _to, uint256 _tokenId) external;
}