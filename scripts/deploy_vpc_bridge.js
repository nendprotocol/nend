const { ethers } = require('hardhat');

async function main () {
  const [deployer] = await ethers.getSigners();

  const chains = [80001, 4, 97, 43113];
  const vpcs = ['', '', '', ''];
  const tickets = ['', '', '', ''];
  const mintAmount = 10000;

  console.log(
    'Deploying Vpc Bridge contracts with the account:',
    deployer.address
  );

  console.log('Account balance:', (await deployer.getBalance()).toString());

  const bridgeFactory = await ethers.getContractFactory('VPCBridge');
  const ticketFactory = await ethers.getContractFactory('Ticket');
  const bridge = await bridgeFactory.deploy(vpcs, tickets, chains);

  for (let i = 0; i < 4; i++) {
    const ticket = await ticketFactory.attach(tickets[i]);
    const receipt = await withGasLimit(ticket, 'mint', [
      deployer.address,
      mintAmount
    ]);
    await receipt.wait();
  }

  await bridge.deployed();

  console.log('Vpc Bridge address:', bridge.address);
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
