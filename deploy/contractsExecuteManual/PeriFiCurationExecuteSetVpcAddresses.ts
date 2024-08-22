import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
const { ethers } = require("hardhat");

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts, getChainId} = hre;
  const {deploy, execute} = deployments;

  const {deployer} = await getNamedAccounts();
  
  const ChainId = await getChainId();
  
  // VPCS addresses, currently same address for all networks
  let PeriFiCurationAddress;
  let PeriFiCurationDeployment;
  const VPCS = ['0xDA4dE9CC5a38E85c22c33b21f20A5F4A1B25385a', '0xDFece9C6A868f9481512dB30ebE720A3EB7cE1f6', '0x8c5b22e04635A1A6cbA38A55c9f144c7770cbE02', '0x016f82816fcDd7F78383AbcF28376d47743cFE4B']
  if (ChainId === '5') {
	PeriFiCurationAddress = '0xF84742CD3FeF2900494cbb606240724E0Ffb083A';
	PeriFiCurationDeployment = await (await ethers.getContractFactory("PeriFiCuration")).attach(PeriFiCurationAddress);
  } else {
	PeriFiCurationAddress = '0x17344Bc477815069C945d2eC51aA4cA73cA2Fc88';
	PeriFiCurationDeployment = await (await ethers.getContractFactory("PeriFiCuration")).attach(PeriFiCurationAddress);		
  }
	
  const PeriFiCurationExecuteSetVpcAddresses = await PeriFiCurationDeployment.setVPCAddresses(VPCS);
  console.log("Trx hash:", PeriFiCurationExecuteSetVpcAddresses.hash);
  
}

export default func;
func.tags = [ "PeriFiCurationExecuteSetVpcAddresses" ]