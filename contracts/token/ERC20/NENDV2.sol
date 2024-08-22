// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "./NEND.sol";

contract NENDV2 is NEND {
  uint8 public version = 2;

  function getVersion() external view returns (uint8) {
    return version;
  }
}