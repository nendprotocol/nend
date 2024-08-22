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
    // const LiquidityPoolStakingDeployment : DeploymentExt = await deployments.get('LiquidityPoolStaking');
    const VaultEcosystemFundDeployment : DeploymentExt = await deployments.get('VaultEcosystemFund');

        while(true) {
            try {
              const VaultEcosystemExecuteBurn = await execute('VaultEcosystemFund',
                {from: deployer, log: true},
                'burn', NendDeployment.address, ethers.utils.parseEther("50000000")
              );	
              break;
            }catch(err) {
              console.log(err);
              console.log('Transaction failed');
              await retry();
            }
        }

    

}

export default func;
module.exports.dependencies = ['NendDeployment', 'VaultDeployment'];
func.tags = [ 'VaultEcosystemExecuteBurn' ];
