/* eslint-disable no-unused-vars */
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction, Deployment } from 'hardhat-deploy/types';
import version from '../version';
import retry from '../retry';
import inquirer from 'inquirer';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, getChainId, ethers } = hre;
  const { deploy, execute, save } = deployments;
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

  const contractName = 'Staking';

  const V1toV2Migration = false; // Set to true if you want to enable V1 to V2 migration

  async function promptUser (question: string): Promise<string> {
    try {
      const answers = await inquirer.prompt([{
        type: 'input', name: 'response', message: question
      }]);
      return answers.response;
    } catch (error) {
      console.error('Error during user prompt:', error);
      return 'no';
    }
  }

  try {
    // Get dependencies
    const NendDeployment = await deployments.get('NEND');
    const VaultLendingPoolDeployment = await deployments.get('VaultLendingPool');

    console.log(`Found NEND at: ${NendDeployment.address}`);
    console.log(`Found VaultLendingPool at: ${VaultLendingPoolDeployment.address}`);

    // Get existing proxy if it exists
    let existingProxy;
    try {
      existingProxy = await deployments.get(contractName);
      console.log(`Found existing proxy at ${existingProxy.address}`);
      const shouldUpgrade = await promptUser('Would you like to migrate stakes to mapping? (yes/no): ');
      if (shouldUpgrade.toLowerCase() !== 'yes') {
        console.log('Upgrade skipped.');
        return;
      }
    } catch (error) {
      console.log(`No existing proxy found for ${contractName}`);
    }

    while (true) {
      try {
        console.log('Starting deployment process...');

        // Single-step upgrade that works reliably with hardhat-deploy
        const StakingDeployment = await deploy(contractName, {
          from: deployer,
          contract: 'LendingPoolStakingV2',
          log: true,
          // Using deterministic deployment for consistency
          deterministicDeployment: mainnet
            ? ethers.utils.formatBytes32String(`${MainnetSalt}`)
            : turbo
              ? ethers.utils.formatBytes32String(`${TurboSalt}`)
              : ethers.utils.formatBytes32String(`${TestnetSalt}`),
          // Simple proxy config - hardhat-deploy will handle upgrades automatically
          proxy: {
            proxyContract: 'UUPS',
            execute: existingProxy
              ? undefined
              : {
                  methodName: 'initialize',
                  args: [NendDeployment.address, VaultLendingPoolDeployment.address]
                }
          }
        });

        // Check if this was an upgrade or initial deployment
        if (StakingDeployment.newlyDeployed) {
          console.log(`${existingProxy ? 'Upgraded' : 'Deployed'} proxy at: ${StakingDeployment.address}`);

          // Get implementation address using ethers
          const implementationAddress = await ethers.provider.getStorageAt(
            StakingDeployment.address,
            '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc'
          );

          const paddedAddress = implementationAddress.replace(/^0x0+/, '0x');
          console.log(`Implementation at: ${paddedAddress}`);

          // ***************** This is for V1 to V2 migration *****************
          // After the upgrade, we need to check if the migration is needed
          // After the migration, we need to check if the old storage should be cleared
          // After all this, we need to remove the migration functions from the contract
          // If this was an upgrade, we need to handle migration
          if (V1toV2Migration && existingProxy) {
            const contract = await ethers.getContractAt('LendingPoolStakingV2', StakingDeployment.address);
            const migrationCompleted = await contract.migrationCompleted();
            console.log(`Migration already performed: ${migrationCompleted}`);

            if (!migrationCompleted) {
              const shouldMigrate = await promptUser('Would you like to migrate stakes to mapping? (yes/no): ');
              if (shouldMigrate.toLowerCase() === 'yes') {
                console.log('Migrating stakes to mapping...');
                await execute(
                  contractName,
                  { from: deployer, log: true },
                  'migrateStakesToMapping'
                );

                // Verify migration was successful
                const migrationCompletedAfter = await contract.migrationCompleted();
                const activeStakesCount = await contract.activeStakesCount();
                console.log(`Migration completed: ${migrationCompletedAfter}`);
                console.log(`Active stakes migrated: ${activeStakesCount}`);

                // Ask about clearing old storage
                const shouldClear = await promptUser(
                  `Migration shows ${activeStakesCount} active stakes. Clear old storage? (yes/no): `
                );

                if (shouldClear.toLowerCase() === 'yes') {
                  console.log('Clearing old stakes storage...');
                  await execute(
                    contractName,
                    { from: deployer, log: true },
                    'clearOldStakesStorage'
                  );
                  console.log('Old stakes storage cleared successfully');
                } else {
                  console.log('Old stakes storage NOT cleared. You can do this later if needed.');
                }
              }
            }
          }
          // ****************** This is for V1 to V2 migration *****************
        } else {
          console.log(`Contract at ${StakingDeployment.address} was already deployed with this bytecode`);
        }

        break; // Exit the retry loop on success
      } catch (err) {
        console.log(err);
        console.log('Transaction failed');

        const shouldRetry = await promptUser('Would you like to retry? (yes/no): ');
        if (shouldRetry.toLowerCase() !== 'yes') {
          console.log('Deployment aborted.');
          return;
        }

        await retry();
      }
    }
  } catch (error) {
    console.error('Deployment failed:', error);
  }
};

export default func;
func.tags = ['StakingDeployment_V2'];
// Ensure dependencies match the actual deployment names
func.dependencies = ['NEND', 'VaultLendingPool'];
