//SPDX-License-Identifier: Unlicense
pragma solidity >=0.8.0;

import "../access/MWOwnable.sol";

abstract contract Testing is MWOwnable {
    bool public testing;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {
        testing = false;
    }

    function __Testing_init() public virtual onlyInitializing {
        testing = false;
    }

    function setTesting(bool _testing) external onlyOwner {
        testing = _testing;
    }
}
