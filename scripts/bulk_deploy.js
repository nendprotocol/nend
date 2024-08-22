async function main() {
  const commissionPool = "0xeF2f26A7CD0819a3D1bABf689EeE18914db3111e";
  const lendingPool = "0x5942f8A12985bc174DFFAaDf513477767DDc3eFd";
  const curationRewardPool = "0x3eE228e7e5f6d3570BAFaaE52c4024385B2B6C0F";
  const insurancePool = "0x35Ec9159970F687a2657Ee5f3a79325e062Ae714";
  const ecosystemPool = "0x8e44baC653eff06f0231dF3b7325E4Fed2988392";
  const swapRouter = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
  const usdc = "0xeb8f08a975ab53e34d8a0330e0d34de942c95926";
  const link = "0x01BE23585060835E02B77ef475b0Cc51aA1e0709";
  const dai = "0x5592EC0cfb4dbc12D3aB100b257153436a1f0FEa";
  const native = "0x0000000000000000000000000000000000000000";
  const chains = [80001, 4, 97, 43113]; // Mumbai, Rinkeby, Bnb, Fuji
  const inflationAmounts = ["44717.8662", "54655.1698", "64592.4734", "59623.8216"];
  const prices = [5, 10, 20, 40];
  const lendingPoolBalancesName = ["ifp", "tc"];
  const curationRewardPoolBalancesName = ["ifl"];
  const chainIdx = 1;
  const vpcAddresses = [];
  let receipt;

  const scenarioOnefactory = await ethers.getContractFactory("PERIv2");
  const vaultProxyFactory = await ethers.getContractFactory("VaultProxy");
  const scenaryTwoFactory = await ethers.getContractFactory("NendNFTs2");
  const curationFactory = await ethers.getContractFactory("PeriFiCuration");
  const stakingFactory = await ethers.getContractFactory("Staking");
  const vaultFactory = await ethers.getContractFactory("Vault");
  const bondFactory = await ethers.getContractFactory("BondDepository");
  const nendFactory = await ethers.getContractFactory("NEND");


  // ------ NEND ------
  console.log("Deploying NEND...");
  const nendContract = await nendFactory.deploy(chains[chainIdx] == 4, chains, ethers.utils.parseEther(inflationAmounts[chainIdx]));
  await nendContract.deployed();
  console.log("NEND address", nendContract.address);

  // ------ VPC ------
  for (let i = 1; i <= 4; i++) {
    console.log(`Deploying vpc level ${i}`);
    const scenarioOneContract = await scenarioOnefactory.deploy();
    await scenarioOneContract.deployed();
    const scenaryTwoContract = await scenaryTwoFactory.deploy();
    await scenaryTwoContract.deployed();
    receipt = await withGasLimit(scenarioOneContract, "initialize", [`VPC Level ${i}`, `VPC${i}`, nendContract.address, "0x0000000000000000000000000000000000000000", ethers.utils.parseEther(prices[i - 1].toString())]);
    await receipt.wait();
    receipt = await withGasLimit(scenaryTwoContract, "initialize", [`VPC Level ${i}`, `VPC${i}`, nendContract.address, scenarioOneContract.address]);
    await receipt.wait();
    receipt = await withGasLimit(scenarioOneContract, "setNextScenarioConenct", [scenaryTwoContract.address]);;
    await receipt.wait();
    receipt = await withGasLimit(scenarioOneContract, "setPublicMintState", [true]);
    await receipt.wait();
    receipt = await withGasLimit(scenarioOneContract, "setRevealState", [true]);
    await receipt.wait();
    receipt = await withGasLimit(scenarioOneContract, "setBaseURI", ["ipfs://bafybeigf5w2ko6cck7kj5r7tk3syo5rthbrpuqqgfzzzvxkdsjyixnjqtu/"]);
    await receipt.wait();
    receipt = await withGasLimit(scenarioOneContract, "setNotRevealedURI", ["ipfs://bafkreifxwss6pzw6ybcqojxkl6uo6us6wuqpibt6gh6opxe2x3vhavmdau/"]);
    await receipt.wait();
    receipt = await withGasLimit(scenarioOneContract, "transferOwnership", [curationRewardPool]);
    await receipt.wait();
    console.log(`VPC lv${i} address`, scenarioOneContract.address);
    vpcAddresses.push(scenarioOneContract.address);
  }

  // ------ Curation ------
  console.log("Deploying Curation...");
  const curationContract = await curationFactory.deploy(curationRewardPool, nendContract.address, vpcAddresses);
  await curationContract.deployed();
  const curationRewardVaultContract = await vaultFactory.attach(curationRewardPool);
  receipt = await withGasLimit(curationRewardVaultContract, "authorize", [curationContract.address, "spender", true]);
  await receipt.wait();
  receipt = await withGasLimit(nendContract, "authorize", [curationContract.address, "minter", true]);
  await receipt.wait();
  console.log(`Curation address`, curationContract.address);

  // ------ Staking ------
  console.log("Deploying Staking...");
  const stakingContract = await stakingFactory.deploy(nendContract.address, commissionPool, lendingPool);
  await stakingContract.deployed();
  receipt = await withGasLimit(nendContract, "setStaking", [stakingContract.address]);
  await receipt.wait();
  const lendingPoolVaultContract = vaultFactory.attach(lendingPool);
  receipt = await withGasLimit(lendingPoolVaultContract, "authorize", [stakingContract.address, "spender", true]);
  await receipt.wait();
  console.log("Staking address", stakingContract.address);

  // ------ Bonding ------
  console.log("Deploying Bonding...");
  const bondContract = await bondFactory.deploy(nendContract.address, insurancePool, ecosystemPool);
  await bondContract.deployed();
  receipt = await withGasLimit(nendContract, "authorize", [bondContract.address, "minter", true]);
  await receipt.wait();
  console.log("Bonding address", bondContract.address);

  // ------ Vault Proxies ------
  for (const balance of lendingPoolBalancesName) {
    const vaultProxyContract = await vaultProxyFactory.deploy(balance, [nendContract.address, usdc, link, dai, native], [nendContract.address, nendContract.address, nendContract.address, nendContract.address, nendContract.address], lendingPool, swapRouter);
    await vaultProxyContract.deployed();
    receipt = await withGasLimit(lendingPoolVaultContract, "authorize", [vaultProxyContract.address, "spender", true]);
    await receipt.wait();
    console.log(`Vault proxy for balance ${balance} address`, vaultProxyContract.address);
  }

  const curationRewardPoolVaultContract = vaultFactory.attach(curationRewardPool);
  for (const balance of curationRewardPoolBalancesName) {
    const vaultProxyContract = await vaultProxyFactory.deploy(balance, [nendContract.address, usdc, link, dai, native], [nendContract.address, nendContract.address, nendContract.address, nendContract.address, nendContract.address], curationRewardPool, swapRouter);
    await vaultProxyContract.deployed();
    receipt = await withGasLimit(curationRewardPoolVaultContract, "authorize", [vaultProxyContract.address, "spender", true]);
    await receipt.wait();
    console.log(`Vault proxy for balance ${balance} address`, vaultProxyContract.address);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

async function withGasLimit(contract, fn, parameters = [], gasMargin = 0.1) {
  const estimatedGas = await contract.estimateGas[fn](...parameters);
  const marginalizedGas = estimatedGas.toNumber() + Math.floor(estimatedGas * gasMargin);
  return await contract[fn](...parameters, { gasLimit: marginalizedGas });
}