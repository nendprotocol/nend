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
	PeriFiAdminAddress = '0xF9845253F07aE368c9C5171Cd38125f2FAaa1B40';
	PeriFiAdminDeployment = await (await ethers.getContractFactory("PeriFiAdmin")).attach(PeriFiAdminAddress);
  } else {
	PeriFiAdminAddress = '0xF9845253F07aE368c9C5171Cd38125f2FAaa1B40';
	PeriFiAdminDeployment = await (await ethers.getContractFactory("PeriFiAdmin")).attach(PeriFiAdminAddress);		
  }

  const PeriFiAdminExecuteUpdatePreLiquidationDuration = await PeriFiAdminDeployment.updatePreLiquidationDuration(900);
  console.log("Trx hash:", PeriFiAdminExecuteUpdatePreLiquidationDuration.hash);
  
}

export default func;
func.tags = [ "PeriFiAdminExecuteUpdatePreLiquidationDuration" ]