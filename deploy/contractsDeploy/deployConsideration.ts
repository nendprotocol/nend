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

    interface DeploymentExt extends Deployment {
        newlyDeployed?: boolean;
    }

    const mainnet = version.mainnet;
    const turbo = version.turbo;
    const MainnetSalt = `nend-mainnet-v${version.number}`;
    const TestnetSalt = `nend-testnet-v${version.number}`;
    const TurboSalt = `nend-turbo-v${version.number}`;

    const ConduitControllerDeployment : DeploymentExt = await deployments.get('ConduitController');

    while (true) {
      try {
        const ConsiderationDeployment = await deploy('Consideration', {
          from: deployer,
          contract: 'Consideration',
          args: [ConduitControllerDeployment.address],
          log: true,
          deterministicDeployment: mainnet ? ethers.utils.formatBytes32String(`${MainnetSalt}`) : turbo ? ethers.utils.formatBytes32String(`${TurboSalt}`) : ethers.utils.formatBytes32String(`${TestnetSalt}`)
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
func.tags = ['ConsiderationDeployment'];
module.exports.dependencies = ['ConduitControllerDeployment'];
