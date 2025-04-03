const { ethers } = require('hardhat');

async function main () {
  const [deployer] = await ethers.getSigners();

  console.log('Deploying exchange contracts with the account:', deployer.address);

  console.log('Account balance:', (await deployer.getBalance()).toString());

  const ccf = await ethers.getContractFactory('ConduitController');

  const ccc = await ccf.deploy();
  await ccc.deployed();

  console.log('ConduitController address:', ccc.address);

  const cf = await ethers.getContractFactory('Consideration');

  const cc = await cf.deploy(ccc.address);
  await cc.deployed();

  console.log('Consideration address:', cc.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
