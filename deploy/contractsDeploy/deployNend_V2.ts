import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { DeployFunction, Deployment } from 'hardhat-deploy/types';
import { ethers } from 'hardhat';

import retry from '../retry';
import version from '../version';

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

  let chains;
  if (ChainId === '31337') {
    chains = [31337, 31337]; // Local/Hardhat network
  } else if (ChainId === '5' || ChainId === '80001' || ChainId === '97' || ChainId === '43113' || ChainId === '80002') {
    chains = [80001, 80002, 5, 97, 43113]; // Mumbai, Amoy, Rinkeby, Bnb, Fuji
  } else if (ChainId === '137' || ChainId === '1' || ChainId === '56' || ChainId === '43114') {
    chains = [137, 1, 56, 43114]; // poly, eth, bsc, avax
  }

  while (true) {
    try {
      // const NendDeployment = await deploy('NEND', {
      //   from: deployer,
      //   contract: 'NEND',
      //   args: [ChainId === "5" || ChainId === "137" ? true : false, chains],
      //   log: true,
      //   deterministicDeployment: mainnet ? ethers.utils.formatBytes32String(`${MainnetSalt}`) : turbo ? ethers.utils.formatBytes32String(`${TurboSalt}`) : ethers.utils.formatBytes32String(`${TestnetSalt}`)
      // });

      const NendDeployment_V2 = await deploy('NEND', {
        from: deployer,
        contract: 'NENDV2',
        log: true,
        deterministicDeployment: mainnet ? ethers.utils.formatBytes32String(`${MainnetSalt}`) : turbo ? ethers.utils.formatBytes32String(`${TurboSalt}`) : ethers.utils.formatBytes32String(`${TestnetSalt}`),
        proxy: {
          proxyContract: 'UUPS'
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
func.tags = ['NendDeployment_V2'];
