/* eslint-disable no-unused-vars */
const { ethers } = require('hardhat');

async function main () {
  const balanceNames = ['ifp', 'tc'];
  const lendingPool = '0xba7c874817960EE15Fb4E0288A7984fd14056aFc';
  const swapRouter = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D';
  const nend = '0x0F6a9f5BFf4aF1B84001204649f370E78c043206';
  const usdc = '0xeb8f08a975ab53e34d8a0330e0d34de942c95926';
  const link = '0x01BE23585060835E02B77ef475b0Cc51aA1e0709';
  const dai = '0x5592EC0cfb4dbc12D3aB100b257153436a1f0FEa';
  const native = '0x0000000000000000000000000000000000000000';

  const [deployer] = await ethers.getSigners();

  console.log('Deploying contract with the account:', deployer.address);

  const factory = await ethers.getContractFactory('VaultProxy');
  const vaultFactory = await ethers.getContractFactory('Vault');

  for (const balance of balanceNames) {
    const contract = await factory.deploy(balance, [nend, usdc, link, dai, native], [nend, nend, nend, nend, nend], lendingPool, swapRouter);

    await contract.deployed();

    // const vaultContract = await vaultFactory.attach(lendingPool);
    // const receipt = await withGasLimit(vaultContract, "authorize", [contract.address, "spender", true]);
    // await receipt.wait();

    console.log(`Vault proxy for balance ${balance} at address`, contract.address);
  }
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
