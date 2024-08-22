//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "./interfaces/INextScenario.sol";

contract DummyS2 is INextScenario {
    function publicMint(address _tokenOwner) external override {
        // Intentionally do nothing
    }
}
