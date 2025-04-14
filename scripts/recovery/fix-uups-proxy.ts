// UUPS Proxy Recovery Script
// This script helps diagnose and fix issues with UUPS proxy contracts where
// the owner is 0x0 or state variables are lost after a failed upgrade

import { ethers } from 'hardhat';
import { utils, constants } from 'ethers';
import fs from 'fs';
import path from 'path';

// ERC1967 storage slots
const IMPLEMENTATION_SLOT =
  '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc';
const ADMIN_SLOT =
  '0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103';

interface ProxyInfo {
  address: string;
  implementationAddress: string;
  adminAddress: string;
  ownerAddress?: string;
}

async function main () {
  console.log('=============================================');
  console.log('UUPS PROXY RECOVERY TOOL');
  console.log('=============================================');

  // Get command line arguments
  const args = process.argv.slice(2);
  const proxyAddress = args[0];

  if (!proxyAddress || !utils.isAddress(proxyAddress)) {
    console.error('Please provide a valid proxy address as the first argument');
    console.log(
      'Usage: npx hardhat run scripts/recovery/fix-uups-proxy.ts --network <network> <proxyAddress>'
    );
    return;
  }

  const operation = args[1] || 'diagnose'; // Default to diagnose if no operation specified

  // Connect to the proxy
  const proxy = await ethers.getContractAt(
    'LendingPoolStakingV2',
    proxyAddress
  );

  // Diagnose the current state of the proxy
  console.log(`\n📊 Diagnosing proxy at ${proxyAddress}...`);
  const proxyInfo = await diagnoseProxy(proxyAddress);

  console.log('\n📝 Current Proxy State:');
  console.log(`- Implementation: ${proxyInfo.implementationAddress}`);
  console.log(`- Admin: ${proxyInfo.adminAddress}`);

  // Try to get the owner if possible
  try {
    const owner = await proxy.owner();
    proxyInfo.ownerAddress = owner;
    console.log(`- Owner: ${owner}`);
  } catch (error) {
    console.log('- Owner: Could not retrieve (likely broken contract state)');
  }

  // Check if admin is zero address (indicating a potentially bricked proxy)
  const isAdminZero =
    proxyInfo.adminAddress === ethers.utils.getAddress(constants.AddressZero);
  if (isAdminZero) {
    console.log('\n⚠️ WARNING: Admin is zero address. Proxy may be bricked.');
  }

  // Save the diagnosis to a file
  const timestamp = Math.floor(Date.now() / 1000);
  const diagnosisPath = path.join(
    __dirname,
    `../../proxy-diagnosis-${timestamp}.json`
  );
  fs.writeFileSync(diagnosisPath, JSON.stringify(proxyInfo, null, 2));
  console.log(`\n💾 Diagnosis saved to ${diagnosisPath}`);

  // If just diagnosing, exit here
  if (operation === 'diagnose') {
    console.log(
      '\n✅ Diagnosis complete. Use this information to plan your recovery strategy.'
    );
    console.log(
      '\nTo fix the contract, run again with one of these operations:'
    );
    console.log('  - deploy-rescue: Deploy a rescue contract');
    console.log(
      '  - fix-with-new-impl: Deploy a fixed implementation and upgrade'
    );
    console.log('  - recover-state: Deploy a state recovery implementation');
    return;
  }

  // Execute the requested operation
  switch (operation) {
    case 'deploy-rescue':
      await deployRescueContract(proxyAddress);
      break;

    case 'fix-with-new-impl':
      if (args[2] && utils.isAddress(args[2])) {
        await fixWithNewImplementation(proxyAddress, args[2]);
      } else {
        console.error(
          'Please provide a valid owner address for the new implementation'
        );
        console.log(
          'Usage: npx hardhat run scripts/recovery/fix-uups-proxy.ts --network <network> <proxyAddress> fix-with-new-impl <newOwnerAddress>'
        );
      }
      break;

    case 'recover-state':
      if (args[2] && utils.isAddress(args[2])) {
        await recoverState(proxyAddress, args[2]);
      } else {
        console.error('Please provide a valid owner address to recover state');
        console.log(
          'Usage: npx hardhat run scripts/recovery/fix-uups-proxy.ts --network <network> <proxyAddress> recover-state <newOwnerAddress>'
        );
      }
      break;

    default:
      console.error('Unknown operation:', operation);
      console.log(
        'Available operations: diagnose, deploy-rescue, fix-with-new-impl, recover-state'
      );
  }
}

async function diagnoseProxy (proxyAddress: string): Promise<ProxyInfo> {
  const provider = ethers.provider;

  // Get the implementation address from the ERC1967 implementation slot
  const implementationStorageValue = await provider.getStorageAt(
    proxyAddress,
    IMPLEMENTATION_SLOT
  );
  const implementationAddress = ethers.utils.getAddress(
    '0x' + implementationStorageValue.slice(-40)
  );

  // Get the admin address from the ERC1967 admin slot
  const adminStorageValue = await provider.getStorageAt(
    proxyAddress,
    ADMIN_SLOT
  );
  const adminAddress = ethers.utils.getAddress(
    '0x' + adminStorageValue.slice(-40)
  );

  return {
    address: proxyAddress,
    implementationAddress,
    adminAddress
  };
}

async function deployRescueContract (proxyAddress: string) {
  console.log('\n🚀 Deploying ProxyRescue contract...');

  const ProxyRescueFactory = await ethers.getContractFactory('ProxyRescue');
  const rescueContract = await ProxyRescueFactory.deploy();
  await rescueContract.deployed();

  console.log(`✅ ProxyRescue deployed at: ${rescueContract.address}`);
  console.log('\nNext steps:');
  console.log(`1. Call rescueProxy(${proxyAddress}) to attempt recovery`);
  console.log('2. Deploy a fixed implementation contract');
  console.log(
    `3. Call upgradeProxy(${proxyAddress}, <fixedImplementationAddress>) to upgrade to the fixed implementation`
  );
  console.log(
    '4. Call your initialization function on the proxy to restore state'
  );
}

async function fixWithNewImplementation (
  proxyAddress: string,
  newOwnerAddress: string
) {
  console.log('\n🚀 Deploying fixed implementation contract...');

  // Deploy the fixed implementation contract
  const FixedImplementationFactory = await ethers.getContractFactory(
    'LendingPoolStakingV2Fixed'
  );
  const fixedImplementation = await FixedImplementationFactory.deploy();
  await fixedImplementation.deployed();

  console.log(
    `✅ Fixed implementation deployed at: ${fixedImplementation.address}`
  );

  // Now we need to use the ProxyRescue contract to upgrade the proxy
  console.log(
    '\n⚙️ You need to connect the deployed ProxyRescue contract to upgrade the proxy.'
  );
  console.log(
    `Call upgradeProxy(${proxyAddress}, ${fixedImplementation.address}) on your ProxyRescue contract.`
  );

  console.log(
    '\nAfter upgrading, call rescueInitialize() on the proxy to restore state with the new owner:'
  );
  console.log(
    `Call rescueInitialize(${newOwnerAddress}) on the proxy at ${proxyAddress}`
  );
}

async function recoverState (proxyAddress: string, newOwnerAddress: string) {
  console.log('\n⚙️ Preparing to recover contract state...');

  // First we need a diagnostic readout of the current state variables
  // This helps users understand what storage slots contain what data
  console.log('\n📊 Reading raw storage slots...');

  const provider = ethers.provider;
  const storageValues: { [slot: string]: string } = {};

  // Read first 10 storage slots (adjust as needed)
  for (let i = 0; i < 10; i++) {
    const slotValue = await provider.getStorageAt(proxyAddress, i);
    storageValues[i.toString()] = slotValue;
    console.log(`Slot ${i}: ${slotValue}`);
  }

  console.log(
    '\n⚠️ State recovery requires a specialized implementation contract.'
  );
  console.log(
    'Create a contract that extends your current implementation but adds a rescue function:'
  );

  console.log(`\n
// Example of a recovery implementation:
contract LendingPoolStakingV2Fixed is LendingPoolStakingV2 {
    function rescueInitialize(address _newOwner) external {
        // Set the owner directly in the OwnableUpgradeable storage slot
        // This requires knowledge of the storage layout
        assembly {
            // Owner is typically in slot 0 for OwnableUpgradeable
            sstore(0, _newOwner)
        }

        // Initialize any other important state variables
        // _nendToken = IERC20(...);
        // _lendingPool = IVaultLendingPool(...);
    }
}`);

  console.log('\nFollow these steps:');
  console.log('1. Create the recovery contract shown above');
  console.log(
    "2. Deploy it with 'npx hardhat run scripts/deploy-recovery-impl.ts'"
  );
  console.log(
    '3. Use the ProxyRescue contract to upgrade the proxy to this new implementation'
  );
  console.log(`4. Call rescueInitialize(${newOwnerAddress}) on the proxy`);
}

// We need to deploy a ProxyRescue contract first
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
