const { ethers } = require('hardhat');

async function main () {
  const name = 'Curation Reward Pool';

  const [deployer] = await ethers.getSigners();

  console.log('Deploying contract with the account:', deployer.address);

  const factory = await ethers.getContractFactory('Vault');

  const contract = await factory.deploy(name);

  await contract.deployed();

  console.log('Contract address', contract.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
