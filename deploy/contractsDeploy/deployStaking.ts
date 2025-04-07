import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction, Deployment } from 'hardhat-deploy/types';
import version from '../version';
import retry from '../retry';
import inquirer from 'inquirer';
const { ethers, upgrades } = require('hardhat');

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  // const ChainId = await getChainId();

  interface DeploymentExt extends Deployment {
      newlyDeployed?: boolean;
  }

  // Replace your promptUser function with this:
  async function promptUser (question: string): Promise<string> {
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
      return 'no'; // Default to safer option on error
    }
  }

  const mainnet = version.mainnet;
  const turbo = version.turbo;
  const MainnetSalt = `nend-mainnet-v${version.number}`;
  const TestnetSalt = `nend-testnet-v${version.number}`;
  const TurboSalt = `nend-turbo-v${version.number}`;

  const contractName = 'Staking';

  try {
    const NendDeployment : DeploymentExt = await deployments.get('NEND');
    const VaultLendingPoolDeployment : DeploymentExt = await deployments.get('VaultLendingPool');
    const StakingDeployment : DeploymentExt | null = await deployments.getOrNull(contractName);

    console.log(`Found NEND at: ${NendDeployment.address}`);
    console.log(`Found VaultLendingPool at: ${VaultLendingPoolDeployment.address}`);
    console.log(`Found Staking at: ${StakingDeployment ? StakingDeployment.address : 'not deployed'}`);

    let cleanDeployConfirmed;
    if (StakingDeployment) {
      cleanDeployConfirmed = await promptUser(
        'Would you like to delete old deployment record? (yes/no): '
      );

      if ((cleanDeployConfirmed as string).toLowerCase() === 'yes') {
        // Delete the old deployment record if it exists (this is key)
        try {
          await deployments.delete(contractName);
          console.log(`Deleted old deployment record for ${contractName}`);
        } catch (e) {
          console.log(`No existing deployment found for ${contractName} to delete`);
        }

        // Deploy completely fresh implementation and proxy
        console.log('Deploying new implementation and proxy from scratch...');
      }
    }

    while (true) {
      try {
        if (cleanDeployConfirmed && (cleanDeployConfirmed as string).toLowerCase() === 'yes') {
          // STEP 1: Deploy implementation contract separately
          console.log('Deploying implementation contract...');
          const implDeployment = await deploy(`${contractName}_Implementation`, {
            from: deployer,
            contract: 'LendingPoolStakingV2',
            log: true,
            deterministicDeployment: mainnet
              ? ethers.utils.formatBytes32String(`${MainnetSalt}-impl`)
              : turbo
                ? ethers.utils.formatBytes32String(`${TurboSalt}-impl`)
                : ethers.utils.formatBytes32String(`${TestnetSalt}-impl`)
          });
          console.log(`Implementation deployed at: ${implDeployment.address}`);

          // STEP 2: Prompt for verification confirmation
          console.log('Deploying proxy using upgrades plugin...');
          const StakingFactory = await ethers.getContractFactory('LendingPoolStakingV2');
          const proxy = await upgrades.deployProxy(StakingFactory, [
            NendDeployment.address,
            VaultLendingPoolDeployment.address
          ], {
            kind: 'uups',
            unsafeAllow: ['constructor'] // Add this if your contract has a constructor
          });

          await proxy.deployed();
          console.log(`Proxy deployed at: ${proxy.address}`);

          // STEP 3: Get implementation address
          const implementationAddress = await upgrades.erc1967.getImplementationAddress(
            proxy.address
          );
          console.log(`Implementation at: ${implementationAddress}`);

          // STEP 4: Save deployment info
          const deployment = {
            address: proxy.address,
            abi: (await deployments.getArtifact('LendingPoolStakingV2')).abi,
            implementation: implementationAddress,
            executions: [
              {
                methodName: 'initialize',
                args: [NendDeployment.address, VaultLendingPoolDeployment.address]
              }
            ]
          };

          await deployments.save(contractName, deployment);
          console.log(`Successfully saved ${contractName} deployment info`);
        } else {
          // Use standard deploy
          const StakingDeployment = await deploy(contractName, {
            from: deployer,
            contract: 'LendingPoolStakingV2',
            log: true,
            deterministicDeployment: mainnet
              ? ethers.utils.formatBytes32String(`${MainnetSalt}`)
              : turbo
                ? ethers.utils.formatBytes32String(`${TurboSalt}`)
                : ethers.utils.formatBytes32String(`${TestnetSalt}`),
            proxy: {
              proxyContract: 'UUPS',
              execute: {
                methodName: 'initialize',
                args: [NendDeployment.address, VaultLendingPoolDeployment.address]
              }
            }
          });

          console.log(`Successfully deployed ${contractName} proxy at: ${StakingDeployment.address}`);
        }

        break;
      } catch (err) {
        console.log(err);
        console.log('Transaction failed');
        await retry();
      }
    }
  } catch (error) {
    console.error('Deployment failed:', error);
  }
};

export default func;
func.tags = ['StakingDeployment'];
module.exports.dependencies = ['NendDeployment', 'VaultDeployment'];
