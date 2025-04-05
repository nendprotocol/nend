/* eslint-disable no-unused-vars */
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction, Deployment } from 'hardhat-deploy/types';
import version from '../version';
import retry from '../retry';
const { ethers } = require('hardhat');
const { promisify } = require('util');

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

  const NendDeployment: DeploymentExt = await deployments.get('NEND');
  const VaultLendingPoolDeployment: DeploymentExt = await deployments.get(
    'VaultLendingPool'
  );

  // Function for reusable CLI prompts
  async function promptUser (question: string) {
    try {
      const rl = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      });

      // Convert callback-based question to promise
      const answer = await promisify(rl.question).bind(rl)(question);
      rl.close();
      return answer;
    } catch (error) {
      console.error('Error during user prompt:', error);
      return 'no'; // Default to safer option on error
    }
  }

  while (true) {
    try {
      const StakingDeployment = await deploy((ChainId === '137' ? 'StakingPool' : 'Staking'), {
        from: deployer,
        contract: 'LendingPoolStakingV2',
        log: true,
        deterministicDeployment: mainnet
          ? ethers.utils.formatBytes32String(`${MainnetSalt}`)
          : turbo
            ? ethers.utils.formatBytes32String(`${TurboSalt}`)
            : ethers.utils.formatBytes32String(`${TestnetSalt}`),
        proxy: {
          proxyContract: 'UUPS'
        }
      });

      // Add after successful deployment
      if (StakingDeployment.newlyDeployed) {
        // If not, execute the migration function
        console.log('Migrating stake data from array to mapping...');
        await execute(
          (ChainId === '137' ? 'StakingPool' : 'Staking'),
          { from: deployer, log: true },
          'migrateStakesToMapping'
        );
        console.log('Stake data migration completed');

        // clear the old stakes array
        console.log('Clearing old stakes array...');
        await execute(
          (ChainId === '137' ? 'StakingPool' : 'Staking'),
          { from: deployer, log: true },
          'clearOldStakesStorage'
        );
        console.log('Old stakes array cleared');
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
func.tags = ['StakingDeployment_V2'];
module.exports.dependencies = ['NendDeployment', 'VaultDeployment'];
