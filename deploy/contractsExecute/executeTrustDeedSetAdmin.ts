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

    const TrustDeedDeployment : DeploymentExt = await deployments.get('TrustDeed');
    const PeriFiAdminDeployment : DeploymentExt = await deployments.get('PeriFiAdmin');

    if (TrustDeedDeployment.newlyDeployed === undefined || PeriFiAdminDeployment.newlyDeployed === undefined) { 
        
        while(true) {
            try {
              const TrustDeedDeploymentAuthorizePeriFiLoan = await execute('TrustDeed',
                {from: deployer, log: true},
                'setAdminAddress', PeriFiAdminDeployment.address
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
func.tags = [ 'TrustDeedSetAdmin' ];
module.exports.dependencies = ['TrustDeedDeployment', 'PeriFiAdminDeployment'];
module.exports.runAtTheEnd = true;