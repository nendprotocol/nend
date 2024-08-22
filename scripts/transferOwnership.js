async function main() {
  const pool = "0xeFEe0B3D6B7db29785CC64B1C1f459A244420F47";
  const cardAddresses = ["0xd9B15444D57d38fC91E27796b11f8762f0c00455", "0xB272197cb1d686F42B836C222098e83d9E074CFD", "0x3b2DD975a5a1413d0030b49a6463ab8677dB6816", "0x4d32d3CB804870dD879506aBdbf319b0EB17a95E"];
  const scenarioOnefactory = await ethers.getContractFactory("PERIv2");

  for (const address of cardAddresses) {
    const contract = await scenarioOnefactory.attach(address);

    const receipt = await withGasLimit(contract, "transferOwnership", [pool]);
    await receipt.wait();
  }

  console.log("Done");
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