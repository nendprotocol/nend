
<br />
<p align="center">
  <h3 align="center">Nend Solidity</h3>
</p>



<details open="open">
  <summary><h2 style="display: inline-block">Table of Contents</h2></summary>
  <ol>
    <li>
      <a href="#about-the-project">About The Project</a>
      <ul>
        <li><a href="#built-with">Built With</a></li>
      </ul>
    </li>
    <li>
      <a href="#getting-started">Getting Started</a>
      <ul>
        <li><a href="#prerequisites">Prerequisites</a></li>
        <li><a href="#build">Build</a></li>
      </ul>
    </li>
	<li><a href="#configuration">Configuration</a></li>
    <li>
      <a href="#instructions">Instructions</a>
      <ul>
        <li><a href="#deployment-configuration">Deployment Configuration</a></li>
        <li><a href="#deploy">Deploy</a></li>
        <li><a href="#upgrade">Upgrade</a></li>
      </ul>      
    </li>

  </ol>
</details>



## About The Project

Nend Solidity Contracts


### Built With

* Solidity
* Typescript


## Getting Started

Following steps describe how to deploy contracts, upgrade contracts and update the database

### Prerequisites

* NodeJS
  ```sh
  https://nodejs.org/en/download/
  ```

* Yarn
  ```sh
  https://classic.yarnpkg.com/lang/en/docs/install/#windows-stable
  ```

### Build

 Install Modules
   ```sh
   yarn
   ```
   
## Configuration

.env file

| Variable                | Description                                |
| ----------------------- | ------------------------------------------ |
| `POSTGRES_HOST `        | Database IP/Endpoint.                      |
| `POSTGRES_PORT`         | Database Port.                             |
| `POSTGRES_DB`           | Database Name.                             |
| `POSTGRES_USER`         | Database User.                             |
| `POSTGRES_DB`           | Database Password.                         |
|                         |                                            |

Database Names: nend, nend_testnet, nend_turbo

version.ts

| Variable                | Description                                |
| ----------------------- | ------------------------------------------ |
| `mainnet `              | Mainnet: true/false                        |
| `turbo`                 | Turbo: true/false                          |
| `number`                | Version Number:  1 to 9999999999           |
|                         |                                            |

hardhat.config.ts

| Variable                        | Description                                |
| ------------------------------- | ------------------------------------------ |
| `GOERLI_NODE_RPC_URL `          | Goerli, Ethereum Testnet NODE RPC          |
| `BSCTESTNET_NODE_RPC_URL`       | Binance Smart Chain Testnet NODE RPC       |
| `MUMBAI_NODE_RPC_URL`           | Mumbai, Polygon Testnet NODE RPC           |
| `FUJI_NODE_RPC_URL `            | Fuji, Avanlanche Testnet NODE RPC          |
| `ETH_NODE_RPC_URL `             | Ethereum NODE RPC                          |
| `BSC_NODE_RPC_URL `             | Binance Smart Chain NODE RPC               |
| `POLY_NODE_RPC_URL `            | Polygon NODE RPC                           |
| `AVX_NODE_RPC_URL `             | Avalanche NODE RPC                         |
| `TESTNET_WALLET_PRIVATE_KEY `   | Tesnet Wallet Private Key                  |
| `MAIN_WALLET_PRIVATE_KEY `      | Mainnet Wallet Private Key                 |
|                                 |                                            |

## Instructions

### Deployment Configuration

    Start by changing configurations in both .env and version.ts files, change the database name (.env) and mainnet, turbo, number (version.ts) values according to the type of deployment.

    Consult hardhat.config.ts and change the value of TESTNET_WALLET_PRIVATE_KEY or MAIN_WALLET_PRIVATE_KEY to match the wallet that will be paying for the contracts deployment.

    Consult contracts\access\MWOwnable.sol and change the value _transferOwnership to match the desired contract owner, this address should match the value of TESTNET_WALLET_PRIVATE_KEY or MAIN_WALLET_PRIVATE_KEY

    Nend Applications should be stopped prior to any database updates.

    Deploy contracts only once per network.

    At the end of each network deployment, there will be a prompt to update the contract addresses in the database (nendSave.ts), this operation can be canceled by pressing Ctrl+C

   -When deploying in Master network (ex: Goerli / Eth) execute the following nendSave.ts functions.

   ```sh
        deleteData();
        updateSettings();
        deleteCollections();

        insertCollection(chainCode, contracts[`loanAddress`].address, contracts[`trustDeedAddress`].address );
        saveToChain(chainCode, contracts);
        saveToPaymentToken(chainCode, contracts[`nendAddress`].address);
        saveToStakeToken(chainCode, contracts[`nendAddress`].address);
        saveToVpc(chainCode, contracts);
   ```

   -When deploying in Slave networks execute **only** the following nendSave.ts functions.

   ```sh
        insertCollection(chainCode, contracts[`loanAddress`].address, contracts[`trustDeedAddress`].address );
        saveToChain(chainCode, contracts);
        saveToPaymentToken(chainCode, contracts[`nendAddress`].address);
        saveToStakeToken(chainCode, contracts[`nendAddress`].address);
        saveToVpc(chainCode, contracts);
   ```

### Deploy 
   
   all contracts, execute all required functions, clean database and update contract addresses in database by executing the following command per desired network after proper configuration as stated above.

   ```sh
   npx hardhat --network <network> deploy --tags DeployNendContracts
   ```
   Networks Testnet: goerli, bsct, mumbai, fuji

   Networks Mainnet: eth, bsc, polygon, avalanche

### Upgrade

    Consult the file contracts\token\ERC20\NENDV2.sol for an example of how to create a contract upgrade

    Consult the file deploy\contractsDeploy\deployNend_V2.ts for an example of how to create a contract upgrade deployment

    Set a unique tag for the deployment function, ex: func.tags = [ 'NendDeployment_V2' ];

   -Deploy the upgrade with the following command

   ```sh
   npx hardhat --network <network> deploy --tags NendDeployment_V2
   ```