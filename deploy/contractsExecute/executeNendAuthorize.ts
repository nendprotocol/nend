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

    const NendDeployment : DeploymentExt = await deployments.get('NEND');
    const BondDepositoryDeployment : DeploymentExt = await deployments.get('BondDepository');
    const PeriFiCurationDeployment : DeploymentExt = await deployments.get('PeriFiCuration');
    const VPCBridgeDeployment : DeploymentExt = await deployments.get('VPCBridge');
    
    const StakingDeployment : DeploymentExt = await deployments.get('Staking');

    if (NendDeployment.newlyDeployed === undefined || BondDepositoryDeployment.newlyDeployed === undefined || StakingDeployment.newlyDeployed == undefined) {  

      while(true) {
        try {
          const NendDeploymentDeploymentAuthorizeBonding = await execute('NEND',
            {from: deployer, log: true},
            'authorize', BondDepositoryDeployment.address, 'minter', true
          );
          break;
        }catch(err) {
          console.log(err);
          console.log('Transaction failed');
          await retry();
        }
      }

    }
  
    if (NendDeployment.newlyDeployed === undefined || PeriFiCurationDeployment.newlyDeployed === undefined || StakingDeployment.newlyDeployed == undefined) {  

      while(true) {
        try {
          const NendDeploymentDeploymentAuthorizePeriFiCuration = await execute('NEND',
            {from: deployer, log: true},
            'authorize', PeriFiCurationDeployment.address, 'minter', true
          );
          break;
        }catch(err) {
          console.log(err);
          console.log('Transaction failed');
          await retry();
        }
      }

    }

    if (NendDeployment.newlyDeployed === undefined || VPCBridgeDeployment.newlyDeployed === undefined || StakingDeployment.newlyDeployed == undefined) {  

      while(true) {
        try {
          const NendDeploymentDeploymentAuthorizeVPCBridge = await execute('NEND',
            {from: deployer, log: true},
            'authorize', VPCBridgeDeployment.address, 'minter', true
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

export default func;
func.tags = [ 'NendAuthorize' ];
module.exports.dependencies = ['NendDeployment', 'BondDepositoryDeployment', 'PeriFiCurationDeployment', 'VPCBridgeDeployment', 'StakingDeployment'];
module.exports.runAtTheEnd = true;