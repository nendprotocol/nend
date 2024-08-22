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
    const VaultInsuranceVaultDeployment : DeploymentExt = await deployments.get('VaultInsuranceVault');
    const VaultEcosystemFundDeployment : DeploymentExt = await deployments.get('VaultEcosystemFund');

    while(true) {
        try {
          // const BondDepositoryDeployment = await deploy('BondDepository', {
          //   from: deployer,
          //   contract: 'BondDepository',
          //   args: [NendDeployment.address, VaultInsuranceVaultDeployment.address, VaultEcosystemFundDeployment.address],
          //   log: true,
          //   deterministicDeployment: mainnet ? ethers.utils.formatBytes32String(`${MainnetSalt}`) : turbo ? ethers.utils.formatBytes32String(`${TurboSalt}`) : ethers.utils.formatBytes32String(`${TestnetSalt}`)
          // });

          const BondDepositoryDeployment = await deploy('BondDepository', {
            from: deployer,
            contract: 'BondDepository',
            log: true,
            deterministicDeployment: mainnet ? ethers.utils.formatBytes32String(`${MainnetSalt}`) : turbo ? ethers.utils.formatBytes32String(`${TurboSalt}`) : ethers.utils.formatBytes32String(`${TestnetSalt}`),
            proxy: {
              proxyContract: 'UUPS',
              execute: {
                // init: {
                  methodName: 'initialize',
                  args: [NendDeployment.address, VaultInsuranceVaultDeployment.address, VaultEcosystemFundDeployment.address],
                // },
              },
            },
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
func.tags = [ 'BondDepositoryDeployment' ];
module.exports.dependencies = ['NendDeployment', 'VaultDeployment'];