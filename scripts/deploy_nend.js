const { ethers } = require('hardhat');

async function main () {
  const [deployer] = await ethers.getSigners();

  const chains = [80001, 4, 97, 43113];
  const inflationAmounts = ['44717.8662', '54655.1698', '64592.4734', '59623.8216'];
  const idx = 0;

  console.log('Deploying NEND contracts with the account:', deployer.address);

  console.log('Account balance:', (await deployer.getBalance()).toString());

  const nendFactory = await ethers.getContractFactory('NEND');

  const nend = await nendFactory.deploy(chains[idx] === 4, chains, ethers.utils.parseEther(inflationAmounts[idx]));

  await nend.deployed();

  console.log('NEND address:', nend.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
