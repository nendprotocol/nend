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

    while(true) {
        try {
          // const LiquidityPoolStakingDeployment = await deploy('LiquidityPoolStaking', {
          //   from: deployer,
          //   contract: 'LiquidityPoolStaking',
          //   args: [NendDeployment.address],
          //   log: true,
          //   deterministicDeployment: mainnet ? ethers.utils.formatBytes32String(`${MainnetSalt}`) : turbo ? ethers.utils.formatBytes32String(`${TurboSalt}`) : ethers.utils.formatBytes32String(`${TestnetSalt}`)
          // });

          const LiquidityPoolStakingDeployment = await deploy('LiquidityPoolStaking', {
            from: deployer,
            contract: 'LiquidityPoolStaking',
            log: true,
            deterministicDeployment: mainnet ? ethers.utils.formatBytes32String(`${MainnetSalt}`) : turbo ? ethers.utils.formatBytes32String(`${TurboSalt}`) : ethers.utils.formatBytes32String(`${TestnetSalt}`),
            proxy: {
              proxyContract: 'UUPS',
              execute: {
                // init: {
                  methodName: 'lpsInitialize',
                  args: [NendDeployment.address],
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
func.tags = [ 'LiquidityPoolStakingDeployment' ];
module.exports.dependencies = ['NendDeployment'];