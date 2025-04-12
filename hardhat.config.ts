import '@typechain/hardhat';
import '@nomiclabs/hardhat-waffle';
import '@nomiclabs/hardhat-ethers';
import '@nomiclabs/hardhat-etherscan';

import '@openzeppelin/hardhat-upgrades';

import 'hardhat-gas-reporter';

import 'solidity-coverage';

import * as dotenv from 'dotenv';

import { HardhatUserConfig, subtask } from 'hardhat/config';
// import { HardhatConfig } from 'hardhat/types';
import { TASK_COMPILE_SOLIDITY_GET_SOURCE_PATHS } from 'hardhat/builtin-tasks/task-names';

import 'hardhat-deploy';

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
const BSCTESTNET_NODE_RPC_URL =
  'https://data-seed-prebsc-2-s3.bnbchain.org:8545/';
const MUMBAI_NODE_RPC_URL = 'https://mumbai.nendfi.com/';
const FUJI_NODE_RPC_URL = 'https://fuji.nendfi.com/';

const ETH_NODE_RPC_URL = `https://mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`;
const BSC_NODE_RPC_URL = 'https://bsc-dataseed1.binance.org/';
// const BSC_NODE_RPC_URL = `https://bsc-mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`;
const AVX_NODE_RPC_URL = 'https://api.avax.network/ext/bc/C/rpc';
const AMOY_NODE_RPC_URL = 'https://rpc-amoy.polygon.technology';
// const POLY_NODE_RPC_URL = 'https://polygon-rpc.com';
const POLY_NODE_RPC_URL = 'https://rpc.ankr.com/polygon';
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;

const TESTNET_WALLET_PRIVATE_KEY = process.env.TEST_PRIVATE_KEY; // Nend Turbo Main Wallet testnet
const MAIN_WALLET_PRIVATE_KEY = process.env.MASTER_PRIVATE_KEY; // Nend Turbo Main Wallet testnet

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
            runs: 1000000,
            details: {
              yulDetails: {
                optimizerSteps: 'u'
              }
            }
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
            runs: 1000000,
            details: {
              yulDetails: {
                optimizerSteps: 'u'
              }
            }
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
            runs: 1000000,
            details: {
              yulDetails: {
                optimizerSteps: 'u'
              }
            }
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
            runs: 1000000,
            details: {
              yulDetails: {
                optimizerSteps: 'u'
              }
            }
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
            runs: 1000000,
            details: {
              yulDetails: {
                optimizerSteps: 'u'
              }
            }
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
            runs: 1000000,
            details: {
              yulDetails: {
                optimizerSteps: 'u'
              }
            }
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
            runs: 500,
            details: {
              yulDetails: {
                optimizerSteps: 'u'
              }
            }
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
            runs: 500,
            details: {
              yulDetails: {
                optimizerSteps: 'u'
              }
            }
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
    amoy: {
      live: true,
      saveDeployments: true,
      tags: ['stage'],
      url: `${AMOY_NODE_RPC_URL}`,
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
      forking: {
        enabled: false,
        url: `${BSC_NODE_RPC_URL}`
      },
      mining: {
        auto: true,
        interval: 0
      },
      // Enable hardhat_impersonateAccount capability
      chainId: 31337,
      // Add account impersonation settings
      loggingEnabled: false,
      accounts: [
        {
          privateKey: `${TESTNET_WALLET_PRIVATE_KEY}`,
          balance: '100000000000000000000'
        },
        {
          // Test user 1 - random private key (don't use for real funds)
          privateKey:
            '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d',
          balance: '100000000000000000000'
        },
        {
          // Test user 2 - random private key (don't use for real funds)
          privateKey:
            '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a',
          balance: '100000000000000000000'
        },
        {
          // Admin - random private key (don't use for real funds)
          privateKey:
            '0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6',
          balance: '100000000000000000000'
        }
      ]
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
      // Enable hardhat_impersonateAccount capability
      chainId: 31337,
      // Add account impersonation settings
      loggingEnabled: false,
      accounts: [
        `${TESTNET_WALLET_PRIVATE_KEY}`,
        '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d',
        '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a',
        '0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6'
      ]
    }
  },
  /* namedAccounts: {
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
  namedAccounts: {
    deployer: {
      default: 0
      // Add network-specific accounts if needed
    }
  },
  paths: {
    cache: 'hh-cache',
    deploy: ['deploy'],
    deployments: 'deployments'
  }
};
export default config;
