const { ethers } = require('hardhat');

async function main () {
  const name = 'Tag And Tagger';
  const symbol = 'TNT';

  const [deployer] = await ethers.getSigners();

  console.log('Deploying contract with the account:', deployer.address);

  const factory = await ethers.getContractFactory('PeriFiNFT');

  const contract = await factory.deploy(name, symbol);

  await contract.deployed();

  console.log('Contract address', contract.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
