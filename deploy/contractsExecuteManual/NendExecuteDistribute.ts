import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import { ConsoleLogger } from '@nestjs/common';
const { ethers } = require("hardhat");

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts, getChainId} = hre;
  const {deploy, execute} = deployments;

  const {deployer} = await getNamedAccounts();
  
  const ChainId = await getChainId();

  let NendAddress;
  let NendDeployment;
  const NendAmount = "70000000";
  if (ChainId === '137') {
    NendAddress = '0x32dFE9b08826C24296F494eC1831Ee7CEb45e4a6';
    NendDeployment = await (await ethers.getContractFactory("NEND")).attach(NendAddress);
  }

  //function distribute(address _to, uint256 _amount)
  let NendExecuteDistribute = await NendDeployment.distribute("0xA0a343af206e6349A5756E688f5b32816969f932", ethers.utils.parseEther(NendAmount));
  console.log("Trx hash:", NendExecuteDistribute.hash);
  await NendExecuteDistribute.wait(3);
  
}

export default func;
func.tags = [ "NendExecuteDistribute" ]