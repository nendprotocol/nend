/* eslint-disable no-unused-vars */
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction, Deployment } from 'hardhat-deploy/types';
import version from '../version';
import retry from '../retry';
import inquirer from 'inquirer';
import { start } from 'repl';

//* * This script is for migrating V2 storage to V3 storage */
const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, getChainId, ethers } = hre;
  const { deploy, execute, save, get } = deployments;
  const { deployer } = await getNamedAccounts();
  const ChainId = await getChainId();

  // Add network information for debugging
  console.log(`Deploying to chain ID: ${ChainId}`);
  console.log(`Deployer address: ${deployer}`);

  interface DeploymentExt extends Deployment {
    newlyDeployed?: boolean;
  }

  const mainnet = version.mainnet;
  const turbo = version.turbo;
  const MainnetSalt = `nend-mainnet-v${version.number}`;
  const TestnetSalt = `nend-testnet-v${version.number}`;
  const TurboSalt = `nend-turbo-v${version.number}`;

  const contractName = ChainId === '137' ? 'StakingPool' : 'Staking';
  const libraryName = 'StakingLib';

  // Skip user prompts in non-interactive mode (useful for CI/CD)
  const skipPrompts = process.env.SKIP_PROMPTS === 'true';

  async function promptUser (question: string): Promise<string> {
    if (skipPrompts) {
      console.log(`[Auto-answering]: ${question} -> yes`);
      return 'yes'; // Auto-yes in non-interactive mode
    }

    try {
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'response',
          message: question
        }
      ]);
      return answers.response;
    } catch (error) {
      console.error('Error during user prompt:', error);
      return 'no';
    }
  }

  try {
    // Get dependencies
    const NendDeployment = await deployments.get('NEND');
    const VaultLendingPoolDeployment = await deployments.get(
      'VaultLendingPool'
    );

    console.log(`Found NEND at: ${NendDeployment.address}`);
    console.log(
      `Found VaultLendingPool at: ${VaultLendingPoolDeployment.address}`
    );

    // First, deploy the StakingLib library
    console.log('Deploying StakingLib library...');
    const StakingLibDeployment = await deploy(libraryName, {
      from: deployer,
      contract: libraryName,
      log: true,
      deterministicDeployment: mainnet
        ? ethers.utils.formatBytes32String(`${MainnetSalt}-lib`)
        : turbo
          ? ethers.utils.formatBytes32String(`${TurboSalt}-lib`)
          : ethers.utils.formatBytes32String(`${TestnetSalt}-lib`)
    });

    console.log(`StakingLib deployed at: ${StakingLibDeployment.address}`);

    while (true) {
      // Verify the library was deployed correctly
      const libraryCode = await ethers.provider.getCode(
        StakingLibDeployment.address
      );
      if (libraryCode === '0x' || libraryCode === '') {
        const shouldRecheck = await promptUser(
          'Verifying StakingLib deployment failed. Would you like to retry to get "StakingLib" address? (yes/no): '
        );
        if (shouldRecheck.toLowerCase() !== 'yes') {
          console.log('Faild to StakingLib address.');
          return;
        }
        continue;
      }
      break;
    }

    // Get existing proxy if it exists
    let existingProxy;
    try {
      existingProxy = await deployments.get(contractName);
      console.log(`Found existing proxy at ${existingProxy.address}`);
      const shouldUpgrade = await promptUser(
        'Would you like to upgrade "Staking" contract? (yes/no): '
      );
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

        // Deploy the implementation with library linkage
        const StakingDeployment = await deploy(contractName, {
          from: deployer,
          contract: 'LendingPoolStakingV2',
          log: true,
          libraries: {
            StakingLib: StakingLibDeployment.address
          },
          // Using deterministic deployment for consistency
          deterministicDeployment: mainnet
            ? ethers.utils.formatBytes32String(`${MainnetSalt}`)
            : turbo
              ? ethers.utils.formatBytes32String(`${TurboSalt}`)
              : ethers.utils.formatBytes32String(`${TestnetSalt}`),
          // Specify the proxy contract as UUPSProxy to ensure compatibility
          proxy: {
            owner: deployer,
            proxyContract: 'UUPS', // IMPORTANT: Must stay UUPSProxy for compatibility
            execute: existingProxy
              ? undefined
              : {
                  methodName: 'initialize',
                  args: [
                    NendDeployment.address,
                    VaultLendingPoolDeployment.address
                  ]
                }
          }
        });

        // Check if this was an upgrade or initial deployment
        if (StakingDeployment.newlyDeployed) {
          console.log(
            `${existingProxy ? 'Upgraded' : 'Deployed'} proxy at: ${
              StakingDeployment.address
            }`
          );

          // Get implementation address using ethers
          const implementationAddress = await ethers.provider.getStorageAt(
            StakingDeployment.address,
            '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc'
          );

          const paddedAddress = implementationAddress.replace(/^0x0+/, '0x');
          console.log(`Implementation at: ${paddedAddress}`);

          // Verify the implementation has code
          while (true) {
            const implCode = await ethers.provider.getCode(paddedAddress);
            if (implCode === '0x' || implCode === '') {
              const shouldRecheck = await promptUser(
                'Verifiying Implementation deployment failed. Would you like to retry? (yes/no): '
              );
              if (shouldRecheck.toLowerCase() !== 'yes') {
                console.log('Faild to verifiy Implementation.');
                return;
              }
              continue;
            }

            break;
          }

          // If this was an upgrade, we need to handle migration
          if (existingProxy) {
            const contract = await ethers.getContractAt(
              'LendingPoolStakingV2',
              StakingDeployment.address
            );

            console.log('Checking migration status...');
            let stakesDeprecated = false;
            try {
              // Check if stakesDeprecated exists in the upgraded contract
              stakesDeprecated = await contract.stakesDeprecated();
              console.log(`Migration already performed: ${stakesDeprecated}`);
            } catch (error) {
              console.log(
                'Contract lacks stakesDeprecated status - needs full migration'
              );
            }

            if (!stakesDeprecated) {
              const shouldMigrate = await promptUser(
                'Would you like to migrate stakes to mapping? (yes/no): '
              );
              if (shouldMigrate.toLowerCase() === 'yes') {
                console.log('Migrating stakes to mapping in batches...');

                // Get the total number of stakes or set a default if not available
                let nextStakeId = 1;
                try {
                  nextStakeId = (await contract.nextStakeId()).toNumber();
                  console.log(`Total stakes to migrate: ${nextStakeId - 1}`);
                } catch (error) {
                  console.log('Error getting nextStakeId - using default');
                  // Try to get an estimate from contract data
                  try {
                    // This is a placeholder - you may need a different approach to estimate the stake count
                    const activeStakesCount =
                      await contract.activeStakesCount();
                    nextStakeId = activeStakesCount.toNumber() + 1;
                    console.log(
                      `Estimated stakes to migrate: ${nextStakeId - 1}`
                    );
                  } catch (countError) {
                    console.log(
                      'Could not estimate stake count - using default of 1'
                    );
                  }
                }

                if (nextStakeId > 1) {
                  // Define batch size (adjust based on gas limits and stake count)
                  let batchSize = 50;

                  // Calculate number of batches needed
                  const batches = Math.ceil((nextStakeId - 1) / batchSize);

                  for (let i = 0; i < batches; i++) {
                    let startId = 1 + i * batchSize;
                    if (startId === 551) {
                      batchSize = 15; // Adjust batch size for this range
                    } else if (startId >= 601 && startId < 1201) {
                      continue; // Skip the range from 551 to 801
                    } else if (startId >= 1201 && startId < 1601) {
                      startId = 1206;
                      batchSize = 51; // Adjust batch size for this range
                    } else if (startId >= 2001) {
                      startId = 2049;
                      batchSize = 2; // Adjust batch size for this range
                    } else if (startId >= 2051) {
                      break; // Exit the loop if startId exceeds 2051
                    }
                    console.log(
                      `Migrating batch ${
                        i + 1
                      }/${batches}, starting at ID ${startId}`
                    );

                    try {
                      await execute(
                        contractName,
                        { from: deployer, log: true },
                        'migrateStakesInBatch',
                        startId,
                        batchSize
                      );

                      // Check if migration is complete
                      try {
                        const stakesDeprecatedAfter =
                          await contract.stakesDeprecated();
                        if (stakesDeprecatedAfter) {
                          console.log('Migration completed successfully');
                          break;
                        }
                      } catch (checkError) {
                        console.log('Could not check stakesDeprecated status');
                      }
                    } catch (batchError: any) {
                      console.log(
                        `Error migrating batch: ${batchError.message}`
                      );
                      console.log('Continuing to next batch...');
                    }
                  }
                } else {
                  console.log('No stakes to migrate');
                }

                // Verify migration was successful
                let finalStatus = false;
                try {
                  finalStatus = await contract.stakesDeprecated();
                  console.log(`Migration fully completed: ${finalStatus}`);
                } catch (statusError) {
                  console.log('Could not verify final migration status');
                }

                if (!finalStatus) {
                  const shouldMarkComplete = await promptUser(
                    'Migration batches completed. Mark stakes as deprecated? (yes/no): '
                  );

                  if (shouldMarkComplete.toLowerCase() === 'yes') {
                    try {
                      await execute(
                        contractName,
                        { from: deployer, log: true },
                        'setStakesDeprecated',
                        true
                      );
                      console.log('Stakes manually marked as deprecated');
                    } catch (markError: any) {
                      console.log(
                        `Error marking stakes as deprecated: ${markError.message}`
                      );
                    }
                  }
                }
              }
            }
          }

          // Set up or verify roles if needed
          if (!existingProxy) {
            console.log('Setting up initial roles for the contract...');
            try {
              const rolesToSetup = ['admin', 'spender']; // Add any other roles required
              for (const role of rolesToSetup) {
                console.log(`Authorizing deployer for role: ${role}`);
                await execute(
                  contractName,
                  { from: deployer, log: true },
                  'authorize',
                  deployer,
                  role,
                  true
                );
              }
            } catch (roleError: any) {
              console.log(`Error setting up roles: ${roleError.message}`);
            }
          }
        } else {
          console.log(
            `Contract at ${StakingDeployment.address} was already deployed with this bytecode`
          );
        }

        console.log('Deployment completed successfully!');
        break; // Exit the retry loop on success
      } catch (err: any) {
        console.error('Transaction failed with error:', err.message);

        // Add more detailed error debugging
        if (err.data) {
          console.error('Error data:', err.data);
        }
        if (err.receipt) {
          console.error('Transaction receipt:', err.receipt);
        }

        const shouldRetry = await promptUser(
          'Would you like to retry? (yes/no): '
        );
        if (shouldRetry.toLowerCase() !== 'yes') {
          console.log('Deployment aborted.');
          return;
        }

        // await retry();
      }
    }
  } catch (error: any) {
    console.error('Deployment failed with error:', error.message);
    // More detailed error information
    if (error.stack) {
      console.error('Error stack:', error.stack);
    }
  }
};

export default func;
func.tags = ['StakingDeployment_V2_1'];
// Ensure dependencies match the actual deployment names
func.dependencies = ['NEND', 'VaultLendingPool'];
