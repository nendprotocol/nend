//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "../access/MWOwnable.sol";

contract DummyTicket is ERC20, MWOwnable {
    constructor() ERC20("VPC Ticket", "VPCT") {}

    function mint(address _account, uint256 _amount) external onlyOwner {
        _mint(_account, _amount);
    }
}
