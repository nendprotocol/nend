import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction, Deployment} from 'hardhat-deploy/types';
const {ethers} = require("hardhat");
import version from '../version';
import VpcLevels from '../models/vpcLevels';
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
    const VaultCurationRewardPoolDeployment : DeploymentExt = await deployments.get('VaultCurationRewardPool');

    let PeriFiCurationArg1 = [];
    for (const [level] of Object.entries(VpcLevels)) {
        const VpcDeployment = await deployments.get(`VpcLevel${level}`);
        PeriFiCurationArg1.push(VpcDeployment.address);
    }

    while(true) {
        try {
          // const PeriFiCurationDeployment = await deploy('PeriFiCuration', {
          //   from: deployer,
          //   contract: 'PeriFiCuration',
          //   args: [VaultCurationRewardPoolDeployment.address, NendDeployment.address, PeriFiCurationArg1],
          //   log: true,
          //   deterministicDeployment: mainnet ? ethers.utils.formatBytes32String(`${MainnetSalt}`) : turbo ? ethers.utils.formatBytes32String(`${TurboSalt}`) : ethers.utils.formatBytes32String(`${TestnetSalt}`)
          // });

          const PeriFiCurationDeployment = await deploy('PeriFiCuration', {
            from: deployer,
            contract: 'PeriFiCuration',
            log: true,
            deterministicDeployment: mainnet ? ethers.utils.formatBytes32String(`${MainnetSalt}`) : turbo ? ethers.utils.formatBytes32String(`${TurboSalt}`) : ethers.utils.formatBytes32String(`${TestnetSalt}`),
            proxy: {
              proxyContract: 'UUPS',
              execute: {
                // init: {
                  methodName: 'initialize',
                  args: [VaultCurationRewardPoolDeployment.address, NendDeployment.address, PeriFiCurationArg1],
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
func.tags = [ 'PeriFiCurationDeployment' ];
module.exports.dependencies = ['NendDeployment', 'VaultDeployment', 'VpcDeployment'];