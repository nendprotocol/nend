// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

abstract contract BalanceNames {
    string internal interestForPoolBalanceName = "ifp";
    string internal interestForLenderBalanceName = "ifl";
    string internal tradeCommissionBalanceName = "tc";
    string internal bondingCommissionBalanceName = "bc";
}
