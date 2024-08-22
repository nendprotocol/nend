import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
const { ethers } = require("hardhat");

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts, getChainId} = hre;
  const {deploy, execute} = deployments;

  const {deployer} = await getNamedAccounts();
  
  const ChainId = await getChainId();

  //turbo address
  //0xF9845253F07aE368c9C5171Cd38125f2FAaa1B40
  let PeriFiAdminAddress;
  let PeriFiAdminDeployment;
  if (ChainId === '5') {
	PeriFiAdminAddress = '0x29c37316153e7Ee501888F4963eE5041C7d01E03';
	PeriFiAdminDeployment = await (await ethers.getContractFactory("PeriFiAdmin")).attach(PeriFiAdminAddress);
  } else {
	PeriFiAdminAddress = '0x29c37316153e7Ee501888F4963eE5041C7d01E03';
	PeriFiAdminDeployment = await (await ethers.getContractFactory("PeriFiAdmin")).attach(PeriFiAdminAddress);		
  }

  const PeriFiAdminExecuteUpdateClaimCollateralDuration = await PeriFiAdminDeployment.updateClaimCollateralDuration(600);
  console.log("Trx hash:", PeriFiAdminExecuteUpdateClaimCollateralDuration.hash);
  
}

export default func;
func.tags = [ "PeriFiAdminExecuteUpdateClaimCollateralDuration" ]