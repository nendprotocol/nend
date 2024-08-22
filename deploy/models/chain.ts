export interface ContractAddress {
    address : string
};

interface ChainName {
    name : string
};

export const ContractAddresses : Record<string, ContractAddress> = {
    "nendAddress": { address: '' },
    "vpc1Address": { address: '' },
    "vpc2Address": { address: '' },
    "vpc3Address": { address: '' },
    "vpc4Address": { address: '' },
    "vpcBridgeAddress": { address: '' },
    "lendingPoolStakingAddress": { address: '' },
    "liquidityPoolStakingAddress": { address: '' },
    "bondingAddress": { address: '' },
    "collectionFactoryAddress": { address: '' },
    "marketplaceAddress": { address: '' },
    "curationAddress": { address: '' },
    "loanAddress": { address: '' },
    "auctionAddress": { address: '' },
    "trustDeedAddress": { address: '' },
    "adminAddress": { address: '' },
    "commissionPoolAddress": { address: '' },
    "lendingPoolAddress": { address: '' },
    "curationRewardAddress": { address: '' },
    "insuranceVaultAddress": { address: '' },
    "ecosystemFundAddress": { address: '' },
};

export const ChainNames : Record<number, ChainName> = {
    31337: {
        name : "localhost"
    },
    4: {
        name : "rinkeby"
    },
    5: {
        name : "goerli"
    },
    80001: {
        name : "mumbai"
    },
    97: {
        name : "bsctest"
    },
    43113: {
        name : "fuji"
    },
    1: {
        name : "eth"
    },
    56: {
        name : "bsc"
    },
    43114: {
        name : "avalanche"
    },
    137: {
        name : "matic"
    }
}