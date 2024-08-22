import '@nomiclabs/hardhat-waffle';
import '@nomiclabs/hardhat-ethers';
import '@nomiclabs/hardhat-etherscan';

import '@openzeppelin/hardhat-upgrades';

import '@typechain/hardhat';

import 'hardhat-gas-reporter';

import 'solidity-coverage';

import 'hardhat-deploy';

import * as dotenv from 'dotenv';

import {
  HardhatUserConfig,
  subtask
} from 'hardhat/config';
import { TASK_COMPILE_SOLIDITY_GET_SOURCE_PATHS } from 'hardhat/builtin-tasks/task-names';

dotenv.config();

// Filter Reference Contracts
subtask(TASK_COMPILE_SOLIDITY_GET_SOURCE_PATHS).setAction(
  async (_, __, runSuper) => {
    const paths = await runSuper();

    return paths.filter((p: any) => !p.includes('contracts/reference/'));
  }
);

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

const GOERLI_NODE_RPC_URL = 'https://goerli.nendfi.com/';
const BSCTESTNET_NODE_RPC_URL = 'https://bsct.nendfi.com/';
const MUMBAI_NODE_RPC_URL = 'https://mumbai.nendfi.com/';
const FUJI_NODE_RPC_URL = 'https://fuji.nendfi.com/';


const ETH_NODE_RPC_URL = 'https://mainnet.infura.io/v3/2e93f34f787d436895efdf935c6605d6';
const BSC_NODE_RPC_URL = 'https://bsc-dataseed1.binance.org/';
const AVX_NODE_RPC_URL = 'https://api.avax.network/ext/bc/C/rpc';
// const POLY_NODE_RPC_URL = 'https://polygon-rpc.com';
const POLY_NODE_RPC_URL = 'https://rpc.ankr.com/polygon';

const TESTNET_WALLET_PRIVATE_KEY = 'testnet_private_key'; // Nend Turbo Main Wallet testnet
const MAIN_WALLET_PRIVATE_KEY = 'mainnet_private_key'; // Nend Turbo Main Wallet testnet
const ETHERSCAN_API_KEY = 'I5ATRZC5WM7EEBIGGHWXMGECBMZVYWY8KM';

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: '0.8.14',
        settings: {
          viaIR: true,
          optimizer: {
            enabled: true,
            runs: 500
          }
        }
      }
    ],
    overrides: {
      'contracts/loan/LoanRepaymentCalculator.sol': {
        version: '0.8.14',
        settings: {
          viaIR: true,
          optimizer: {
            enabled: true,
            runs: 1000000
          },
          debug: {
            debugInfo: []
          }
        }
      },
      'contracts/vault/LendingPool.sol': {
        version: '0.8.14',
        settings: {
          viaIR: true,
          optimizer: {
            enabled: true,
            runs: 1000000
          },
          debug: {
            debugInfo: []
          }
        }
      },
      'contracts/vault/Vault.sol': {
        version: '0.8.14',
        settings: {
          viaIR: true,
          optimizer: {
            enabled: true,
            runs: 1000000
          },
          debug: {
            debugInfo: []
          }
        }
      },
      'contracts/TrustDeed.sol': {
        version: '0.8.14',
        settings: {
          viaIR: true,
          optimizer: {
            enabled: true,
            runs: 1000000
          },
          debug: {
            debugInfo: []
          }
        }
      },
      'contracts/LoanAuction.sol': {
        version: '0.8.14',
        settings: {
          viaIR: true,
          optimizer: {
            enabled: true,
            runs: 1000000
          },
          debug: {
            debugInfo: []
          }
        }
      },
      'contracts/PeriFiAdmin.sol': {
        version: '0.8.14',
        settings: {
          viaIR: true,
          optimizer: {
            enabled: true,
            runs: 1000000
          },
          debug: {
            debugInfo: []
          }
        }
      },
      'contracts/loan/PeriFiLoan.sol': {
        version: '0.8.14',
        settings: {
          viaIR: true,
          optimizer: {
            enabled: true,
            runs: 500
          },
          debug: {
            debugInfo: []
          }
        }
      },
      'contracts/conduit/Conduit.sol': {
        version: '0.8.14',
        settings: {
          viaIR: true,
          optimizer: {
            enabled: true,
            runs: 500
          },
          debug: {
            debugInfo: []
          }
        }
      },
      'contracts/conduit/ConduitController.sol': {
        version: '0.8.14',
        settings: {
          viaIR: true,
          optimizer: {
            enabled: true,
            runs: 500
          },
          debug: {
            debugInfo: []
          }
        }
      },
      'contracts/Seaport.sol': {
        version: '0.8.14',
        settings: {
          viaIR: true,
          optimizer: {
            enabled: true,
            runs: 500
          },
          debug: {
            debugInfo: []
          }
        }
      }
    }
  },
  networks: {
    // rinkeby: {
    //   live: true,
    //   saveDeployments: true,
    //   tags: ['stage'],
    //   url: `${RINKEBY_NODE_RPC_URL}`,
    //   accounts: [`${TESTNET_WALLET_PRIVATE_KEY}`],
    //   verify: {
    //     etherscan: {
    //       apiUrl: 'https://api-rinkeby.etherscan.io/',
    //       apiKey: `${ETHERSCAN_API_KEY}`
    //     }
    //   }
    // },
    goerli: {
      live: true,
      saveDeployments: true,
      tags: ['stage'],
      url: `${GOERLI_NODE_RPC_URL}`,
      accounts: [`${TESTNET_WALLET_PRIVATE_KEY}`],
      verify: {
        etherscan: {
          apiUrl: 'https://api-goerli.etherscan.io/',
          apiKey: `${ETHERSCAN_API_KEY}`
        }
      }
    },
    bsct: {
      live: true,
      saveDeployments: true,
      tags: ['stage'],
      url: `${BSCTESTNET_NODE_RPC_URL}`,
      accounts: [`${TESTNET_WALLET_PRIVATE_KEY}`]
    },
    mumbai: {
      live: true,
      saveDeployments: true,
      tags: ['stage'],
      url: `${MUMBAI_NODE_RPC_URL}`,
      accounts: [`${TESTNET_WALLET_PRIVATE_KEY}`]
    },
    fuji: {
      live: true,
      saveDeployments: true,
      tags: ['stage'],
      url: `${FUJI_NODE_RPC_URL}`,
      accounts: [`${TESTNET_WALLET_PRIVATE_KEY}`]
    },
    eth: {
      live: true,
      saveDeployments: true,
      tags: ['prod'],
      url: `${ETH_NODE_RPC_URL}`,
      accounts: [`${MAIN_WALLET_PRIVATE_KEY}`]
    },
    bsc: {
      live: true,
      saveDeployments: true,
      tags: ['prod'],
      url: `${BSC_NODE_RPC_URL}`,
      accounts: [`${MAIN_WALLET_PRIVATE_KEY}`]
    },
    avalanche: {
      live: true,
      saveDeployments: true,
      tags: ['prod'],
      url: `${AVX_NODE_RPC_URL}`,
      accounts: [`${MAIN_WALLET_PRIVATE_KEY}`]
    },
    matic: {
      live: true,
      saveDeployments: true,
      tags: ['prod'],
      url: `${POLY_NODE_RPC_URL}`,
      accounts: [`${MAIN_WALLET_PRIVATE_KEY}`]
    },
    hardhat: {
      // live: false,
      saveDeployments: true,
      tags: ['test', 'local'],
      throwOnCallFailures: false,
      // blockGasLimit: 30_000_000,
      allowUnlimitedContractSize: true,
	  gas: 2100000,
	  gasPrice: 8000000000,
	  // loggingEnabled: true,
	  accounts: [{"privateKey": `${TESTNET_WALLET_PRIVATE_KEY}`, "balance": "100000000000000000000"}]
    },
    localhost: {
      // live: true,
      saveDeployments: true,
      tags: ['test', 'local'],
      throwOnCallFailures: false,
      // blockGasLimit: 30_000_000,
      allowUnlimitedContractSize: true,
	  gas: 2100000,
	  gasPrice: 8000000000,
	  // loggingEnabled: true,
	  accounts: [`${TESTNET_WALLET_PRIVATE_KEY}`]
    },
  },
 /*  namedAccounts: {
    deployer: 0
  }, */
  /* gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: 'USD'
  }, */
  /* etherscan: {
    apiKey: {
      rinkeby: `${ETHERSCAN_API_KEY}`,
      goerli: `${ETHERSCAN_API_KEY}`
    } 
  }, */
  // specify separate cache for hardhat, since it could possibly conflict with foundry's
  paths: { cache: 'hh-cache' }
};
export default config;
