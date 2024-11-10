const { ethers } = require('hardhat');

async function main () {
  const nend = '0x0F6a9f5BFf4aF1B84001204649f370E78c043206';
  const curationRewardPool = '0x199a45D7B2CC97D7383423dF37496273e824A4C8';
  const prices = [5, 10, 20, 40];

  const [deployer] = await ethers.getSigners();

  console.log('Deploying contract with the account:', deployer.address);

  const scenarioOnefactory = await ethers.getContractFactory('PERIv2');
  const scenaryTwoFactory = await ethers.getContractFactory('NendNFTs2');

  for (let i = 1; i <= 4; i++) {
    console.log(`Deploying vpc level ${i}`);
    const scenarioOneContract = await scenarioOnefactory.deploy();
    await scenarioOneContract.deployed();
    const scenaryTwoContract = await scenaryTwoFactory.deploy();
    await scenaryTwoContract.deployed();

    let receipt;
    receipt = await withGasLimit(scenarioOneContract, 'initialize', [`VPC Level ${i}`, `VPC${i}`, nend, '0x0000000000000000000000000000000000000000', ethers.utils.parseEther(prices[i - 1].toString())]);
    await receipt.wait();
    receipt = await withGasLimit(scenaryTwoContract, 'initialize', [`VPC Level ${i}`, `VPC${i}`, nend, scenarioOneContract.address]);
    await receipt.wait();
    receipt = await withGasLimit(scenarioOneContract, 'setNextScenarioConenct', [scenaryTwoContract.address]);
    await receipt.wait();
    receipt = await withGasLimit(scenarioOneContract, 'setPublicMintState', [true]);
    await receipt.wait();
    receipt = await withGasLimit(scenarioOneContract, 'setRevealState', [true]);
    await receipt.wait();
    receipt = await withGasLimit(scenarioOneContract, 'setBaseURI', ['ipfs://bafybeigf5w2ko6cck7kj5r7tk3syo5rthbrpuqqgfzzzvxkdsjyixnjqtu/']);
    await receipt.wait();
    receipt = await withGasLimit(scenarioOneContract, 'setNotRevealedURI', ['ipfs://bafkreifxwss6pzw6ybcqojxkl6uo6us6wuqpibt6gh6opxe2x3vhavmdau/']);
    await receipt.wait();
    receipt = await withGasLimit(scenarioOneContract, 'transferOwnership', [curationRewardPool]);
    await receipt.wait();
    console.log(`Contract address lv${i}`, scenarioOneContract.address);
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
