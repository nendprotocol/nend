//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// Inheritance
import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721URIStorageUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/StringsUpgradeable.sol";

// Internal references
import "./interfaces/WETH.sol";
import "./interfaces/INextScenario.sol";

// @author The Peri Finanace team
// @title A Peri NFT Contract
contract NendNFTs2 is
    ERC721Upgradeable,
    ERC721URIStorageUpgradeable,
    ERC721EnumerableUpgradeable,
    OwnableUpgradeable
{
    /* ========== STATE VARIABLES ========== */

    //Index of tokens to sell
    uint256 public mintIndexForSale;

    //The maximum quantity sold
    uint256 public MAX_SALE_AMOUNT;

    //Notify token reveal start
    bool public isRevealed;

    //Is it connected to the next scenario contract
    bool public isEnabledNextScenario;

    //Address of previous scenario contract
    address public ORIGIN_CONTRACT;

    //Default URL of revealed tokens
    string private baseURI;

    //Default URL of unreveal tokens
    string private notRevealedURI;

    //Mapping owner address to last block number
    mapping(address => uint256) private _lastCallBlockNumber;

    //Mapping from owner address to token URI
    mapping(uint256 => string) private _tokenURIs;

    //Mapping from token ID to reveal checked (true & false)
    mapping(uint256 => bool) public revealChecked;

    //Interface for next scenario
    INextScenario private _nextScenario;

    //Interface for trading with wETH contract
    WETH private _wETH;

    function initialize(
        string calldata name,
        string calldata symbol,
        address wETH,
        address originContract
    ) public initializer {
        __ERC721_init(name, symbol);
        __ERC721URIStorage_init();
        __Ownable_init();

        isRevealed = false;
        isEnabledNextScenario = false;
        MAX_SALE_AMOUNT = 10000;
        mintIndexForSale = 1;
        ORIGIN_CONTRACT = originContract;
        _wETH = WETH(wETH);
    }

    /* ========== MUTATIVE FUNCTIONS ========== */

    /**
     * @dev A function that anyone can mint. Before reveal, it is minted in the unreveal state
     * @param tokenOwner The owner of the minting token
     */
    function publicMint(address tokenOwner) external {
        require(msg.sender == ORIGIN_CONTRACT, "caller is not origin!");
        require(mintIndexForSale <= MAX_SALE_AMOUNT, "Exceed max amount");

        _mint(tokenOwner, mintIndexForSale);
        _setTokenURI(mintIndexForSale, notRevealedURI);
        revealChecked[mintIndexForSale] = false;
        mintIndexForSale += 1;
        _lastCallBlockNumber[msg.sender] = block.number;
    }

    /**
     * @dev A function that can be repaired in the event of an unintended error when revealed. Only the owner can execute it
     * @param tokenId The ID of the token you want to repair
     * @param tokenHash The unique hash value of the token
     */
    function repairTokenURI(
        uint256 tokenId,
        string calldata tokenHash
    ) public onlyOwner {
        string memory _revealURI = string(
            abi.encodePacked(baseURI, tokenHash, ".json")
        );
        _tokenURIs[tokenId] = _revealURI;
    }

    /**
     * @dev A function that revises tokens that have not yet been revealed. It issues tokens in the next scenario at the same time
     * @param tokenIds The ID of the token you want to reveal
     * @param tokenHash The unique hash value of the token
     */
    function revealTokens(
        uint256[] calldata tokenIds,
        string[] calldata tokenHash
    ) public {
        require(isRevealed == true, "Not yet started");
        require(bytes(baseURI).length > 0, "Invalid BaseURI");
        require(
            isEnabledNextScenario == true,
            "The next scenario is not enabled!"
        );

        for (uint256 i = 0; i < tokenIds.length; i++) {
            require(
                ownerOf(tokenIds[i]) == msg.sender,
                "Token owner is not false"
            );
            require(
                revealChecked[tokenIds[i]] == false,
                "Already Revealed token!"
            );
            string memory _revealURI = string(
                abi.encodePacked(baseURI, tokenHash[i], ".json")
            );
            revealChecked[tokenIds[i]] = true;
            _tokenURIs[tokenIds[i]] = _revealURI;
            _NextScenarioMint(msg.sender);
        }
    }

    /**
     * @dev Set base URI of reveal tokens. Only the owner can do it
     * @param _newBaseURI Base URI of revealed tokens
     */
    function setBaseURI(string memory _newBaseURI) public onlyOwner {
        baseURI = _newBaseURI;
    }

    /**
     * @dev Set base URI of unreveal tokens. Only the owner can do it
     * @param _newNotRevealedURI Base URI of unreveal tokens
     */
    function setNotRevealedURI(
        string memory _newNotRevealedURI
    ) public onlyOwner {
        notRevealedURI = _newNotRevealedURI;
    }

    /**
     * @dev A function that allows users to start reveal
     * @param _state True & False, Allow reveal
     */
    function setRevealState(bool _state) public onlyOwner {
        isRevealed = _state;
    }

    /**
     * @dev Functions that associate with the following collection of scenarios
     * @param nextScenario Address of the next scenario contract
     */
    function setNextScenarioConenct(address nextScenario) public onlyOwner {
        _nextScenario = INextScenario(nextScenario);
        isEnabledNextScenario = true;
    }

    /**
     * @dev A function that mints the following collection of scenarios
     * @param tokenOwner The address of the token owner to mint
     */
    function _NextScenarioMint(address tokenOwner) private {
        _nextScenario.publicMint(tokenOwner);
    }

    /* ========== VIEWS ========== */

    /**
     * @dev See {IERC165-supportsInterface}
     */
    function supportsInterface(
        bytes4 interfaceId
    )
        public
        view
        override(ERC721EnumerableUpgradeable, ERC721URIStorageUpgradeable, ERC721Upgradeable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    /**
     * @dev Returns. About Minting
     */
    function mintingInformation()
        external
        view
        onlyOwner
        returns (uint256[2] memory)
    {
        uint256[2] memory info = [mintIndexForSale, MAX_SALE_AMOUNT];
        return info;
    }

    /**
     * @dev Returns the Uniform Resource Identifier (URI) for `tokenId` token
     */
    function tokenURI(
        uint256 tokenId
    )
        public
        view
        virtual
        override(ERC721Upgradeable, ERC721URIStorageUpgradeable)
        returns (string memory)
    {
        require(
            _exists(tokenId),
            "ERC721URIStorage: URI query for nonexistent token"
        );

        if (revealChecked[tokenId] == false) {
            return notRevealedURI;
        }
        string memory _tokenURI = _tokenURIs[tokenId];
        return _tokenURI;
    }

    /* ========== INTERNAL FUNCTIONS ========== */

    /**
     * @dev Hook that is called before any token transfer. This includes minting
     * and burning.
     *
     * Calling conditions:
     *
     * - When `from` and `to` are both non-zero, ``from``'s `tokenId` will be
     * transferred to `to`.
     * - When `from` is zero, `tokenId` will be minted for `to`.
     * - When `to` is zero, ``from``'s `tokenId` will be burned.
     * - `from` and `to` are never both zero.
     *
     * To learn more about hooks, head to xref:ROOT:extending-contracts.adoc#using-hooks[Using Hooks].
     */
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId /* firstTokenId */,
        uint256 batchSize
    ) internal override(ERC721Upgradeable, ERC721EnumerableUpgradeable) {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
    }

    /**
     * @dev Destroys `tokenId`.
     * The approval is cleared when the token is burned.
     *
     * Requirements:
     *
     * - `tokenId` must exist.
     *
     * Emits a {Transfer} event.
     */
    function _burn(
        uint256 tokenId
    )
        internal
        virtual
        override(ERC721Upgradeable, ERC721URIStorageUpgradeable)
    {
        super._burn(tokenId);
    }
}
