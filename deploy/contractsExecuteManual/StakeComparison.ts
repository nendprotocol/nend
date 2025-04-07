import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction, Deployment } from 'hardhat-deploy/types';
import { getLendingPoolStake } from '../nendSave';
import inquirer from 'inquirer';
import fs from 'fs';
import path from 'path';
const { ethers } = require('hardhat');

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getChainId } = hre;
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

    // Get contract instance
    const stakingContract = await ethers.getContractAt('LendingPoolStakingV2', StakingDeployment.address);

    // Get total stakes in contract
    const nextStakeId = await stakingContract.nextStakeId();
    console.log(`Contract has ${nextStakeId - 1} stakes (nextStakeId: ${nextStakeId})`);

    // Get stakes from DB
    console.log('Fetching stakes from database...');
    const dbStakes = await getLendingPoolStake(ChainId);

    if (!dbStakes || !Array.isArray(dbStakes) || dbStakes.length === 0) {
      console.log('No stakes found in database');
      return;
    }

    console.log(`Retrieved ${dbStakes.length} stakes from database`);

    // Create a map for faster lookups
    const dbStakesMap = new Map();
    dbStakes.forEach(stake => {
      dbStakesMap.set(Number(stake.stakeId), stake);
    });

    // Analyze how many stakes to check
    const totalStakes = Number(nextStakeId) - 1;
    const batchSize = 100; // Larger batch size for initial scan
    const batches = Math.ceil(totalStakes / batchSize);

    console.log(`Will compare ${totalStakes} stakes in ${batches} batches of ${batchSize}`);
    const shouldProceed = await promptUser('Proceed with comparison? (yes/no): ');

    if (shouldProceed.toLowerCase() !== 'yes') {
      console.log('Comparison aborted by user');
      return;
    }

    // Compare stakes
    console.log('Comparing stakes...');
    const missingInDb = [];
    const missingInContract = [];
    const mismatchedData = [];

    // First, collect all valid stake IDs from the contract
    console.log('Collecting valid stake IDs from contract...');
    const validContractStakeIds = [];
    const scanBatches = Math.ceil(totalStakes / batchSize);

    for (let batch = 0; batch < scanBatches; batch++) {
      const startIdx = batch * batchSize + 1;
      const endIdx = Math.min((batch + 1) * batchSize, totalStakes);

      console.log(`Scanning for valid IDs ${startIdx}-${endIdx}...`);

      // Use multicall pattern to efficiently check many stakes at once
      const calls = [];
      for (let i = startIdx; i <= endIdx; i++) {
        calls.push(stakingContract.stakes(i));
      }

      // Execute all calls in parallel with integrated filtering
      const validIdsFromBatch = (await Promise.all(calls.map(async (call, idx) => {
        try {
          const result = await call;
          // Only return the ID if it's a valid stake
          if (result && result.staker !== ethers.constants.AddressZero) {
            return startIdx + idx;
          }
          return null; // Return null for invalid stakes
        } catch (err) {
          console.error(`Error fetching stake ID ${startIdx + idx}:`, err);
          return null;
        }
      }))).filter(id => id !== null); // Filter out null values

      // Add all valid IDs from this batch
      validContractStakeIds.push(...validIdsFromBatch);

      // Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`Found ${validContractStakeIds.length} valid stakes in contract`);

    // Now process the valid IDs in smaller batches for detailed comparison
    const comparisonBatchSize = 20;
    const comparisonBatches = Math.ceil(validContractStakeIds.length / comparisonBatchSize);

    for (let batch = 0; batch < comparisonBatches; batch++) {
      const batchIds = validContractStakeIds.slice(
        batch * comparisonBatchSize,
        (batch + 1) * comparisonBatchSize
      );

      console.log(`Comparing batch ${batch + 1}/${comparisonBatches} (${batchIds.length} stakes)...`);

      for (const stakeId of batchIds) {
        try {
          // Get stake from contract
          const contractStake = await stakingContract.stakes(stakeId);

          // Check if the stake exists in DB
          if (!dbStakesMap.has(stakeId)) {
            missingInDb.push(stakeId);
            continue;
          }

          const dbStake = dbStakesMap.get(stakeId);

          // Compare stake details
          const discrepancies = compareStakes(dbStake, contractStake, stakeId);
          if (discrepancies.length > 0) {
            mismatchedData.push({ stakeId, discrepancies, dbStake, contractStake });
          }

          // Remove from map to track what's not in contract
          dbStakesMap.delete(stakeId);
        } catch (err) {
          console.error(`Error comparing stake ID ${stakeId}:`, err);
        }
      }

      // Progress update
      const processedCount = (batch + 1) * comparisonBatchSize;
      console.log(`Progress: ${Math.min(processedCount, validContractStakeIds.length)}/${validContractStakeIds.length} stakes compared`);
    }

    // Any remaining in the map are missing from contract
    for (const [stakeId] of Array.from(dbStakesMap.entries())) {
      missingInContract.push(stakeId);
    }

    // Report results
    console.log('\n===== Comparison Results =====');
    console.log(`Total stakes in contract: ${totalStakes}`);
    console.log(`Total stakes in database: ${dbStakes.length}`);
    console.log(`Missing in database: ${missingInDb.length}`);
    console.log(`Missing in contract: ${missingInContract.length}`);
    console.log(`Data mismatches: ${mismatchedData.length}`);

    if (missingInDb.length > 0) {
      console.log('\nStakes missing in database:');
      console.log(missingInDb.slice(0, 10).join(', ') + (missingInDb.length > 10 ? '...' : ''));
    }

    if (missingInContract.length > 0) {
      console.log('\nStakes missing in contract:');
      console.log(missingInContract.slice(0, 10).join(', ') + (missingInContract.length > 10 ? '...' : ''));
    }

    if (mismatchedData.length > 0) {
      console.log('\nStakes with data mismatches:');
      mismatchedData.slice(0, 5).forEach(item => {
        console.log(`Stake ID ${item.stakeId}:`);
        item.discrepancies.forEach(d => console.log(`  - ${d}`));
      });
      if (mismatchedData.length > 5) {
        console.log(`  ... and ${mismatchedData.length - 5} more`);
      }
    }

    // Write detailed report to file
    await writeReport({
      contractStakes: totalStakes,
      dbStakes: dbStakes.length,
      missingInDb,
      missingInContract,
      mismatchedData
    });

    console.log('\nDetailed report written to stake-comparison-report.json');
  } catch (error) {
    console.error('Execution failed:', error);
  }
};

function compareStakes (dbStake: any, contractStake: any, stakeId: number) {
  const discrepancies = [];

  // Compare owner/staker address
  if (dbStake.staker?.toLowerCase() !== contractStake.staker?.toLowerCase()) {
    discrepancies.push(`Staker address mismatch: DB=${dbStake.staker}, Contract=${contractStake.staker}`);
  }

  // Compare token address
  if (dbStake.token?.toLowerCase() !== contractStake.token?.toLowerCase()) {
    discrepancies.push(`Token address mismatch: DB=${dbStake.token}, Contract=${contractStake.token}`);
  }

  // Compare timestamps
  const dbStart = dbStake.start instanceof Date ? Math.floor(dbStake.start.getTime() / 1000) : Number(dbStake.start);
  if (dbStart !== Number(contractStake.start)) {
    discrepancies.push(`Start time mismatch: DB=${dbStart}, Contract=${contractStake.start}`);
  }

  const dbEnd = dbStake.end instanceof Date ? Math.floor(dbStake.end.getTime() / 1000) : Number(dbStake.end);
  if (dbEnd !== Number(contractStake.end)) {
    discrepancies.push(`End time mismatch: DB=${dbEnd}, Contract=${contractStake.end}`);
  }

  // Compare other properties
  if (Boolean(dbStake.isEscrow) !== Boolean(contractStake.isEscrow)) {
    discrepancies.push(`isEscrow mismatch: DB=${dbStake.isEscrow}, Contract=${contractStake.isEscrow}`);
  }

  if (Number(dbStake.escrowStatus) !== Number(contractStake.escrowStatus)) {
    discrepancies.push(`escrowStatus mismatch: DB=${dbStake.escrowStatus}, Contract=${contractStake.escrowStatus}`);
  }

  if (Number(dbStake.stakeStatus) !== Number(contractStake.stakeStatus)) {
    discrepancies.push(`stakeStatus mismatch: DB=${dbStake.stakeStatus}, Contract=${contractStake.stakeStatus}`);
  }

  // Check amounts - this is tricky because the DB format may differ from contract
  try {
    let dbAmounts;
    if (Array.isArray(dbStake.amountsPerDuration)) {
      dbAmounts = dbStake.amountsPerDuration;
    } else if (typeof dbStake.amountsPerDuration === 'string') {
      dbAmounts = JSON.parse(dbStake.amountsPerDuration);
    } else {
      dbAmounts = [0, 0, 0];
    }

    for (let i = 0; i < 3; i++) {
      const dbAmount = ethers.BigNumber.from(dbAmounts[i] || '0');
      const contractAmount = contractStake.amountsPerDuration[i];
      if (!dbAmount.eq(contractAmount)) {
        discrepancies.push(`amountsPerDuration[${i}] mismatch: DB=${dbAmount.toString()}, Contract=${contractAmount.toString()}`);
      }
    }
  } catch (e: any) {
    discrepancies.push(`Error comparing amountsPerDuration: ${e.message}`);
  }

  return discrepancies;
}

async function writeReport (data: any) {
  const reportData = {
    timestamp: new Date().toISOString(),
    summary: {
      contractStakes: data.contractStakes,
      dbStakes: data.dbStakes,
      missingInDb: data.missingInDb.length,
      missingInContract: data.missingInContract.length,
      mismatchedData: data.mismatchedData.length
    },
    details: {
      missingInDb: data.missingInDb,
      missingInContract: data.missingInContract,
      mismatchedData: data.mismatchedData.map((item: any) => ({
        stakeId: item.stakeId,
        discrepancies: item.discrepancies,
        dbStake: formatStake(item.dbStake),
        contractStake: formatStake(item.contractStake, true)
      }))
    }
  };

  fs.writeFileSync(
    path.join(process.cwd(), 'stake-comparison-report.json'),
    JSON.stringify(reportData, null, 2)
  );
}

function formatStake (stake: any, isContract = false) {
  if (!stake) return null;

  const formatted: any = { ...stake };

  // Handle dates
  if (formatted.start instanceof Date) {
    formatted.start = Math.floor(formatted.start.getTime() / 1000);
  }
  if (formatted.end instanceof Date) {
    formatted.end = Math.floor(formatted.end.getTime() / 1000);
  }

  // Handle BigNumbers
  if (isContract) {
    if (formatted.amountsPerDuration) {
      formatted.amountsPerDuration = formatted.amountsPerDuration.map((amount: any) =>
        amount.toString()
      );
    }
    if (formatted.rewardAllocated) {
      formatted.rewardAllocated = formatted.rewardAllocated.toString();
    }
  }

  return formatted;
}

export default func;
func.tags = ['CompareStakes'];
func.dependencies = [];
