async function main() {
  const factory = await ethers.getContractFactory("PeriFiCuration");

  const contract = await factory.attach(
    "0xa7337aa50b58f547dad927ae7094a5545f2549ea"
  );

  const voteCount = await contract.getVoteCount(
    "0xe3005742a6d0568d31e99af69674a6521e3379bd01897b5b5074bb2d001862ce"
  );

  console.log(voteCount);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
