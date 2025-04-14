import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import inquirer from 'inquirer';
const { ethers, upgrades } = require('hardhat');

/**
 * This script helps recover UUPS proxies where the owner is set to address(0)
 * or state variables are lost/corrupted after a failed upgrade
 */
const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deployer } = await getNamedAccounts();

  // Helper function for user prompts
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

  async function promptForAddress (question: string): Promise<string> {
    while (true) {
      const address = await promptUser(question);
      if (ethers.utils.isAddress(address)) {
        return address;
      } else {
        console.log('Invalid address format. Please try again.');
      }
    }
  }

  // Recovery options
  const options = [
    '1. Diagnose proxy state (check owner and implementation)',
    '2. Deploy ProxyRescue contract for direct recovery',
    '3. Deploy LendingPoolStakingV2Fixed implementation',
    '4. Upgrade proxy to fixed implementation',
    '5. Exit'
  ];

  let running = true;

  while (running) {
    console.log('\n===== UUPS Proxy Recovery Tool =====\n');
    console.log(options.join('\n'));

    const choice = await promptUser('\nChoose an option (1-5): ');

    switch (choice) {
      case '1': {
        // Diagnose proxy state
        const proxyAddress = await promptForAddress(
          'Enter proxy address to diagnose: '
        );
        console.log(`Diagnosing proxy at ${proxyAddress}...`);

        try {
          // Get the implementation address using the storage slot
          const implSlot =
            '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc';
          const adminSlot =
            '0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103';

          const implementationAddr = await ethers.provider.getStorageAt(
            proxyAddress,
            implSlot
          );
          const adminAddr = await ethers.provider.getStorageAt(
            proxyAddress,
            adminSlot
          );

          console.log(
            `Implementation address: ${ethers.utils.getAddress(
              '0x' + implementationAddr.slice(26)
            )}`
          );
          console.log(
            `Admin address: ${ethers.utils.getAddress(
              '0x' + adminAddr.slice(26)
            )}`
          );

          // Try to call owner() function
          const contract = await ethers.getContractAt(
            'OwnableUpgradeable',
            proxyAddress
          );
          try {
            const owner = await contract.owner();
            console.log(`Owner from contract call: ${owner}`);
            if (owner === ethers.constants.AddressZero) {
              console.log(
                'WARNING: Owner is set to zero address! This proxy needs recovery.'
              );
            }
          } catch (error: any) {
            console.log('Error calling owner() function:', error.message);
          }
        } catch (error) {
          console.error('Error diagnosing proxy:', error);
        }
        break;
      }

      case '2': {
        // Deploy ProxyRescue contract
        console.log('Deploying ProxyRescue contract...');
        try {
          const ProxyRescueFactory = await ethers.getContractFactory(
            'ProxyRescue'
          );
          const proxyRescue = await ProxyRescueFactory.deploy();
          await proxyRescue.deployed();

          console.log(`ProxyRescue deployed at: ${proxyRescue.address}`);

          // Ask if user wants to attempt rescue immediately
          const attemptRescue = await promptUser(
            'Do you want to attempt a rescue now? (yes/no): '
          );
          if (attemptRescue.toLowerCase() === 'yes') {
            const proxyToRescue = await promptForAddress(
              'Enter address of proxy to rescue: '
            );

            console.log(`Attempting to rescue proxy at ${proxyToRescue}...`);
            const tx = await proxyRescue.rescueProxy(proxyToRescue);
            await tx.wait();

            console.log('Rescue attempt complete. Checking result...');
            const admin = await proxyRescue.getProxyAdmin(proxyToRescue);
            console.log(`Current proxy admin: ${admin}`);

            if (admin === proxyRescue.address) {
              console.log(
                'SUCCESS! ProxyRescue is now the admin of the proxy.'
              );

              // Ask if user wants to transfer admin rights to deployer
              const transferAdmin = await promptUser(
                'Transfer admin rights to deployer? (yes/no): '
              );
              if (transferAdmin.toLowerCase() === 'yes') {
                const tx = await proxyRescue.transferProxyAdmin(
                  proxyToRescue,
                  deployer
                );
                await tx.wait();
                console.log(`Admin rights transferred to ${deployer}`);
              }
            } else {
              console.log('Rescue failed. The proxy admin was not changed.');
            }
          }
        } catch (error) {
          console.error('Error deploying or using ProxyRescue:', error);
        }
        break;
      }

      case '3': {
        // Deploy LendingPoolStakingV2Fixed implementation
        console.log('Deploying LendingPoolStakingV2Fixed implementation...');
        try {
          const FixedFactory = await ethers.getContractFactory(
            'LendingPoolStakingV2Fixed'
          );
          const fixedImpl = await FixedFactory.deploy();
          await fixedImpl.deployed();

          console.log(
            `LendingPoolStakingV2Fixed deployed at: ${fixedImpl.address}`
          );

          // Save implementation info
          await deployments.save('LendingPoolStakingV2Fixed_Implementation', {
            abi: (
              await deployments.getArtifact('LendingPoolStakingV2Fixed')
            ).abi,
            address: fixedImpl.address
          });
        } catch (error) {
          console.error('Error deploying fixed implementation:', error);
        }
        break;
      }

      case '4': {
        // Upgrade proxy to fixed implementation
        const proxyAddress = await promptForAddress(
          'Enter proxy address to upgrade: '
        );
        const implAddress = await promptForAddress(
          'Enter fixed implementation address: '
        );

        console.log(
          `Upgrading proxy ${proxyAddress} to implementation ${implAddress}...`
        );

        try {
          // Method 1: Try using hardhat upgrades plugin first
          try {
            console.log('Attempting upgrade using hardhat-upgrades...');
            await upgrades.upgradeProxy(proxyAddress, implAddress);
            console.log('Upgrade succeeded!');
          } catch (upgradeError: any) {
            console.log(
              'Hardhat-upgrades method failed:',
              upgradeError.message
            );

            // Method 2: Fall back to manual upgrade
            console.log('Trying manual upgrade approach...');
            const adminSlot =
              '0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103';
            const adminAddr = await ethers.provider.getStorageAt(
              proxyAddress,
              adminSlot
            );
            const formattedAdmin = ethers.utils.getAddress(
              '0x' + adminAddr.slice(26)
            );

            if (formattedAdmin !== ethers.constants.AddressZero) {
              // If there's a valid admin, use ProxyRescue to perform the upgrade
              const useProxyRescue = await promptUser(
                'Use ProxyRescue to perform the upgrade? (yes/no): '
              );

              if (useProxyRescue.toLowerCase() === 'yes') {
                const rescueAddress = await promptForAddress(
                  'Enter ProxyRescue contract address: '
                );
                const proxyRescue = await ethers.getContractAt(
                  'ProxyRescue',
                  rescueAddress
                );

                console.log('Upgrading using ProxyRescue...');
                const tx = await proxyRescue.upgradeProxy(
                  proxyAddress,
                  implAddress
                );
                await tx.wait();
                console.log('Upgrade complete!');
              }
            } else {
              console.log(
                'Admin is zero address. Direct upgrade not possible.'
              );
              console.log('Try deploying ProxyRescue first (option 2).');
            }
          }

          // After upgrade, we should check if owner is properly set
          const contract = await ethers.getContractAt(
            'OwnableUpgradeable',
            proxyAddress
          );
          try {
            const owner = await contract.owner();
            console.log(`Owner after upgrade: ${owner}`);

            if (owner === ethers.constants.AddressZero) {
              console.log(
                'Owner is still zero address. Attempting recovery...'
              );

              const fixedContract = await ethers.getContractAt(
                'LendingPoolStakingV2Fixed',
                proxyAddress
              );

              // Get addresses for rescueInitialize parameters
              const nendAddress = await promptForAddress(
                'Enter NEND token address: '
              );
              const lendingPoolAddress = await promptForAddress(
                'Enter VaultLendingPool address: '
              );

              console.log('Calling rescueInitialize...');
              const tx = await fixedContract.rescueInitialize(
                deployer,
                nendAddress,
                lendingPoolAddress
              );
              await tx.wait();

              // Check owner again
              const newOwner = await contract.owner();
              console.log(`Owner after recovery: ${newOwner}`);
              if (newOwner === deployer) {
                console.log(
                  'Recovery successful! Owner is now set to deployer.'
                );
              } else {
                console.log('Recovery failed. Owner is not set correctly.');
              }
            }
          } catch (error: any) {
            console.log('Error checking owner after upgrade:', error.message);
          }
        } catch (error) {
          console.error('Error during upgrade process:', error);
        }
        break;
      }

      case '5':
      default:
        console.log('Exiting recovery tool...');
        running = false;
        break;
    }
  }
};

export default func;
func.tags = ['RecoverProxy'];
