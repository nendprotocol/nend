import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction, Deployment } from 'hardhat-deploy/types';
// import retry from '../retry';
import inquirer from 'inquirer';
const { ethers } = require('hardhat');

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, getChainId } = hre;
  // const { execute } = deployments;
  const { deployer } = await getNamedAccounts();
  const ChainId = await getChainId();

  const contractName = ChainId === '137' ? 'StakingPool' : 'Staking';

  interface DeploymentExt extends Deployment {
    newlyDeployed?: boolean;
  }

  async function promptUser (question: string, choices?: string[]): Promise<string> {
    try {
      if (choices) {
        const answers = await inquirer.prompt([{
          type: 'list', name: 'response', message: question, choices
        }]);
        return answers.response;
      } else {
        const answers = await inquirer.prompt([{
          type: 'input', name: 'response', message: question
        }]);
        return answers.response;
      }
    } catch (error) {
      console.error('Error during user prompt:', error);
      return '';
    }
  }

  try {
    const StakingDeployment: DeploymentExt = await deployments.get(contractName);
    console.log(`Found contract at ${StakingDeployment.address}`);

    // Get contract instance to check existing state
    const stakingContract = await ethers.getContractAt('LendingPoolStakingV2', StakingDeployment.address);
    const currentNextStakeId = await stakingContract.nextStakeId();

    console.log(`Current nextStakeId in contract: ${currentNextStakeId}`);

    console.log('Checking migration status...');
    let stakesDeprecated = false;
    try {
      // Check if stakesDeprecated exists in the upgraded contract
      stakesDeprecated = await stakingContract.stakesDeprecated();
      console.log(`Migration already performed: ${stakesDeprecated}`);
    } catch (error) {
      console.log(
        'Contract lacks stakesDeprecated status - needs full migration'
      );
    }

    const shouldStart = await promptUser('Are you ready to start?', ['yes', 'no']);

    if (shouldStart.toLowerCase() !== 'yes') {
      console.log('Migration aborted by user');
      return;
    }

    let currentGasPrice = await ethers.provider.getGasPrice();
    let gasPriceGwei = parseFloat(ethers.utils.formatUnits(currentGasPrice, 'gwei'));
    console.log(`Starting with gas price: ${gasPriceGwei.toFixed(2)} gwei`);

    // Execute in batches if there are many stakes
    let batchSize = 50; // Adjust based on gas limits
    let nextStakeId = 1;

    // Try to get an estimate from contract data
    try {
      // This is a placeholder - you may need a different approach to estimate the stake count
      nextStakeId = currentNextStakeId.toNumber();
      console.log(
        `Estimated stakes to migrate: ${nextStakeId}`
      );
    } catch (countError) {
      console.log(
        'Could not estimate stake count - using default of 1'
      );
    }

    if (nextStakeId <= 1) {
      console.log('No stakes to migrate');
      return;
    }

    // Calculate number of batches needed
    const batches = Math.ceil(nextStakeId / batchSize);

    // Replace the existing transaction handling code with this improved version
    for (let i = 0; i < 1; i++) {
      batchSize = 50; // Reset batch size for each iteration
      const startId = 1 + i * batchSize;

      // if (startId === 551) {
      //   batchSize = 15; // Adjust batch size for this range
      // } else if (startId >= 601 && startId < 1201) {
      //   continue; // Skip the range from 551 to 801
      // } else if (startId >= 1201 && startId < 1251) {
      //   startId = 1206;
      //   batchSize = 51; // Adjust batch size for this range
      // } else if (startId >= 1251 && startId < 2000) {
      //   continue; // Skip the range from 1251 to 2000
      // } else if (startId >= 2001 && startId < 2051) {
      //   startId = 2049;
      //   batchSize = 2; // Adjust batch size for this range
      // } else if (startId >= 2051 && startId < 2101) {
      //   continue; // Exit the loop if startId exceeds 2051
      // } else if (startId >= 2101) {
      //   startId = 2102;
      //   batchSize = 1; // Adjust batch size for this range
      // } else if (startId > 2102) {
      //   break;
      // }
      console.log(
        `Migrating batch ${
          i + 1
        }/${batches}, starting at ID ${startId}`
      );

      // Get a direct contract instance for low-level transaction control
      const signer = await ethers.getSigner(deployer);

      // Start with current gas price
      currentGasPrice = await ethers.provider.getGasPrice();
      gasPriceGwei = parseFloat(ethers.utils.formatUnits(currentGasPrice, 'gwei'));
      console.log(`Starting with gas price: ${gasPriceGwei.toFixed(2)} gwei`);

      let nonce = await signer.getTransactionCount();
      let txHash = null;
      let startTime = Date.now();

      while (true) {
        try {
          if (!txHash) {
            // Initial transaction submission
            console.log(`Submitting transaction with gas price: ${gasPriceGwei.toFixed(2)} gwei`);

            // Create a promise for the contract call
            const txPromise = stakingContract.connect(signer).migrateStakesInBatch(
              startId,
              batchSize,
              {
                gasLimit: 14000000,
                gasPrice: currentGasPrice,
                nonce // Use same nonce for replacement
              }
            );

            // Setup a timeout promise
            const timeoutPromise = new Promise((resolve, reject) => {
              setTimeout(() => reject(new Error('Transaction submission timed out after 45 seconds')), 45000);
            });

            try {
              startTime = Date.now();
              // Race between the transaction and the timeout
              const tx = await Promise.race([txPromise, timeoutPromise]);
              txHash = tx.hash;
              console.log(`Transaction submitted with hash: ${txHash}`);
            } catch (timeoutErr: any) {
              console.error(timeoutErr.message);

              // Ask user if they want to retry with higher gas
              const retry = await promptUser('Transaction submission timed out. Retry with higher gas price?', ['yes', 'no']);
              if (retry.toLowerCase() === 'yes') {
                // Increase gas price by 20% if estimation is failing
                currentGasPrice = currentGasPrice.mul(120).div(100);
                gasPriceGwei = parseFloat(ethers.utils.formatUnits(currentGasPrice, 'gwei'));
                console.log(`Increased gas price to ${gasPriceGwei.toFixed(2)} gwei for next attempt`);
                continue; // Go back to the start of the loop
              } else {
                console.log('Aborting this batch');
                break; // Exit the retry loop
              }
            }
          }

          // Check for receipt (non-blocking way)
          const receipt = await ethers.provider.getTransactionReceipt(txHash);
          if (receipt) {
            if (receipt.status === 1) {
              console.log(`Batch ${i + 1} import successful!`);
              break; // Success, exit retry loop
            } else {
              throw new Error('Transaction failed on-chain');
            }
          }

          // Check transaction status
          const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);

          // No receipt yet, wait a bit before checking again
          console.log(`Waiting for confirmation... (${elapsedSeconds}s elapsed)`);
          await new Promise(resolve => setTimeout(resolve, 10000));
        } catch (err: any) {
          console.error('Transaction error:', err);

          // If it's a nonce error (tx already mined), we might need to adjust
          if (err.toString().includes('nonce') || err.toString().includes('already mined')) {
            nonce = await signer.getTransactionCount();
            console.log(`Updated nonce to ${nonce}`);
          }

          // Ask to retry with higher gas or abort
          const shouldRetry = await promptUser('Retry with higher gas price?', ['yes', 'no']);
          if (shouldRetry.toLowerCase() === 'yes') {
            // Increase gas by 25%
            currentGasPrice = currentGasPrice.mul(125).div(100);
            gasPriceGwei = parseFloat(ethers.utils.formatUnits(currentGasPrice, 'gwei'));
            console.log(`Increased gas price to ${gasPriceGwei.toFixed(2)} gwei`);
            txHash = null; // Reset to trigger new submission
          } else {
            console.log('Aborting batch');
            break;
          }
        }
      }

      // Wait between batches
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    // Verify final state
    const newNextStakeId = await stakingContract.nextStakeId();

    console.log('migration complete successfully!');
    console.log(`New nextStakeId: ${newNextStakeId} (increased by ${newNextStakeId - currentNextStakeId})`);
  } catch (error) {
    console.error('Execution failed:', error);
  }
};

export default func;
func.tags = ['AsyncStakingMigrationS2S3'];
func.dependencies = []; // Add any dependencies if needed
