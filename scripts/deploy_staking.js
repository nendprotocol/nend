const { ethers } = require('hardhat');

async function main () {
  // const nend = '0xa839e874add910c9ae940e4078762b8cd01e6b23';
  // const lendingPool = '0x8cf82945e3a079c924496bb5d75109c1ffc1f5ba';
  const usdc = '0x07865c6e87b9f70255377e024ace6630c1eaa37f';
  const dai = '0xdc31Ee1784292379Fbb2964b3B9C4124D8F89C60';

  const [deployer] = await ethers.getSigners();

  console.log('Deploying contract with the account:', deployer.address);

  const factory = await ethers.getContractFactory('LendingPoolStaking');
  // const nendFactory = await ethers.getContractFactory("NEND");
  // const vaultFactory = await ethers.getContractFactory("Vault");

  const contract = await factory.attach('0x2bf00c29a558fd96e934e92517c34cada2d7abda');
  // const nendContract = nendFactory.attach(nend);
  // const vaultContract = vaultFactory.attach(lendingPool);
  // await contract.deployed();

  let receipt;
  // = await withGasLimit(nendContract, "setStaking", [contract.address]);
  // await receipt.wait();
  // receipt = await withGasLimit(nendContract, "reset", []);
  // await receipt.wait();
  // receipt = await withGasLimit(vaultContract, "authorize", [contract.address, "spender", true]);
  // await receipt.wait();
  receipt = await withGasLimit(contract, 'addStakeToken', [usdc]);
  await receipt.wait();
  receipt = await withGasLimit(contract, 'addStakeToken', [dai]);
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
