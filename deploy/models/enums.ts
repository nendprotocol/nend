export enum UploadType {
    SHOP_PRODUCT = 0,
    BANNER = 1,
    POPUP = 2,
    LEAGUE = 3,
    TEAM = 4,
    ADVERTISEMENT = 5,
    CONTACTUS = 6,
    OTHERS = 10
}

export enum ModalType {
    CONFIRM = "confirm",
    CREATECOLLECTION = "createCollection"
}

export enum WalletType {
    METAMASK = "metamask",
    COINBASE = "coinbase",
    WALLETCONNECT = "walletconnect",
    PHANTOM = "phantom",
    GLOW = "glow",
    FORTMATIC = "fortmatic"
}

export enum BlockChainEnum {
    ETHEREUM = "ethereum",
    SOLANA = "solana",
}

export enum ChainEnum {
    ETH = "eth",
    ETH_TEST_RINKEBY = "rinkeby",
    ETH_TEST_GOERLI = "goerli",

    BSC = "bsc",
    BSC_TEST = "bsctest",

    AVAX = "avalanche",
    AVAX_TEST_FUJI = "fuji",

    POLYGON = "matic",
    POLYGON_TEST_MUMBAI = "mumbai",

    SOLANA = "solana",
    SOLANA_TEST = "solanatest",
}

export const MoralisChainsDict = {
    "eth": "eth",
    "rinkeby": "rinkeby",
    "goerli": "goerli",
    "bsc": "bsc",
    "bsctest": "bsc testnet",
    "avalanche": "avalanche",
    "fuji": "avalanche testnet",
    "matic": "matic",
    "mumbai": "mumbai",
    "solana": "solana",
    "solanatest": "solanatest",
}

export const MainnetChains = ["eth", "bsc", "avalanche", "matic", "solana"];
export const TestnetChains = ["rinkeby", "goerli", "bsctest", "fuji", "mumbai", "solanatest"];

export enum ChainIdEnum {
    ETH = 1,
    ETH_TEST_RINKEBY = 4,

    BSC = 56,
    BSC_TEST = 97,

    AVAX = 43114,
    AVAX_TEST_FUJI = 43113,

    POLYGON = 137,
    POLYGON_TEST_MUMBAI = 80001,

    MOONRIVER = 1285,
    MOONBASE_ALPHA = 1287,
}

const stable = {
    1: {
        USDC: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        DAI: '0x6b175474e89094c44da98b954eedeac495271d0f'
    },
    56: {
        USDC: '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d',
        DAI: '0x1af3f329e8be154074d8769d1ffa4ee058b1dbc3',
    },
    137: {
        USDC: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
        DAI: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063'
    },
    97: {
        USDC: '0x8EDc640693b518c8d531A8516A5C0Ae98b641a03',
        DAI: '0x52306d4521eFF70Ba555A578a66705b3352e8B3a'
    },
    1285: {
        USDC: '0xE3F5a90F9cb311505cd691a46596599aA1A0AD7D',
        DAI: '0x80A16016cC4A2E6a2CACA8a4a498b1699fF0f844'
    },
    1287: {
        USDC: '0xDF17D7AaCC4cE7f675d3600A07b3CEA843F3669f',
        DAI: '0x33B86de94702C5Ff1ECba36D38Ea2Fc238894315'
    },
    80001: {
        USDC: '0xcE954FC4c52A9E6e25306912A36eC59293da41E3',
        DAI: '0xAcC78d249781EDb5feB50027971EF4D60f144325'
    }
}

export enum OrderStatus {
    Rejected = -2,
    Cancelled = -1,
    Pending = 0,
    Active = 1,
    Complete = 2,
    Protected = 5
}

export enum CollectionType {
    NendNftCollection = 1,
    UserNftCollection = 10,
    AdminNftCollection = 20
}

export enum CollectionStatus {
    Verified = 1,
    Unverified = 0
}

export enum AssetType {
    NftImage = 1,
    NftVideo = 2,
    NftAudio = 3,
    NendPromissoryNote = 10,
    NendEAB = 11,
    NendTrustDeed = 12,
    NendVotingPowerCard = 20
}

export enum AssetStatus {
    ListedForSale = 1,
    ListedForAuction = 2,
    ListedForOffers = 3, // external NFTs
    Processing = 5,
    OnCuration = 10,
    AvailableForLoan = 11,
    OnLoan = 12,
    Unlisted = 0
}


export enum MarketplaceSortOrderType {
    RECENTLY_LISTED = "listed_desc",
    RECENTLY_MINTED = "created_desc",
    RECENTLY_SOLD = "sold_desc",
    PRICE_LOWTOHIGH = "price_asc",
    PRICE_HIGHTOLOW = "price_desc",
    HIGHEST_LASTSOLD = "last_sell_desc"
}

export enum MarketplaceFilterStatus {
    VERIFIED = "verified",
    ON_SALE = "on_sale",
    ON_CURATION = "on_curation",
    AVAILABLE_FOR_LOAN = "available_for_loan",
    ON_LOAN = "on_loan",
    ON_AUCTION = "on_auction"
}


export enum MarketplaceListingType {
    Listing = 1,
    Offer = 2,
    Auction = 3,
}

export enum OrderOfferType {
    Listing = 1,
    Offer = 2,
    Auction = 3,
}

export enum OrderItemType {
    NATIVE = 0,
    ERC20 = 1,
    ERC721 = 2,
    ERC1155 = 3,
    ERC721_WITH_CRITERIA = 4,
    ERC1155_WITH_CRITERIA = 5,
}

export enum Address {
    ZERO = "0x0000000000000000000000000000000000000000"
}

export enum CurationStatus {
    ONGOING = 0,
    REJECTED = 1,
    SETTLING_WINNERS = 2,
    FINISHED = 3
}

export enum LoanOfferStatus {
    Offered = 1,
    Accepted = 10,
    Cancelled = -1,
    Rejected = -10
}

export enum LoanStatus {
    InProgress = 1,
    Repaid = 2,
    Liquidated = 3,
    PreLiquidation = 4,
    LiquidatingViaAuction = 5,
    WaitingForNextAuction = 6,
    WaitingForLenderToClaim = 7,
    WaitingForFirstAuction = 8,
    WaitingForLowHealthFactorAuction = 9,
}

export enum LoanSortOrderType {
    RECENTLY_CREATED = "created_desc", //Newest => this is default
    ASSETNAME_ASC = "assetname_asc", //Title (A to Z)
    ASSETNAME_DESC = "assetname_desc", //Title (Z to A)
    LOANAMOUNT_LOWTOHIGH = "loanamount_asc", //Loan Amount (Low to High) => should use loanAmountUsd
    LOANAMOUNT_HIGHTOLOW = "loanamount_desc",//Loan Amount (High to Low) => should use loanAmountUsd
}

export enum UserActivityLogActionType {
    CollectionCreated = 1,

    NftMinted = 10,
    NftListedForSale = 11,
    NftListedForAuction = 12,
    NftAuctionEnded = 13,
    NftListingCancelled = 14,

    NftSold = 20,
    NftPurchased = 21,

    NftIncomingOfferReceived = 30,
    NftIncomingOfferAccepted = 31,
    NftIncomingOfferRejected = 32,
    NftIncomingOfferCancelled = 33,

    NftOutgoingOfferCreated = 40,
    NftOutgoingOfferAccepted = 41,
    NftOutgoingOfferRejected = 42,
    NftOutgoingOfferCancelled = 43,

    NftCurationStarted = 50,
    NftCurationVoted = 51,
    NftCurationResults = 52,

    NftIncomingLoanOfferReceived = 60,
    NftIncomingLoanOfferAccepted = 61,
    NftIncomingLoanOfferRejected = 62,
    NftIncomingLoanOfferCancelled = 63,

    NftOutgoingLoanOfferCreated = 70,
    NftOutgoingLoanOfferAccepted = 71,
    NftOutgoingLoanOfferRejected = 72,
    NftOutgoingLoanOfferCancelled = 73,

    NftLoanRepaid = 80,
    NftPreliquidation = 81,
    NftLiquidation = 82,
    NftReadyToClaim = 83,
    NftLiquidationAuctionStarted = 84,
    NftLiquidationAuctionSold = 85,

    VpcPurchase = 90,
    VpcRevealed = 91,
    VpcGamificationWin = 92,

    Staked = 100,
    Unstaked = 101,
    StakeRewardAllocated = 102,

    Bonded = 110,
    Redeemed = 111,

    NendBridgeRequest = 120,
    VpcBridgeRequest = 121,

    EABIssued = 130, 
    EABClaimed = 131,

    TrustDeedIssued = 140,
    TrustDeedSold = 141,
    
    PromissoryNoteSold = 151,
}



export enum AdminActivityLogActionType {
    AddCollection = 1,
    UpdateCollection = 2,
    UpdateChain = 21,

    CreatePaymentToken = 30,
    UpdatePaymentToken = 31,

    CreateStakeToken = 40,
    UpdateStakeToken = 41,
    DeleteStakeToken = 42,

    CreateLiquidityPoolFarm = 45,
    UpdateLiquidityPoolFarm = 46,
    DeleteLiquidityPoolFarm = 47,
    
    CreateBondingPool = 50,
    UpdateBondingPool = 51,

    UpdateCurationSettings = 60,
    UpdatePoolInterestSettings = 61,
}



export const VPCPriceByLevel = [5, 10, 20, 40];


export enum StakingDurationId {
    ONE_WEEK = 0,
    FOUR_WEEKS = 1,
    TWELVE_WEEKS = 2
}

export enum PoolType {
    MasterWallet = 0,
    CommissionPool = 1,
    CurationReward = 2,
    LendingPool = 3,
    InsuranceVault = 4,
    EcosystemFund = 5,
    LiquidityPool = 6
}

export const NftBankChains = {
    "ETHEREUM": "eth",
    "MATIC": "matic"
};


export enum ChainTypeEnum {
    EVM = 1,
    SOLANA = 2,
}

export const ChainCodes = {
    "1": "eth",
    "4": "rinkeby",
    "5": "goerli",

    "56": "bsc",
    "97": "bsctest",

    "43114": "avax",
    "43113": "fuji",

    "137": "matic",
    "80001": "mumbai",
};

export enum StakeStatus {
    DEFAULT = 0, // Not staked
    STAKED = 1, // Not unstaked
    FULFILLED = 2, // Stake ended gracefully
}

export enum EscrowStatus {
    DEFAULT = 0, // Not issued
    ISSUED = 1,
    CLAIMED = 2,
}
