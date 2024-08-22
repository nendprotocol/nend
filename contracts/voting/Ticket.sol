//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract PeriWhiteListTicket is ERC20Upgradeable, OwnableUpgradeable {
    function initialize(
        string calldata name,
        string calldata symbol
    ) public initializer {
        __ERC20_init(name, symbol);
        __Ownable_init();
    }

    function mint(address to, uint amount) public onlyOwner {
        require(totalSupply() + amount <= 10000, "Exceed max amount");
        _mint(to, amount);
    }

    function decimals()
        public
        view
        virtual
        override(ERC20Upgradeable)
        returns (uint8)
    {
        return 0;
    }
}
