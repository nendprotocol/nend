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

  // let VaultProxyIfpDeployment = { address: "", newlyDeployed: false};
  // let VaultProxyTcDeployment = { address: "", newlyDeployed: false};
  // let VaultProxyIflDeployment = { address: "", newlyDeployed: false};
  // if (ChainId === '4' || ChainId === '80001' || ChainId === "31337") {
  // const balanceNames = ["ifp", "tc", "ifl"];
  while (true) {
    try {
      const VaultProxyIfpDeployment = await deploy('VaultProxyIfp', {
        from: deployer,
        contract: 'VaultProxy',
        args: ['ifp'],
        log: true,
        deterministicDeployment: !turbo ? ethers.utils.formatBytes32String(`${MainnetSalt}-Ifp`) : ethers.utils.formatBytes32String(`${TurboSalt}-Ifp`)
      });
      break;
    } catch (err) {
      console.log(err);
      console.log('Transaction failed');
      await retry();
    }
  }

  while (true) {
    try {
      const VaultProxyTcDeployment = await deploy('VaultProxyTc', {
        from: deployer,
        contract: 'VaultProxy',
        args: ['tc'],
        log: true,
        deterministicDeployment: !turbo ? ethers.utils.formatBytes32String(`${MainnetSalt}-Tc`) : ethers.utils.formatBytes32String(`${TurboSalt}-Tc`)
      });
      break;
    } catch (err) {
      console.log(err);
      console.log('Transaction failed');
      await retry();
    }
  }

  while (true) {
    try {
      const VaultProxyIflDeployment = await deploy('VaultProxyIfl', {
        from: deployer,
        contract: 'VaultProxy',
        args: ['ifl'],
        log: true,
        deterministicDeployment: !turbo ? ethers.utils.formatBytes32String(`${MainnetSalt}-Ifl`) : ethers.utils.formatBytes32String(`${TurboSalt}-Ifl`)
      });
      break;
    } catch (err) {
      console.log(err);
      console.log('Transaction failed');
      await retry();
    }
  }
};
// }

export default func;
func.tags = ['VaultProxyDeployment'];
// module.exports.dependencies = ['example1'];
