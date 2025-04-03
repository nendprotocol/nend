const { ethers } = require('hardhat');

async function main () {
  const nend = '0x0F6a9f5BFf4aF1B84001204649f370E78c043206';
  const insuranceVault = '0x8f6DaBBb3b8665D3DC4a315d24201236884dABcC';
  const treasuryVault = '0x3CD072c0c229239De2F87CcC7187509a9e25956f';

  const [deployer] = await ethers.getSigners();

  console.log('Deploying contract with the account:', deployer.address);

  const factory = await ethers.getContractFactory('BondDepository');
  const nendFactory = await ethers.getContractFactory('NEND');

  const contract = await factory.deploy(nend, insuranceVault, treasuryVault);
  const nendContract = nendFactory.attach(nend);

  const receipt = await withGasLimit(nendContract, 'authorize', [contract.address, 'minter', true]);
  await receipt.wait();

  await contract.deployed();

  console.log('Contract address', contract.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

async function withGasLimit (contract, fn, parameters = [], gasMargin = 0.1) {
  const estimatedGas = await contract.estimateGas[fn](...parameters);
  const marginalizedGas = estimatedGas.toNumber() + Math.floor(estimatedGas * gasMargin);
  return await contract[fn](...parameters, { gasLimit: marginalizedGas });
}
