// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

abstract contract SimpleRoleAccessV2 is OwnableUpgradeable {
    mapping(address => mapping(string => bool)) public hasRole;

    function authorize(
        address operator,
        string memory role,
        bool authorized
    ) public onlyOwner {
        hasRole[operator][role] = authorized;
    }

    modifier onlyRole(string memory _role) virtual {
        require(
            msg.sender == owner() || hasRole[msg.sender][_role],
            "Not authorized"
        );
        _;
    }

    modifier hasAllRoles(string[] memory _roles) virtual {
        for (uint256 i = 0; i < _roles.length; i++) {
            require(hasRole[msg.sender][_roles[i]], "Not authorized");
        }
        _;
    }

    modifier hasSomeRoles(string[] memory _roles) virtual {
        bool _hasRole;
        for (uint256 i = 0; i < _roles.length; i++) {
            if (hasRole[msg.sender][_roles[i]]) {
                _hasRole = true;
                break;
            }
        }
        require(_hasRole, "Not authorized");
        _;
    }
}
