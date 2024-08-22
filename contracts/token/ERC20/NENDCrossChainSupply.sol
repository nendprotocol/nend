// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "../../inflation/Inflation.sol";

abstract contract NENDCrossChainSupply is Inflation {
    uint256 public crossChainSupply;
    uint256 public crossChainInflationAmount;

    function update(
        uint256 _crossChainSupply,
        uint256 _crossChainInflationAmount
    ) external virtual onlyOwner {
        crossChainSupply = _crossChainSupply;
        crossChainInflationAmount = _crossChainInflationAmount;
    }

    function timeSlicedCrossChainSupply()
        external
        view
        virtual
        returns (uint256)
    {
        if (lastInflation == 0) {
            return crossChainSupply;
        }

        uint256 timeElapsed = block.timestamp - lastInflation;
        uint256 elapsedPct = (timeElapsed * 10000) /
            (testing ? 10 minutes : 1 weeks);
        if (elapsedPct > 10000) {
            elapsedPct = 10000;
        }

        return
            crossChainSupply + (crossChainInflationAmount * elapsedPct) / 10000;
    }
}
