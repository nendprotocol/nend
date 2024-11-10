// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721URIStorageUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "../access/SimpleRoleAccess.sol";
import "./PeriFiLoan.sol";
import "../PeriFiAdmin.sol";
import "hardhat/console.sol";

contract TrustDeed is
    ERC721URIStorageUpgradeable,
    ERC721BurnableUpgradeable,
    SimpleRoleAccess,
    UUPSUpgradeable
{
    address payable public periFiLoanAddr;
    address public periFiAdminAddr;

    function initialize() public virtual initializer {
        __ERC721_init("PeriFi Loan Trust Deed", "PTD");
        __MWOwnable_init();
    }

    function setLoanAddress(
        address payable loanAddr
    ) external virtual onlyOwner {
        console.log("owner: %s sender: %s", owner(), msg.sender);
        periFiLoanAddr = loanAddr;
    }

    function setAdminAddress(address adminAddr) external virtual onlyOwner {
        periFiAdminAddr = adminAddr;
    }

    function safeMint(
        address to,
        uint256 tokenId
    ) public virtual onlyRole("minter") {
        _safeMint(to, tokenId);
    }

    function safeBurn(uint256 tokenId) external virtual onlyRole("minter") {
        if (_exists(tokenId)) {
            _burn(tokenId);
        }
    }

    function setTokenURI(uint256 tokenId, string memory uri) external virtual {
        super._setTokenURI(tokenId, uri);
    }

    function tokenURI(
        uint256 tokenId
    )
        public
        view
        virtual
        override(ERC721Upgradeable, ERC721URIStorageUpgradeable)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function _burn(
        uint256 tokenId
    )
        internal
        virtual
        override(ERC721Upgradeable, ERC721URIStorageUpgradeable)
    {
        super._burn(tokenId);
    }

    function approve(address to, uint256 tokenId) public virtual override(ERC721Upgradeable, IERC721Upgradeable) {
        PeriFiAdmin periFiAdmin = PeriFiAdmin(periFiAdminAddr);
        PeriFiLoan periFiLoan = PeriFiLoan(periFiLoanAddr);
        uint256 extraDuration = periFiAdmin.preLiquidationDuration();

        require(
            !periFiLoan.isOverdue(tokenId, extraDuration),
            "Loan is overdue"
        );
        super.approve(to, tokenId);
    }

    function transferFrom(
        address from,
        address to,
        uint256 tokenId
    ) public virtual override(ERC721Upgradeable, IERC721Upgradeable) {
        PeriFiAdmin periFiAdmin = PeriFiAdmin(periFiAdminAddr);
        PeriFiLoan periFiLoan = PeriFiLoan(periFiLoanAddr);
        uint256 extraDuration = periFiAdmin.preLiquidationDuration();

        require(
            !periFiLoan.isOverdue(tokenId, extraDuration),
            "Loan is overdue"
        );
        super.transferFrom(from, to, tokenId);
    }

    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId
    ) public virtual override(ERC721Upgradeable, IERC721Upgradeable) {
        PeriFiAdmin periFiAdmin = PeriFiAdmin(periFiAdminAddr);
        PeriFiLoan periFiLoan = PeriFiLoan(periFiLoanAddr);
        uint256 extraDuration = periFiAdmin.preLiquidationDuration();

        require(
            !periFiLoan.isOverdue(tokenId, extraDuration),
            "Loan is overdue"
        );
        super.safeTransferFrom(from, to, tokenId);
    }

    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId,
        bytes memory _data
    ) public virtual override(ERC721Upgradeable, IERC721Upgradeable) {
        PeriFiAdmin periFiAdmin = PeriFiAdmin(periFiAdminAddr);
        PeriFiLoan periFiLoan = PeriFiLoan(periFiLoanAddr);
        uint256 extraDuration = periFiAdmin.preLiquidationDuration();

        require(
            !periFiLoan.isOverdue(tokenId, extraDuration),
            "Loan is overdue"
        );
        super.safeTransferFrom(from, to, tokenId, _data);
    }

    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC721Upgradeable, ERC721URIStorageUpgradeable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    function _authorizeUpgrade(address) internal virtual override onlyOwner {}
}
