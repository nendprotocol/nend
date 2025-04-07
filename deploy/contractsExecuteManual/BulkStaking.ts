import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction, Deployment } from 'hardhat-deploy/types';
import { getLendingPoolStake } from '../nendSave';
import retry from '../retry';
import inquirer from 'inquirer';
const { ethers } = require('hardhat');

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, getChainId } = hre;
  const { execute } = deployments;
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

    for (let i = 0; i < batches.length; i++) {
      console.log(`Importing batch ${i + 1}/${batches.length} (${batches[i].length} stakes)...`);
      // console.log(batches[i]);
      const batchStakeIds = stakeIds.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);

      while (true) {
        try {
          const tx = await execute(
            contractName,
            { from: deployer, log: true, gasLimit: 5000000, waitConfirmations: 1 },
            'importStakes',
            batches[i],
            batchStakeIds
          );

          console.log(`Batch ${i + 1} import successful!`);
          break;
        } catch (err) {
          console.error('Transaction failed:', err);
          // const shouldRetry = await promptUser('Retry this batch? (yes/no): ');
          // if (shouldRetry.toLowerCase() !== 'yes') {
          //   console.log('Aborting remaining batches');
          //   return;
          // }
          await new Promise(resolve => setTimeout(resolve, 10000));
        }
      }
      // const shouldContinue = await promptUser('Continue this batch? (yes/no): ');
      // if (shouldContinue.toLowerCase() !== 'yes') {
      //   break; // for testing purposes, remove this line to process all batches
      // }
      // sleep for 3 second to avoid rate limits
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
func.tags = ['BulkImportStakes'];
func.dependencies = []; // Add any dependencies if needed
