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

    const VaultLendingPoolDeployment : DeploymentExt = await deployments.get('VaultLendingPool');
    const VaultCurationRewardPoolDeployment : DeploymentExt = await deployments.get('VaultCurationRewardPool');
    const VaultProxyIfpDeployment : DeploymentExt = await deployments.get('VaultProxyIfp');
    const VaultProxyTcDeployment : DeploymentExt = await deployments.get('VaultProxyTc');
    const VaultProxyIflDeployment : DeploymentExt = await deployments.get('VaultProxyIfl');

    if (ChainId === '5' || ChainId === '80001' || ChainId === '80002' || ChainId === "31337") {
        if (VaultLendingPoolDeployment.newlyDeployed === undefined || VaultProxyIfpDeployment.newlyDeployed === undefined ) {  

            while(true) {
                try {
                  const VaultLendingPoolAuthorizeVaultProxyIfp = await execute('VaultLendingPool',
                    {from: deployer, log: true},
                    'authorize', VaultProxyIfpDeployment.address, 'spender', true
                  );
                  break;
                }catch(err) {
                  console.log(err);
                  console.log('Transaction failed');
                  await retry();
                }
            }

        } 

        if (VaultLendingPoolDeployment.newlyDeployed === undefined || VaultProxyTcDeployment.newlyDeployed === undefined ) {  

            while(true) {
                try {
                  const VaultLendingPoolAuthorizeVaultProxyTc = await execute('VaultLendingPool',
                    {from: deployer, log: true},
                    'authorize', VaultProxyTcDeployment.address, 'spender', true
                  );
                  break;
                }catch(err) {
                  console.log(err);
                  console.log('Transaction failed');
                  await retry();
                }
            }

        } 

        if (VaultCurationRewardPoolDeployment.newlyDeployed === undefined || VaultProxyIflDeployment.newlyDeployed === undefined ) {  

            while(true) {
                try {
                  const VaultCurationRewardPoolAuthorizeVaultProxyIfl = await execute('VaultCurationRewardPool',
                    {from: deployer, log: true},
                    'authorize', VaultProxyIflDeployment.address, 'spender', true
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
func.tags = [ 'VaultAuthorizeVaultProxy' ];
module.exports.dependencies = ['VaultDeployment', 'VaultProxyDeployment'];
module.exports.runAtTheEnd = true;