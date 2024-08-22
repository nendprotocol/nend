import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction, Deployment} from 'hardhat-deploy/types';
const {ethers} = require("hardhat");
import version from '../version';
import NendInflationAmounts from '../models/nendInflation';
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

    // const NendDeployment : DeploymentExt = await deployments.get('NEND');
    const StakingDeployment : DeploymentExt = await deployments.get('Staking');

    if(StakingDeployment.newlyDeployed == undefined) {

        while(true) {
            try {
              const NendReset = await execute('NEND',
                {from: deployer, log: true},
                'reset'
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
func.tags = [ 'NendReset' ];
module.exports.dependencies = ['StakingDeployment'];
module.exports.runAtTheEnd = true;