const { ethers } = require('hardhat');

async function main () {
  const [deployer] = await ethers.getSigners();

  console.log('Deploying contracts with the account:', deployer.address);

  console.log('Account balance:', (await deployer.getBalance()).toString());

  const Factory = await ethers.getContractFactory('ERC721Factory');
  const factory = await Factory.deploy();
  await factory.deployed();

  console.log('Factory address:', factory.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
