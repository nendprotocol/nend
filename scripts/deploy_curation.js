const { ethers } = require('hardhat');

async function main () {
  const nend = '0x0F6a9f5BFf4aF1B84001204649f370E78c043206';
  const curationRewardPool = '0x199a45D7B2CC97D7383423dF37496273e824A4C8';
  const vpc = ['0x0a00285A38B372A1bC0829C0C648eEFB3cf83f34', '0xc9501b1eddf1E79a13bF5b85C2309E989D412934', '0x908AC1Bc84EC9f5c4982a40F45c77416a73b58D5', '0x10D3BC34AF49eDd6a4274816041D5B5AaEbbF3f3'];

  const [deployer] = await ethers.getSigners();

  console.log('Deploying contract with the account:', deployer.address);

  const factory = await ethers.getContractFactory('PeriFiCuration');
  const vaultFactory = await ethers.getContractFactory('Vault');

  const contract = await factory.deploy(curationRewardPool, nend, vpc);
  await contract.deployed();
  const vaultContract = await vaultFactory.attach(curationRewardPool);

  const receipt = await withGasLimit(vaultContract, 'authorize', [contract.address, 'spender', true]);
  await receipt.wait();

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
