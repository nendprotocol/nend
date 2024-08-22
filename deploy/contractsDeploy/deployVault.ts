import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction, Deployment} from 'hardhat-deploy/types';
const {ethers} = require("hardhat");
import version from '../version';
import retry from '../retry';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const {deployments, getNamedAccounts, getChainId} = hre;
    const {deploy, execute} = deployments;
    const {deployer} = await getNamedAccounts();
    const ChainId = await getChainId();

    const mainnet = version.mainnet;
    const turbo = version.turbo;
    const MainnetSalt = `nend-mainnet-v${version.number}`;
    const TestnetSalt = `nend-testnet-v${version.number}`;
    const TurboSalt = `nend-turbo-v${version.number}`;

    while(true) {
      try {
        // const VaultComissionPoolDeployment = await deploy('VaultComissionPool', {
        //   from: deployer,
        //   contract: 'Vault',
        //   args: ['Commission Pool'],
        //   log: true,
        //   deterministicDeployment: mainnet ? ethers.utils.formatBytes32String(`${MainnetSalt}`) : turbo ? ethers.utils.formatBytes32String(`${TurboSalt}`) : ethers.utils.formatBytes32String(`${TestnetSalt}`)
        // });

        let vaultName = 'Commission Pool';
        let vaultNumber = 1;
        const VaultComissionPoolDeployment = await deploy('VaultComissionPool', {
          from: deployer,
          contract: 'Vault',
          log: true,
          deterministicDeployment: mainnet ? ethers.utils.formatBytes32String(`${MainnetSalt}-Vault${vaultNumber}`) : turbo ? ethers.utils.formatBytes32String(`${TurboSalt}-Vault${vaultNumber}`) : ethers.utils.formatBytes32String(`${TestnetSalt}-Vault${vaultNumber}`),
          proxy: {
            proxyContract: 'UUPS',
            execute: {
              // init: {
                methodName: 'initialize',
                args: [vaultName],
              // },
            },
          },
        });
        break;
      }catch(err) {
        console.log(err);
        console.log('Transaction failed');
        await retry();
      }
    }

    while(true) {
      try {
        // const VaultLendingPoolDeployment = await deploy('VaultLendingPool', {
        //   from: deployer,
        //   contract: 'LendingPool',
        //   args: ["Lending Pool"],
        //   log: true,
        //   deterministicDeployment: mainnet ? ethers.utils.formatBytes32String(`${MainnetSalt}`) : turbo ? ethers.utils.formatBytes32String(`${TurboSalt}`) : ethers.utils.formatBytes32String(`${TestnetSalt}`)
        // });

        let vaultName = 'Lending Pool';
        let vaultNumber = 2;
        const VaultLendingPoolDeployment = await deploy('VaultLendingPool', {
          from: deployer,
          contract: 'LendingPool',
          log: true,
          deterministicDeployment: mainnet ? ethers.utils.formatBytes32String(`${MainnetSalt}-Vault${vaultNumber}`) : turbo ? ethers.utils.formatBytes32String(`${TurboSalt}-Vault${vaultNumber}`) : ethers.utils.formatBytes32String(`${TestnetSalt}-Vault${vaultNumber}`),
          proxy: {
            proxyContract: 'UUPS',
            execute: {
              // init: {
                methodName: 'initialize',
                args: [vaultName],
              // },
            },
          },
        });
        break;
      }catch(err) {
        console.log(err);
        console.log('Transaction failed');
        await retry();
      }
    }

    while(true) {
      try {
        // const VaultCurationRewardPoolDeployment = await deploy('VaultCurationRewardPool', {
        //   from: deployer,
        //   contract: 'Vault',
        //   args: ["Curation Reward Pool"],
        //   log: true,
        //   deterministicDeployment: mainnet ? ethers.utils.formatBytes32String(`${MainnetSalt}`) : turbo ? ethers.utils.formatBytes32String(`${TurboSalt}`) : ethers.utils.formatBytes32String(`${TestnetSalt}`)
        // });

        let vaultName = 'Curation Reward Pool';
        let vaultNumber = 3;
        const VaultCurationRewardPoolDeployment = await deploy('VaultCurationRewardPool', {
          from: deployer,
          contract: 'Vault',
          log: true,
          deterministicDeployment: mainnet ? ethers.utils.formatBytes32String(`${MainnetSalt}-Vault${vaultNumber}`) : turbo ? ethers.utils.formatBytes32String(`${TurboSalt}-Vault${vaultNumber}`) : ethers.utils.formatBytes32String(`${TestnetSalt}-Vault${vaultNumber}`),
          proxy: {
            proxyContract: 'UUPS',
            execute: {
              // init: {
                methodName: 'initialize',
                args: [vaultName],
              // },
            },
          },
        });
        break;
      }catch(err) {
        console.log(err);
        console.log('Transaction failed');
        await retry();
      }
    }

    while(true) {
      try {
        // const VaultInsuranceVaultDeployment = await deploy('VaultInsuranceVault', {
        //   from: deployer,
        //   contract: 'Vault',
        //   args: ["Insurance Vault"],
        //   log: true,
        //   deterministicDeployment: mainnet ? ethers.utils.formatBytes32String(`${MainnetSalt}`) : turbo ? ethers.utils.formatBytes32String(`${TurboSalt}`) : ethers.utils.formatBytes32String(`${TestnetSalt}`)
        // });

        let vaultName = 'Insurance Vault';
        let vaultNumber = 4;
        const VaultInsuranceVaultDeployment = await deploy('VaultInsuranceVault', {
          from: deployer,
          contract: 'Vault',
          log: true,
          deterministicDeployment: mainnet ? ethers.utils.formatBytes32String(`${MainnetSalt}-Vault${vaultNumber}`) : turbo ? ethers.utils.formatBytes32String(`${TurboSalt}-Vault${vaultNumber}`) : ethers.utils.formatBytes32String(`${TestnetSalt}-Vault${vaultNumber}`),
          proxy: {
            proxyContract: 'UUPS',
            execute: {
              // init: {
                methodName: 'initialize',
                args: [vaultName],
              // },
            },
          },
        });
        break;
      }catch(err) {
        console.log(err);
        console.log('Transaction failed');
        await retry();
      }
    }

    while(true) {
      try {
        // const VaultEcosystemFundDeployment = await deploy('VaultEcosystemFund', {
        //   from: deployer,
        //   contract: 'Vault',
        //   args: ["Ecosystem Fund"],
        //   log: true,
        //   deterministicDeployment: mainnet ? ethers.utils.formatBytes32String(`${MainnetSalt}`) : turbo ? ethers.utils.formatBytes32String(`${TurboSalt}`) : ethers.utils.formatBytes32String(`${TestnetSalt}`)
        // });

        let vaultName = 'Ecosystem Fund';
        let vaultNumber = 5;
        const VaultEcosystemFundDeployment = await deploy('VaultEcosystemFund', {
          from: deployer,
          contract: 'Vault',
          log: true,
          deterministicDeployment: mainnet ? ethers.utils.formatBytes32String(`${MainnetSalt}-Vault${vaultNumber}`) : turbo ? ethers.utils.formatBytes32String(`${TurboSalt}-Vault${vaultNumber}`) : ethers.utils.formatBytes32String(`${TestnetSalt}-Vault${vaultNumber}`),
          proxy: {
            proxyContract: 'UUPS',
            execute: {
              // init: {
                methodName: 'initialize',
                args: [vaultName],
              // },
            },
          },
        });
        break;
      }catch(err) {
        console.log(err);
        console.log('Transaction failed');
        await retry();
      }
    }

}

export default func;
func.tags = [ 'VaultDeployment' ];
// module.exports.dependencies = ['example1'];


