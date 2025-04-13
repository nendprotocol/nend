import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction, Deployment } from 'hardhat-deploy/types';
import inquirer from 'inquirer';
import { BigNumber } from 'ethers/lib';
const { ethers } = require('hardhat');

// This script only runs on testnet environments
const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, getChainId } = hre;
  const { execute } = deployments;
  const { deployer } = await getNamedAccounts();
  const ChainId = await getChainId();

  // Ensure we're on testnet
  const isTestnet = ['97', '80001', '31337', '5'].includes(ChainId);
  if (!isTestnet) {
    console.error('⛔ This script is only for testnet environments');
    return;
  }

  // Determine contract name based on network
  const contractName = 'Staking';

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
    // Load contract
    const StakingDeployment: DeploymentExt = await deployments.get(contractName);
    console.log(`Found staking contract at ${StakingDeployment.address}`);

    // Get contract instance
    const stakingContract = await ethers.getContractAt('LendingPoolStakingV2', StakingDeployment.address);
    const nendAddress = await stakingContract.nend();
    const nendContract = await ethers.getContractAt('IERC20', nendAddress);

    console.log(`NEND token address: ${nendAddress}`);

    // Get available staking tokens
    const stakeTokenCount = await stakingContract.stakeTokenCount();
    console.log(`Available staking tokens: ${stakeTokenCount}`);

    const availableTokens = [];
    for (let i = 0; i < stakeTokenCount; i++) {
      const tokenAddress = await stakingContract.stakeTokens(i);
      let symbol = tokenAddress === '0x0000000000000000000000000000000000000000' ? 'NATIVE' : 'UNKNOWN';

      if (tokenAddress !== '0x0000000000000000000000000000000000000000') {
        try {
          const tokenContract = await ethers.getContractAt('IERC20', tokenAddress);
          symbol = await tokenContract.symbol();
        } catch (err) {
          // Fallback to address if symbol isn't available
          symbol = `${tokenAddress.substring(0, 6)}...${tokenAddress.substring(38)}`;
        }
      }

      availableTokens.push({
        address: tokenAddress,
        symbol
      });
      console.log(`  ${i + 1}. ${symbol} (${tokenAddress})`);
    }

    // Main menu
    while (true) {
      const action = await promptUser('What would you like to do?', [
        'Deposit/Stake',
        'Unstake',
        'Claim Rewards',
        'View My Stakes',
        'Check Claimable Rewards',
        'Exit'
      ]);

      if (action === 'Exit') {
        break;
      }

      // Get the signer
      const [signer] = await ethers.getSigners();
      const userAddress = await signer.getAddress();
      console.log(`Acting as: ${userAddress}`);

      if (action === 'Deposit/Stake') {
        // Select token
        const tokenIndex = await promptUser('Select token to stake:',
          availableTokens.map((t, i) => `${i + 1}. ${t.symbol} (${t.address})`));
        const selectedTokenIndex = parseInt(tokenIndex.split('.')[0]) - 1;
        const selectedToken = availableTokens[selectedTokenIndex];

        // Select duration
        const durations = ['1 week', '4 weeks', '12 weeks'];
        const durationChoice = await promptUser('Select staking duration:', durations);
        const durationIndex = durations.indexOf(durationChoice);

        // Enter amount
        const amount = await promptUser(`Enter amount of ${selectedToken.symbol} to stake:`);
        const amountWei = ethers.utils.parseEther(amount);

        // Confirm
        const confirmation = await promptUser(
          `Confirm staking ${amount} ${selectedToken.symbol} for ${durations[durationIndex]}?`,
          ['yes', 'no']
        );

        if (confirmation.toLowerCase() === 'yes') {
          try {
            // If selected token is not native token, approve first
            if (selectedToken.address !== '0x0000000000000000000000000000000000000000') {
              console.log(`Approving ${amount} ${selectedToken.symbol} for staking...`);
              const tokenContract = await ethers.getContractAt('IERC20', selectedToken.address);
              const approveTx = await tokenContract.approve(StakingDeployment.address, amountWei);
              await approveTx.wait();
            }

            // Execute stake
            const options = selectedToken.address === '0x0000000000000000000000000000000000000000'
              ? {
                  value: amountWei,
                  gasLimit: 500000, // Explicit gas limit
                  gasPrice: await ethers.provider.getGasPrice() // Current network gas price
                }
              : {};

            console.log(`Staking ${amount} ${selectedToken.symbol}...`);
            const tx = await stakingContract.deposit(
              selectedToken.address,
              amountWei,
              durationIndex,
              options
            );
            await tx.wait();
            console.log(`Staking successful! Transaction: ${tx.hash}`);
          } catch (err) {
            console.error('Staking failed:', err);
          }
        }
      } else if (action === 'Unstake') {
        // Get user's stake count
        const userStakeCount = await stakingContract.userStakesCount(userAddress);

        if (userStakeCount.eq(0)) {
          console.log('You have no stakes to unstake.');
          continue;
        }

        console.log(`You have ${userStakeCount} stakes.`);

        // List user's stakes
        const userStakes = [];
        for (let i = 1; i <= userStakeCount; i++) {
          try {
            const stake = await stakingContract.userStakesById(userAddress, i);
            const stakeId = await stakingContract.getUserStakeId(userAddress, i);

            let tokenSymbol = stake.token === '0x0000000000000000000000000000000000000000' ? 'NATIVE' : 'UNKNOWN';
            if (stake.token !== '0x0000000000000000000000000000000000000000') {
              try {
                const tokenContract = await ethers.getContractAt('IERC20', stake.token);
                tokenSymbol = await tokenContract.symbol();
              } catch (err) {
                tokenSymbol = `${stake.token.substring(0, 6)}...${stake.token.substring(38)}`;
              }
            }

            const totalAmount = stake.amountsPerDuration.reduce(
              (sum : BigNumber, amount: BigNumber) => sum.add(amount),
              BigNumber.from(0)
            );

            // Only show stakes that can be unstaked (end time <= now)
            const now = Math.floor(Date.now() / 1000);
            const canUnstake = stake.end <= now && stake.stakeStatus === 1; // 1 = STAKED

            if (canUnstake) {
              console.log(`  Stake ${stakeId}: ${ethers.utils.formatEther(totalAmount)} ${tokenSymbol}`);
              console.log(`    End time: ${new Date(stake.end * 1000).toLocaleString()}`);
              userStakes.push({
                id: stakeId,
                token: tokenSymbol,
                amount: totalAmount
              });
            }
          } catch (err) {
            console.error(`Error fetching stake ${i}:`, err);
          }
        }

        if (userStakes.length === 0) {
          console.log('You have no stakes available for unstaking yet.');
          continue;
        }

        // Select stake to unstake
        const stakeChoice = await promptUser('Select stake ID to unstake:',
          userStakes.map(s => `Stake ${s.id}: ${ethers.utils.formatEther(s.amount)} ${s.token}`));
        const selectedStakeId = stakeChoice.split(':')[0].replace('Stake ', '').trim();

        // Confirm
        const confirmation = await promptUser(`Confirm unstaking stake #${selectedStakeId}?`, ['yes', 'no']);

        if (confirmation.toLowerCase() === 'yes') {
          try {
            console.log(`Unstaking stake #${selectedStakeId}...`);
            const tx = await stakingContract.unstake(selectedStakeId);
            await tx.wait();
            console.log(`Unstaking successful! Transaction: ${tx.hash}`);
          } catch (err) {
            console.error('Unstaking failed:', err);
          }
        }
      } else if (action === 'Claim Rewards') {
        // Select token for claiming rewards
        const tokenIndex = await promptUser('Select token to claim rewards for:',
          availableTokens.map((t, i) => `${i + 1}. ${t.symbol} (${t.address})`));
        const selectedTokenIndex = parseInt(tokenIndex.split('.')[0]) - 1;
        const selectedToken = availableTokens[selectedTokenIndex];

        // Check claimable rewards first
        try {
          const [inflationReward, ifpReward] = await stakingContract.getClaimableRewards(
            userAddress,
            selectedToken.address
          );

          console.log(`Claimable rewards for ${selectedToken.symbol}:`);
          console.log(`  Inflation reward: ${ethers.utils.formatEther(inflationReward)} NEND`);
          console.log(`  IFP reward: ${ethers.utils.formatEther(ifpReward)} ${selectedToken.symbol}`);

          if (inflationReward.eq(0) && ifpReward.eq(0)) {
            console.log('No rewards available to claim.');
            continue;
          }

          // Confirm claim
          const confirmation = await promptUser(`Confirm claiming rewards for ${selectedToken.symbol}?`, ['yes', 'no']);

          if (confirmation.toLowerCase() === 'yes') {
            console.log(`Claiming rewards for ${selectedToken.symbol}...`);
            const tx = await stakingContract.claim(selectedToken.address);
            await tx.wait();
            console.log(`Claim successful! Transaction: ${tx.hash}`);
          }
        } catch (err) {
          console.error('Failed to claim rewards:', err);
        }
      } else if (action === 'View My Stakes') {
        // Get user's stake count
        const userStakeCount = await stakingContract.userStakesCount(userAddress);

        if (userStakeCount.eq(0)) {
          console.log('You have no stakes.');
          continue;
        }

        console.log(`You have ${userStakeCount} stakes:`);

        // List user's stakes
        for (let i = 1; i <= userStakeCount; i++) {
          try {
            const stake = await stakingContract.userStakesById(userAddress, i);
            const stakeId = await stakingContract.getUserStakeId(userAddress, i);

            let tokenSymbol = stake.token === '0x0000000000000000000000000000000000000000' ? 'NATIVE' : 'UNKNOWN';
            if (stake.token !== '0x0000000000000000000000000000000000000000') {
              try {
                const tokenContract = await ethers.getContractAt('IERC20', stake.token);
                tokenSymbol = await tokenContract.symbol();
              } catch (err) {
                tokenSymbol = `${stake.token.substring(0, 6)}...${stake.token.substring(38)}`;
              }
            }

            const totalAmount = stake.amountsPerDuration.reduce(
              (sum, amount) => sum.add(amount),
              ethers.BigNumber.from(0)
            );

            console.log(`  Stake ${stakeId}: ${ethers.utils.formatEther(totalAmount)} ${tokenSymbol}`);
            console.log(`    Start: ${new Date(stake.start * 1000).toLocaleString()}`);
            console.log(`    End: ${new Date(stake.end * 1000).toLocaleString()}`);
            console.log(`    Status: ${['DEFAULT', 'STAKED', 'FULFILLED'][stake.stakeStatus]}`);
            console.log(`    Is Escrow: ${stake.isEscrow}`);
            if (stake.isEscrow) {
              console.log(`    Escrow Status: ${['DEFAULT', 'ISSUED', 'CLAIMED'][stake.escrowStatus]}`);
              console.log(`    Reward Allocated: ${ethers.utils.formatEther(stake.rewardAllocated)} ${tokenSymbol}`);
            }
            console.log('');
          } catch (err) {
            console.error(`Error fetching stake ${i}:`, err);
          }
        }
      } else if (action === 'Check Claimable Rewards') {
        // Check claimable rewards for all tokens
        console.log('Checking claimable rewards for all tokens:');

        for (const token of availableTokens) {
          try {
            const [inflationReward, ifpReward] = await stakingContract.getClaimableRewards(
              userAddress,
              token.address
            );

            if (!inflationReward.eq(0) || !ifpReward.eq(0)) {
              console.log(`  ${token.symbol}:`);
              console.log(`    Inflation reward: ${ethers.utils.formatEther(inflationReward)} NEND`);
              console.log(`    IFP reward: ${ethers.utils.formatEther(ifpReward)} ${token.symbol}`);
            }
          } catch (err) {
            console.error(`Error checking rewards for ${token.symbol}:`, err);
          }
        }
      }
    }
  } catch (error) {
    console.error('Execution failed:', error);
  }
};

export default func;
func.tags = ['TestnetStaking'];
func.dependencies = []; // Add dependencies if needed
