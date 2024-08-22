import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
const { ethers } = require("hardhat");

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts, getChainId} = hre;
  const {deploy, execute} = deployments;

  const {deployer} = await getNamedAccounts();
  
  const ChainId = await getChainId();

  let NendAddress;
  let NendDeployment;
  let BondAddress;
  let BondDepositoryDeployment;
  let StakeAddres;
  let StakingDeployment;
  if (ChainId === '5') {
	//rinkeby       0x619f4E235d5935016e4f9B03fFCA67EED7C5f964
	//rinkeby turbo 0x7649fE1DF0d40297381d360A294A63A611281B9F
	NendAddress = '0xAAA99317136c74e3E6EFdFea51F09db2fce66B11';
	BondAddress = '0x140aEBB61A2118f6373c4046Fb8327D8dFa123Ab';
	StakeAddres = '0xe0391f4D5eA5a12A512e65A27a64797001d9246f';
	NendDeployment = await (await ethers.getContractFactory("NEND")).attach(NendAddress);
	BondDepositoryDeployment = await (await ethers.getContractFactory("BondDepository")).attach(BondAddress);
	StakingDeployment = await (await ethers.getContractFactory("Staking")).attach(StakeAddres);
	
	  const NendExecuteSetTesting = await NendDeployment.setTesting(false);
	  console.log("Trx hash:", NendExecuteSetTesting.hash);
	  const BondExecuteSetTesting = await BondDepositoryDeployment.setTesting(false);
	  console.log("Trx hash:", BondExecuteSetTesting.hash);
	  const StakeExecuteSetTesting = await StakingDeployment.setTesting(false);
	  console.log("Trx hash:", StakeExecuteSetTesting.hash);
	  
	  const NendCheckTesting = await NendDeployment.testing();
      const StakeCheckTesting = await StakingDeployment.testing();
	  const BondCheckTesting = await BondDepositoryDeployment.testing();
	  console.log(NendCheckTesting, BondCheckTesting, StakeCheckTesting);
  } else {
	NendAddress = '0xC738227c649B714577964fFbb42E0bD650EfB805';
	BondAddress = '0xA38E233eF0f30d6ECdf211892272461845613F88';
	StakeAddres = '0xad7BC4dd692552021489c55e1Db1a825D6A0E76C';
	NendDeployment = await (await ethers.getContractFactory("NEND")).attach(NendAddress);
	BondDepositoryDeployment = await (await ethers.getContractFactory("BondDepository")).attach(BondAddress);
	StakingDeployment = await (await ethers.getContractFactory("Staking")).attach(StakeAddres);		
	
	  const NendExecuteSetTesting = await NendDeployment.setTesting(false);
	  NendExecuteSetTesting.wait(2);
	  console.log("Trx hash:", NendExecuteSetTesting.hash);
	  const BondExecuteSetTesting = await BondDepositoryDeployment.setTesting(false);
	  BondExecuteSetTesting.wait(2);
	  console.log("Trx hash:", BondExecuteSetTesting.hash);
	  const StakeExecuteSetTesting = await StakingDeployment.setTesting(false);
	  StakeExecuteSetTesting.wait(2);
	  console.log("Trx hash:", StakeExecuteSetTesting.hash);
	  
	  const NendCheckTesting = await NendDeployment.testing();
      const StakeCheckTesting = await StakingDeployment.testing();
	  const BondCheckTesting = await BondDepositoryDeployment.testing();
	  console.log(NendCheckTesting, StakeCheckTesting, BondCheckTesting);
  }


  


}

export default func;
func.tags = [ "ExecuteSetTesting" ]