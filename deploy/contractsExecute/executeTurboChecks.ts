import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction, Deployment} from 'hardhat-deploy/types';
const {ethers} = require("hardhat");
import version from '../version';
import retry from '../retry';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const {deployments, getNamedAccounts, getChainId} = hre;
    const {deploy, execute} = deployments;
    const {deployer} = await getNamedAccounts();
    const ChainId = await getChainId();

    interface DeploymentExt extends Deployment {
        newlyDeployed?: boolean; 
    }

    const mainnet = version.mainnet;
    const turbo = version.turbo;
    const MainnetSalt = `nend-mainnet-v${version.number}`;
    const TestnetSalt = `nend-testnet-v${version.number}`;
    const TurboSalt = `nend-turbo-v${version.number}`;

    const PeriFiAdminDeployment : DeploymentExt = await deployments.get('PeriFiAdmin');
    const NendDeployment : DeploymentExt = await deployments.get('NEND');
    const BondDepositoryDeployment : DeploymentExt = await deployments.get('BondDepository');
    const StakingDeployment : DeploymentExt = await deployments.get('Staking');
    const LoanAuctionDeployment : DeploymentExt = await deployments.get('LoanAuction');

    if (turbo === true) {
      if (PeriFiAdminDeployment.newlyDeployed === undefined ) {  

        while(true) {
          try {
            const PeriFiAdminDeploymentUpdatePreLiquidationDuration = await execute('PeriFiAdmin',
              {from: deployer, log: true},
              'updatePreLiquidationDuration', 900
            );
            break;
          }catch(err) {
            console.log(err);
            console.log('Transaction failed');
            await retry();
          }
        }

      }

      if (PeriFiAdminDeployment.newlyDeployed === undefined ) {  

        while(true) {
          try {
            const PeriFiAdminDeploymentUpdateClaimCollateralDuration = await execute('PeriFiAdmin',
              {from: deployer, log: true},
              'updateClaimCollateralDuration', 600
            );
            break;
          }catch(err) {
            console.log(err);
            console.log('Transaction failed');
            await retry();
          }
        }

      }

      if (LoanAuctionDeployment.newlyDeployed === undefined ) {  

        while(true) {
          try {
            const LoanAuctionDeploymentupdateDecrementInterval = await execute('LoanAuction',
              {from: deployer, log: true},
              'updateDecrementInterval', 60
            );
            break;
          }catch(err) {
            console.log(err);
            console.log('Transaction failed');
            await retry();
          }
        }

      }

      const NendCheckTesting = await (await ethers.getContractFactory("NEND")).attach(NendDeployment.address).testing();
      if (NendCheckTesting === false){

        while(true) {
          try {
            const NendDeploymentSetTesting = await execute('NEND',
              {from: deployer, log: true},
              'setTesting', true
            ); 
            break;
          }catch(err) {
            console.log(err);
            console.log('Transaction failed');
            await retry();
          }
        }
       
      }

      const BondDepositoryTesting = await (await ethers.getContractFactory("BondDepository")).attach(BondDepositoryDeployment.address).testing();
      if (BondDepositoryTesting === false){

        while(true) {
          try {
            const NendDeploymentSetTesting = await execute('BondDepository',
              {from: deployer, log: true},
              'setTesting', true
            ); 
            break;
          }catch(err) {
            console.log(err);
            console.log('Transaction failed');
            await retry();
          }
        }
       
      }

      const StakingTesting = await (await ethers.getContractFactory("LendingPoolStaking")).attach(StakingDeployment.address).testing();
      if (StakingTesting === false){

        while(true) {
          try {
            const NendDeploymentSetTesting = await execute('Staking',
              {from: deployer, log: true},
              'setTesting', true
            );  
            break;
          }catch(err) {
            console.log(err);
            console.log('Transaction failed');
            await retry();
          }
        }
      
      }
    }

    
}

export default func;
func.tags = [ 'TurboChecks' ];
module.exports.dependencies = ['PeriFiAdminDeployment', 'NendDeployment'];
module.exports.runAtTheEnd = true;