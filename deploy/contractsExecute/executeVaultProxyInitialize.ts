import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction, Deployment} from 'hardhat-deploy/types';
const {ethers} = require("hardhat");
import version from '../version';
import {VaultProxyTokens, UniSwapRouters} from '../models/vaultProxy';
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

    const VaultProxyIfpDeployment : DeploymentExt = await deployments.get('VaultProxyIfp');
    const VaultProxyTcDeployment : DeploymentExt = await deployments.get('VaultProxyTc');
    const VaultProxyIflDeployment : DeploymentExt = await deployments.get('VaultProxyIfl');

    const NendDeployment : DeploymentExt = await deployments.get('NEND');

    const VaultLendingPoolDeployment : DeploymentExt = await deployments.get('VaultLendingPool');
    const VaultCurationRewardPoolDeployment : DeploymentExt = await deployments.get('VaultCurationRewardPool');
    
    let VaultProxyArg1 = [];
    let VaultProxyArg2 = [];
    for (const [chain, tokens] of Object.entries(VaultProxyTokens)) {
        tokens.nend = NendDeployment.address;
        if(chain === ChainId){
            for (const [tokenName, tokenAddress] of Object.entries(tokens)) {	
                VaultProxyArg1.push(tokenAddress);
                VaultProxyArg2.push(NendDeployment.address);
            }
        }
    };

    if (ChainId === '5' || ChainId === '80001') {
        if (VaultProxyIfpDeployment.newlyDeployed === undefined ) {  

            while(true) {
                try {
                  const VaultProxyIfpDeploymentInitialize = await execute('VaultProxyIfp',
                    {from: deployer, log: true},
                    'initialize', VaultProxyArg1, VaultProxyArg2, VaultLendingPoolDeployment.address, UniSwapRouters[Number(ChainId)].swapRouter
                  );
                  break;
                }catch(err) {
                  console.log(err);
                  console.log('Transaction failed');
                  await retry();
                }
            }

        } 

        if (VaultProxyTcDeployment.newlyDeployed === undefined ) {  

            while(true) {
                try {
                  const VaultProxyTcDeploymentInitialize = await execute('VaultProxyTc',
                    {from: deployer, log: true},
                    'initialize', VaultProxyArg1, VaultProxyArg2, VaultLendingPoolDeployment.address, UniSwapRouters[Number(ChainId)].swapRouter
                  );
                  break;
                }catch(err) {
                  console.log(err);
                  console.log('Transaction failed');
                  await retry();
                }
            }

        } 

        if (VaultProxyIflDeployment.newlyDeployed === undefined ) {  

            while(true) {
                try {
                  const VaultProxyIflDeploymentInitialize = await execute('VaultProxyIfl',
                    {from: deployer, log: true},
                    'initialize', VaultProxyArg1, VaultProxyArg2, VaultCurationRewardPoolDeployment.address, UniSwapRouters[Number(ChainId)].swapRouter
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
func.tags = [ 'VaultProxyInitialize' ];
module.exports.dependencies = ['VaultProxyDeployment', 'NendDeployment', 'VaultDeployment'];
module.exports.runAtTheEnd = true;