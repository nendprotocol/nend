// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "../../bridge/NENDBridge.sol";
import "./NENDCrossChainSupply.sol";
import "../../inflation/Inflation.sol";
import "../../access/SimpleRoleAccess.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20BurnableUpgradeable.sol";

contract NEND is
    NENDBridge,
    NENDCrossChainSupply,
    SimpleRoleAccess,
    ERC20BurnableUpgradeable,
    UUPSUpgradeable
{
    bool public isMintChain;

    function mint(
        address _receiver,
        uint256 _amount
    ) external virtual onlyRole("minter") {
        _mint(_receiver, _amount);
    }

    function initialize(
        bool _isMainChain,
        uint256[] memory _chains
    ) public virtual initializer {
        isMintChain = _isMainChain;
        if (isMintChain) {
            _mint(address(this), 70000000 ether);
        }

        __ERC20_init("NEND", "NEND");
        __Bridge_init(_chains);
        __MWOwnable_init();
        __Testing_init();
    }

    function distribute(
        address _to,
        uint256 _amount
    ) external virtual onlyOwner {
        _transfer(address(this), _to, _amount);
    }

    function _authorizeUpgrade(address) internal virtual override onlyOwner {}
}
