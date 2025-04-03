const { ethers } = require('hardhat');

async function main () {
  const [deployer] = await ethers.getSigners();

  console.log('Deploying Bridge contract with the account:', deployer.address);

  console.log('Account balance:', (await deployer.getBalance()).toString());

  const nendFactory = await ethers.getContractFactory('NENDCrowdSale');
  const nend = await nendFactory.attach('0x211dFaa50273072e12C092604dF86F969F82e0D2');

  const bridgeFactory = await ethers.getContractFactory('NENDBridge');

  const bridge = await bridgeFactory.deploy(nend.address, [80001, 4, 7]);

  await bridge.deployed();

  await nend.setBridge(bridge.address);

  console.log('Bridge address:', bridge.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
