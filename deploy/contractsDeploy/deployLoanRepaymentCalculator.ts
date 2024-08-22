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

    const VaultInsuranceVaultDeployment : DeploymentExt = await deployments.get('VaultInsuranceVault');
    const VaultLendingPoolDeployment : DeploymentExt = await deployments.get('VaultLendingPool');
    const PeriFiAdminDeployment : DeploymentExt = await deployments.get('PeriFiAdmin');
    // const VaultProxyIflDeployment : DeploymentExt = await deployments.get('VaultProxyIfl');
    const VaultCurationRewardPoolDeployment : DeploymentExt = await deployments.get('VaultCurationRewardPool');
    
    while(true) {
        try {
          const LoanRepaymentCalculatorDeployment = await deploy('LoanRepaymentCalculator', {
            from: deployer,
            contract: 'LoanRepaymentCalculator',
            args: [VaultInsuranceVaultDeployment.address, VaultLendingPoolDeployment.address, deployer, PeriFiAdminDeployment.address, VaultCurationRewardPoolDeployment.address],
            log: true,
            deterministicDeployment: mainnet ? ethers.utils.formatBytes32String(`${MainnetSalt}`) : turbo ? ethers.utils.formatBytes32String(`${TurboSalt}`) : ethers.utils.formatBytes32String(`${TestnetSalt}`)
          });
          break;
        }catch(err) {
          console.log(err);
          console.log('Transaction failed');
          await retry();
        }
    }


}

export default func;
func.tags = [ 'LoanRepaymentCalculatorDeployment' ];
module.exports.dependencies = [ 'VaultDeployment', 'PeriFiAdminDeployment' ];