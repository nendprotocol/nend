import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction, Deployment } from 'hardhat-deploy/types';
import { getLendingPoolStake } from '../nendSave';
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
    const StakingDeployment: DeploymentExt = await deployments.get(contractName);
    console.log(`Found contract at ${StakingDeployment.address}`);

    // Get contract instance to check existing state
    const stakingContract = await ethers.getContractAt('LendingPoolStakingV2', StakingDeployment.address);
    const currentNextStakeId = await stakingContract.nextStakeId();

    console.log(`Current nextStakeId in contract: ${currentNextStakeId}`);

    // Get bulk stakes from db
    console.log('Fetching stakes from database...');
    const rawStakes = await getLendingPoolStake(ChainId);

    if (!rawStakes || !Array.isArray(rawStakes) || rawStakes.length === 0) {
      console.log('No stakes found to import');
      return;
    }

    console.log(`Retrieved ${rawStakes.length} stakes from database`);

    // Extract original stake IDs from database
    const stakeIds:number[] = [];
    // Transform stakes to match contract's expected format
    const formattedStakes = rawStakes.map((stake, index) => {
      stakeIds.push(stake.stakeId);
      // Convert Date objects to timestamps (seconds since epoch)
      const startTimestamp = stake.start instanceof Date
        ? Math.floor(stake.start.getTime() / 1000)
        : typeof stake.start === 'string'
          ? Math.floor(new Date(stake.start).getTime() / 1000)
          : Number(stake.start) || 0;

      const endTimestamp = stake.end instanceof Date
        ? Math.floor(stake.end.getTime() / 1000)
        : typeof stake.end === 'string'
          ? Math.floor(new Date(stake.end).getTime() / 1000)
          : Number(stake.end) || 0;

      // Parse amountsPerDuration array safely
      const amountsArray = Array.isArray(stake.amountsPerDuration)
        ? [
            ethers.BigNumber.from(stake.amountsPerDuration[0] || 0),
            ethers.BigNumber.from(stake.amountsPerDuration[1] || 0),
            ethers.BigNumber.from(stake.amountsPerDuration[2] || 0)
          ]
        : typeof stake.amountsPerDuration === 'string'
          ? JSON.parse(stake.amountsPerDuration).map((amt: string) => ethers.BigNumber.from(amt || 0))
          : [ethers.BigNumber.from(0), ethers.BigNumber.from(0), ethers.BigNumber.from(0)];

      return {
        staker: stake.staker || ethers.constants.AddressZero,
        token: stake.token || ethers.constants.AddressZero,
        start: startTimestamp,
        end: endTimestamp,
        amountsPerDuration: amountsArray,
        rewardAllocated: ethers.BigNumber.from(stake.rewardAllocated || 0),
        isEscrow: !!stake.isEscrow,
        escrowStatus: stake.escrowStatus || 0,
        stakeStatus: stake.stakeStatus || 0
      };
    });

    if (formattedStakes.length !== stakeIds.length) {
      console.log('formattedStakes[0]', formattedStakes[0]);
      console.log('stakeIds[0]', stakeIds[0]);
      console.log(`Mismatch in stakes count: ${formattedStakes.length} vs ${stakeIds.length}`);
    }

    console.log('stakeIds', stakeIds);

    let currentGasPrice = await ethers.provider.getGasPrice();
    let gasPriceGwei = parseFloat(ethers.utils.formatUnits(currentGasPrice, 'gwei'));
    console.log(`Starting with gas price: ${gasPriceGwei.toFixed(2)} gwei`);

    // Confirm before proceeding
    console.log(`Ready to import ${formattedStakes.length} stakes`);
    const shouldProceed = await promptUser('Proceed with import? (yes/no): ');

    if (shouldProceed.toLowerCase() !== 'yes') {
      console.log('Import aborted by user');
      return;
    }

    // Execute in batches if there are many stakes
    const BATCH_SIZE = 10; // Adjust based on gas limits
    const batches = [];

    for (let i = 0; i < formattedStakes.length; i += BATCH_SIZE) {
      batches.push(formattedStakes.slice(i, i + BATCH_SIZE));
    }

    console.log(`Split import into ${batches.length} batches`);

    // Replace the existing transaction handling code with this improved version
    for (let i = 0; i < batches.length; i++) {
      console.log(`Importing batch ${i + 1}/${batches.length} (${batches[i].length} stakes)...`);
      const batchStakeIds = stakeIds.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);

      // Get a direct contract instance for low-level transaction control
      const stakingContract = await ethers.getContractAt('LendingPoolStakingV2', StakingDeployment.address);
      const signer = await ethers.getSigner(deployer);

      // Start with current gas price
      currentGasPrice = await ethers.provider.getGasPrice();
      gasPriceGwei = parseFloat(ethers.utils.formatUnits(currentGasPrice, 'gwei'));
      console.log(`Starting with gas price: ${gasPriceGwei.toFixed(2)} gwei`);

      let nonce = await signer.getTransactionCount();
      let txHash = null;
      let replacementAttempts = 0;
      let startTime = Date.now();

      while (true) {
        try {
          if (!txHash) {
            // Initial transaction submission
            console.log(`Submitting transaction with gas price: ${gasPriceGwei.toFixed(2)} gwei`);

            // Create a promise for the contract call
            const txPromise = stakingContract.connect(signer).importStakes(
              batches[i],
              batchStakeIds,
              {
                gasLimit: 5000000,
                gasPrice: currentGasPrice,
                nonce // Use same nonce for replacement
              }
            );

            // Setup a timeout promise
            const timeoutPromise = new Promise((resolve, reject) => {
              setTimeout(() => reject(new Error('Transaction submission timed out after 45 seconds')), 45000);
            });

            try {
              // Race between the transaction and the timeout
              const tx = await Promise.race([txPromise, timeoutPromise]);
              txHash = tx.hash;
              console.log(`Transaction submitted with hash: ${txHash}`);
              startTime = Date.now();
            } catch (timeoutErr: any) {
              console.error(timeoutErr.message);

              // Ask user if they want to retry with higher gas
              const retry = await promptUser('Transaction submission timed out. Retry with higher gas price? (yes/no): ');
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

          // Check transaction status
          const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);

          if (elapsedSeconds >= 60 && replacementAttempts < 3) {
            // Transaction pending for too long, ask to speed up
            console.log(`Transaction pending for ${elapsedSeconds} seconds...`);
            const shouldSpeedUp = await promptUser('Speed up transaction with higher gas price? (yes/no): ');

            if (shouldSpeedUp.toLowerCase() === 'yes') {
              // Increase by 25% each time
              const newGasPrice = currentGasPrice.mul(125).div(100);
              const newGasPriceGwei = parseFloat(ethers.utils.formatUnits(newGasPrice, 'gwei'));

              console.log(`Replacing transaction with higher gas price: ${newGasPriceGwei.toFixed(2)} gwei`);

              // Submit replacement transaction with same nonce but higher gas price
              const replacementTx = await stakingContract.connect(signer).importStakes(
                batches[i],
                batchStakeIds,
                {
                  gasLimit: 5000000,
                  gasPrice: newGasPrice,
                  nonce
                }
              );

              txHash = replacementTx.hash;
              currentGasPrice = newGasPrice;
              gasPriceGwei = newGasPriceGwei;
              replacementAttempts++;
              startTime = Date.now(); // Reset timer after replacement

              console.log(`Replacement transaction submitted with hash: ${txHash}`);
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
          const shouldRetry = await promptUser('Retry with higher gas price? (yes/no): ');
          if (shouldRetry.toLowerCase() === 'yes') {
            // Increase gas by 30%
            currentGasPrice = currentGasPrice.mul(130).div(100);
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
    const activeStakesCount = await stakingContract.activeStakesCount();

    console.log('All stakes imported successfully!');
    console.log(`New nextStakeId: ${newNextStakeId} (increased by ${newNextStakeId - currentNextStakeId})`);
    console.log(`Total active stakes count: ${activeStakesCount}`);
  } catch (error) {
    console.error('Execution failed:', error);
  }
};

export default func;
func.tags = ['AsyncBulkImportStakes'];
func.dependencies = []; // Add any dependencies if needed
