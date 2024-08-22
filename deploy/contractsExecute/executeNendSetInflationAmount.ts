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

    const NendDeployment : DeploymentExt = await deployments.get('NEND');
    if(NendDeployment.newlyDeployed === undefined) {

        while(true) {
            try {
              const NendSetInflationAmount = await execute('NEND',
                {from: deployer, log: true},
                'setInflationAmount', ethers.utils.parseEther(NendInflationAmounts[Number(ChainId)].amount.toString())
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
func.tags = [ 'NendSetInflationAmount' ];
module.exports.dependencies = ['NendDeployment'];
module.exports.runAtTheEnd = true;