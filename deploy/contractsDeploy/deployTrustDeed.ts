import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction, Deployment } from 'hardhat-deploy/types';
import version from '../version';
import retry from '../retry';
const { ethers } = require('hardhat');

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, getChainId } = hre;
  const { deploy, execute } = deployments;
  const { deployer } = await getNamedAccounts();
  const ChainId = await getChainId();

  const mainnet = version.mainnet;
  const turbo = version.turbo;
  const MainnetSalt = `nend-mainnet-v${version.number}`;
  const TestnetSalt = `nend-testnet-v${version.number}`;
  const TurboSalt = `nend-turbo-v${version.number}`;

  while (true) {
    try {
      // const TrustDeedDeployment = await deploy('TrustDeed', {
      //   from: deployer,
      //   contract: 'TrustDeed',
      //   // args: [],
      //   log: true,
      //   deterministicDeployment: mainnet ? ethers.utils.formatBytes32String(`${MainnetSalt}`) : turbo ? ethers.utils.formatBytes32String(`${TurboSalt}`) : ethers.utils.formatBytes32String(`${TestnetSalt}`)
      // });

      const TrustDeedDeployment = await deploy('TrustDeed', {
        from: deployer,
        contract: 'TrustDeed',
        log: true,
        deterministicDeployment: mainnet ? ethers.utils.formatBytes32String(`${MainnetSalt}`) : turbo ? ethers.utils.formatBytes32String(`${TurboSalt}`) : ethers.utils.formatBytes32String(`${TestnetSalt}`),
        proxy: {
          proxyContract: 'UUPS',
          execute: {
            //   init: {
            methodName: 'initialize',
            args: []
            //   },
          }
        }
      });
      break;
    } catch (err) {
      console.log(err);
      console.log('Transaction failed');
      await retry();
    }
  }
};

export default func;
func.tags = ['TrustDeedDeployment'];
// module.exports.dependencies = ['example1'];
