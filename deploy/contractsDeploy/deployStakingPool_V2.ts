/* eslint-disable no-unused-vars */
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction, Deployment } from 'hardhat-deploy/types';
import version from '../version';
import retry from '../retry';
const { ethers } = require('hardhat');

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, getChainId } = hre;
  const { deploy, execute } = deployments;
  const { deployer } = await getNamedAccounts();
  const ChainId = await getChainId();

    interface DeploymentExt extends Deployment {
        newlyDeployed?: boolean;
    }

    const mainnet = version.mainnet;
    const turbo = version.turbo;
    const MainnetSalt = `nend-mainnet-v${version.number}`;
    const TestnetSalt = `nend-testnet-v${version.number}`;
    const TurboSalt = `nend-turbo-v${version.number}`;

    const NendDeployment : DeploymentExt = await deployments.get('NEND');
    const VaultLendingPoolDeployment : DeploymentExt = await deployments.get('VaultLendingPool');

    while (true) {
      try {
        // const StakingDeployment = await deploy('Staking', {
        //   from: deployer,
        //   contract: 'LendingPoolStaking',
        //   args: [NendDeployment.address, VaultLendingPoolDeployment.address],
        //   log: true,
        //   deterministicDeployment: mainnet ? ethers.utils.formatBytes32String(`${MainnetSalt}`) : turbo ? ethers.utils.formatBytes32String(`${TurboSalt}`) : ethers.utils.formatBytes32String(`${TestnetSalt}`)
        // });

        const StakingDeployment = await deploy('StakingPool', {
          from: deployer,
          contract: 'LendingPoolStakingV2',
          log: true,
          deterministicDeployment: mainnet ? ethers.utils.formatBytes32String(`${MainnetSalt}`) : turbo ? ethers.utils.formatBytes32String(`${TurboSalt}`) : ethers.utils.formatBytes32String(`${TestnetSalt}`),
          proxy: {
            proxyContract: 'UUPS'
          }
        });

        // Add after successful deployment
        if (StakingDeployment.newlyDeployed) {
          console.log('Migrating stake data from array to mapping...');
          await execute(
            'StakingPool',
            { from: deployer, log: true },
            'migrateStakesToMapping'
          );
          console.log('Stake data migration completed');
        }
        break;
      } catch (err) {
        console.log(err);
        console.log('Transaction failed');
        await retry();
      }
    }
};

export default func;
func.tags = ['StakingPoolDeployment_V2'];
module.exports.dependencies = ['NendDeployment', 'VaultDeployment'];
