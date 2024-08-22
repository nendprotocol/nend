//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// Inheritance
import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721URIStorageUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/StringsUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/MerkleProofUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "../access/SimpleRoleAccess.sol";

// Internal references
import "./interfaces/WETH.sol";
import "./interfaces/INextScenario.sol";
import "./interfaces/ITicket.sol";

// @author The Peri Finanace team
// @title A Peri NFT Contract
contract PERIv2 is
    ERC721Upgradeable,
    ERC721URIStorageUpgradeable,
    ERC721EnumerableUpgradeable,
    SimpleRoleAccess,
    UUPSUpgradeable
{
    /* ========== STATE VARIABLES ========== */

    //Index of tokens to sell
    uint256 public mintIndexForSale;

    //Number of blocks to start selling
    uint256 public mintStartBlockNumber;

    //Selling price
    uint256 public MINT_PRICE;

    //Notify token reveal start
    bool public isRevealed;

    //Notify token public mint start
    bool public isEnabledPublicMint;

    //Notify token ticket mint start
    bool public isEnabledTicketMint;

    //Notify token whitelist mint start
    bool public isEnabledWhitelistMint;

    //Is it connected to the next scenario contract
    bool public isEnabledNextScenario;

    //Merkle root for verifying whitelist
    bytes32 public merkleRoot;

    //The maximum quantity sold
    uint256 public MAX_SALE_AMOUNT;

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

    //Number of mints per address
    mapping(address => uint256) public whitelistMintLimit;

    //Interface for next scenario
    INextScenario private _nextScenario;

    //Interface for trading with wETH contract
    WETH private _wETH;

    //interface
    ITicket private _ticket;

    /* ========== Initializer ========== */
    function initialize(
        string calldata name,
        string calldata symbol,
        address wETH,
        address ticket,
        uint256 mintPrice
    ) public initializer {
        __ERC721_init(name, symbol);
        __ERC721URIStorage_init();
        __MWOwnable_init();

        isRevealed = false;
        isEnabledTicketMint = false;
        isEnabledWhitelistMint = false;
        isEnabledPublicMint = false;
        isEnabledNextScenario = false;
        MAX_SALE_AMOUNT = 10000;
        mintIndexForSale = 1;
        _wETH = WETH(wETH);
        _ticket = ITicket(ticket);
        MINT_PRICE = mintPrice;
    }

    /* ========== MUTATIVE FUNCTIONS ========== */

    /**
     * @dev Only those who have tickets can mint.
     * @param requestedCount quantity to mint
     */

    function ticketMint(uint256 requestedCount) external {
        require(isEnabledTicketMint, "The ticket sale is not enabled!");
        require(
            mintIndexForSale + requestedCount <= MAX_SALE_AMOUNT,
            "Exceed max amount"
        );

        _ticket.transferFrom(msg.sender, owner(), requestedCount);

        for (uint256 i = 0; i < requestedCount; i++) {
            _mint(msg.sender, mintIndexForSale + i);
            _setTokenURI(mintIndexForSale, notRevealedURI);
            revealChecked[mintIndexForSale] = false;
        }
        mintIndexForSale += requestedCount;
    }

    /**
     * @dev Functions that only validated whitelists can mint
     * @param requestedCount quantity to mint
     * @param _merkleProof Array of Merkle Trees
     */
    function whitelistMint(
        uint256 requestedCount,
        bytes32[] calldata _merkleProof
    ) external {
        require(isEnabledWhitelistMint, "The whitelist sale is not enabled!");
        require(
            whitelistMintLimit[msg.sender] + requestedCount <= 30,
            "Exceed max requested count"
        );
        bytes32 leaf = keccak256(abi.encodePacked(msg.sender));
        require(
            MerkleProofUpgradeable.verify(_merkleProof, merkleRoot, leaf),
            "Invalid proof!"
        );

        for (uint256 i = 0; i < requestedCount; i++) {
            _mint(msg.sender, mintIndexForSale + i);
            _setTokenURI(mintIndexForSale, notRevealedURI);
            revealChecked[mintIndexForSale] = false;
        }

        whitelistMintLimit[msg.sender] =
            whitelistMintLimit[msg.sender] +
            requestedCount;
        mintIndexForSale += requestedCount;
    }

    /**
     * @dev A function that anyone can mint. Before reveal, it is minted in the unreveal state
     * @param requestedCount quantity to mint
     */
    function publicMint(uint256 requestedCount) external {
        require(isEnabledPublicMint, "The public sale is not enabled!");
        require(
            mintIndexForSale + requestedCount <= MAX_SALE_AMOUNT,
            "Exceed max amount"
        );

        _wETH.transferFrom(msg.sender, owner(), requestedCount * MINT_PRICE);

        for (uint256 i = 0; i < requestedCount; i++) {
            _mint(msg.sender, mintIndexForSale + i);
            _setTokenURI(mintIndexForSale, notRevealedURI);
            revealChecked[mintIndexForSale] = false;
        }
        mintIndexForSale += requestedCount;
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
     * @param tokenIds The ID of the tokens you want to reveal
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
    function setRevealState(bool _state) public onlyRole("deployer") {
        isRevealed = _state;
    }

    /**
     * @dev Functions that allow users to initiate ticket minting
     * @param _state True & False, Allow ticket Minting
     */
    function setTicketMintState(bool _state) public onlyRole("deployer") {
        isEnabledTicketMint = _state;
    }

    /**
     * @dev Functions that allow users to initiate whitelist minting
     * @param _state True & False, Allow Whitelist Minting
     */
    function setWhitelistMintState(bool _state) public onlyRole("deployer") {
        isEnabledWhitelistMint = _state;
    }

    /**
     * @dev A function that allows users to start mint
     * @param _state True & False, Allow mint
     */
    function setPublicMintState(bool _state) public onlyRole("deployer") {
        isEnabledPublicMint = _state;
    }

    /**
     * @dev Prevent bot, set timer to start minting, only owner can run
     * @param mintPrice Setup Mint price
     */
    function setupSale(uint256 mintPrice) external onlyRole("deployer") {
        MINT_PRICE = mintPrice;
    }

    /**
     * @dev Functions that associate with the following collection of scenarios
     * @param nextScenario Address of the next scenario contract
     */
    function setNextScenarioConenct(
        address nextScenario
    ) public onlyRole("deployer") {
        _nextScenario = INextScenario(nextScenario);
        isEnabledNextScenario = true;
    }

    /**
     * @dev Functions that set the required Merklute of whitelist validation
     * @param _merkleRoot White List's Merkle root
     */
    function setMerkleRoot(bytes32 _merkleRoot) public onlyRole("deployer") {
        merkleRoot = _merkleRoot;
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
        override(ERC721Upgradeable, ERC721EnumerableUpgradeable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
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

    /**
     * @dev Returns. About Minting
     */
    function mintingInformation() external view returns (uint256[3] memory) {
        uint256[3] memory info = [
            mintIndexForSale,
            MAX_SALE_AMOUNT,
            MINT_PRICE
        ];
        return info;
    }

    /* ========== INTERNAL FUNCTIONS ========== */

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

    function _authorizeUpgrade(
        address
    ) internal override onlyRole("deployer") {}
}
