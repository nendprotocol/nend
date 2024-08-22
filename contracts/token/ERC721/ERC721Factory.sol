// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "./PeriFiNFT.sol";

contract ERC721Factory is ReentrancyGuard, Context {
    using Address for address;
    using Counters for Counters.Counter;

    address[] private _contracts;

    event ERC721Deployed(
        address indexed from,
        address indexed contractAddr,
        string name,
        string symbol
    );

    function totalOf() public view returns (uint256) {
        return _contracts.length;
    }

    function addressOf(uint256 index)
        public
        view
        returns (address contractAddr)
    {
        // if the given index is invalid, return empty address
        if (_contracts.length == 0 || _contracts.length + 1 < index) {
            return address(0);
        }
        return _contracts[index];
    }

    // deploy a newly purchased contract
    function deploy(string memory name, string memory symbol)
        public
        nonReentrant
        returns (address newContractAddr)
    {
        // create new contract
        PeriFiNFT contractToDeploy = new PeriFiNFT(name, symbol);
        contractToDeploy.transferOwnership(_msgSender());
        address cAddr = address(contractToDeploy);
        _contracts.push(cAddr);

        // emit contract deploy event
        emit ERC721Deployed(_msgSender(), cAddr, name, symbol);
        return cAddr;
    }
}
