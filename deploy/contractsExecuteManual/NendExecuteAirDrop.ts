import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
const { ethers } = require('hardhat');

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, getChainId } = hre;
  const { deploy, execute } = deployments;

  const { deployer } = await getNamedAccounts();

  const ChainId = await getChainId();

  let NendAddress;
  let NendDeployment;
  const NendAmount = '1100';
  if (ChainId === '5') {
    NendAddress = '0xC7fd2AE2A766623A2f0DDc18c021343Cc5439358';
    NendDeployment = await (await ethers.getContractFactory('NEND')).attach(NendAddress);
  } else {
    NendAddress = '0x93DDb06F4A094184f7d67111bDb67E7c5da98ae7';
    NendDeployment = await (await ethers.getContractFactory('NEND')).attach(NendAddress);
  }
  let NendExecuteAirDrop = await NendDeployment.createAirdrop(deployer, ethers.utils.parseEther(NendAmount));
  console.log('Trx hash:', NendExecuteAirDrop.hash);
  await NendExecuteAirDrop.wait(3);

  const wallets = [
    '0xf8DA109696b2a022Ca02Eb4f6F17252B305B198D',
    '0xE2B595434a68F3fC2ea746BeD8d79B2F50118d76',
    '0x4B7d2b251983A7Dc3992454d500077707961662d',
    '0xf7966a09b92e4aca10c8313bea70340bc25a4e05',
    '0x367f4894bEeB3BFcef1DDBb36ff96D36DC9C79FE',
    '0xEc220cbADb31b471c2ea5fDCBcD51dda2dFa0A41',
    '0x094bA2973C71Ba2e34DaA28B6cED25FBF23AFf24',
    '0x61c4e27C40492769D87F1d2Dd59bb15F42d7F343',
    '0xb826610a5c34B0a06811f6836284d2A60EA4e766',
    '0xaC666Cd375d4D60CEd251c790C8ED72C596AB408',
    '0xF7d58f3d7122e6C76bc72C2B89dAB76D792D83bB'
  ];
  for (const wallet in wallets) // for acts as a foreach
  {
    NendExecuteAirDrop = await NendDeployment.transfer(wallet, ethers.utils.parseEther('100'));
    console.log('Trx hash:', NendExecuteAirDrop.hash);
    await NendExecuteAirDrop.wait(1);
  }
};

export default func;
func.tags = ['NendExecuteAirDrop'];
