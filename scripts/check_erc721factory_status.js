const { ethers } = require('hardhat');

async function main () {
  console.log('checking ERC721Factory on 0x1B62950b0ff376f1291a353D776BE2bd74Cba367');
  const Factory = await ethers.getContractFactory('ERC721Factory');
  const factory = await Factory.attach('0x1B62950b0ff376f1291a353D776BE2bd74Cba367');

  let total = await factory.totalOf();
  console.log('total contracts created:', total);
  if (total === 0) {
    console.log('creating new contract...');
    const tx = await factory.deploy('Sample PeriFi NFT', 'SPN');
    await tx.wait();
    total = 1;
  }
  const address = await factory.addressOf(total - 1);
  console.log('last created contract address:', address);

  const PeriFiNFT = await ethers.getContractFactory('PeriFiNFT');
  const periFiNFT = await PeriFiNFT.attach(address);

  console.log('last created contract name:', await periFiNFT.name());
  console.log('last created contract symbol:', await periFiNFT.symbol());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
