// ChainTokens: native > nend > usdc? > link? > dai?
interface ChainTokens {
    native : string, 
    nend : string, 
    usdc? : string, 
    link? : string, 
    dai? : string,
    swapRouter?: string
};

// ChainTokens: native > nend > usdc? > link? > dai?
interface ChainUniSwapRouter {
    swapRouter: string
};

export const VaultProxyTokens : Record<number, ChainTokens> = {
    4: {
        native : "0x0000000000000000000000000000000000000000",
        nend : "",
        link : "0x01be23585060835e02b77ef475b0cc51aa1e0709",
        dai : "0x5592EC0cfb4dbc12D3aB100b257153436a1f0FEa",
        swapRouter : "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"
    },
    5: {
        native : "0x0000000000000000000000000000000000000000",
        nend : "",
        link : "0x326C977E6efc84E512bB9C30f76E30c160eD06FB",
        dai : "0xdc31Ee1784292379Fbb2964b3B9C4124D8F89C60",
        swapRouter : "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"
    },
    80001: {
        native : "0x0000000000000000000000000000000000000000",
        nend : "",
        usdc : "0x9aa7fec87ca69695dd1f879567ccf49f3ba417e2",
        dai : "0x9a753f0f7886c9fbf63cf59d0d4423c5eface95b",
        swapRouter : "0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff"
    },
    97: {
        native : "0x0000000000000000000000000000000000000000",
        nend : "",
        usdc : "0x337610d27c682E347C9cD60BD4b3b107C9d34dDd"
    },
    43113: {
        native : "0x0000000000000000000000000000000000000000",
        nend : "",
        usdc : "0x5425890298aed601595a70ab815c96711a31bc65",
        dai : "0x9a753f0f7886c9fbf63cf59d0d4423c5eface95b"
    }
};

export const UniSwapRouters : Record<number, ChainUniSwapRouter> = {
    4: {
        swapRouter : "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"
    },
    5: {
        swapRouter : "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"
    },
    80001: {
        swapRouter : "0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff"
    }
}



export interface VaultProxyAddress {
    address : string
};

interface ChainName {
    name : string
};

export const VaultProxyAddresses : Record<string, VaultProxyAddress> = {
    "Ifp": { address: '' },
    "Tc": { address: '' },
    "Ifl": { address: '' }
};