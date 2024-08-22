//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// Inheritance
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface ITicket is IERC20 {
    function transferFrom(address sender, address recipient, uint256 amount) external override(IERC20) returns(bool);
}