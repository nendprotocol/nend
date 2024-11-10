import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { DeployFunction, Deployment } from 'hardhat-deploy/types';

import retry from '../retry';
import version from '../version';
import VpcLevels from '../models/vpcLevels';

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

    const DummyTicketDeployment : DeploymentExt = await deployments.get('DummyTicket');
    const NendDeployment = await deployments.get('NEND');
    const VaultCurationRewardPoolDeployment = await deployments.get('VaultCurationRewardPool');

    const VPCBridgeArg1 = [];
    const VPCBridgeArg2 = [];
    for (const [level] of Object.entries(VpcLevels)) {
      const VpcDeployment = await deployments.get(`VpcLevel${level}`);
      VPCBridgeArg1.push(VpcDeployment.address);
      VPCBridgeArg2.push(DummyTicketDeployment.address);
    }

    let chains;
    if (ChainId === '31337') {
      chains = [31337, 31337]; // Local/Hardhat network
    } else if (ChainId === '5' || ChainId === '80001' || ChainId === '97' || ChainId === '43113') {
      chains = [80001, 5, 97, 43113]; // Mumbai, Rinkeby, Bnb, Fuji
    } else if (ChainId === '137' || ChainId === '1' || ChainId === '56' || ChainId === '43114') {
      chains = [137, 1, 56, 43114]; // poly, eth, bsc, avax
    }

    while (true) {
      try {
        // const VPCBridgeDeployment = await deploy('VPCBridge', {
        //   from: deployer,
        //   contract: 'VPCBridge',
        //   args: [VPCBridgeArg1, VPCBridgeArg2, chains, VaultCurationRewardPoolDeployment.address, NendDeployment.address],
        //   log: true,
        //   deterministicDeployment: mainnet ? ethers.utils.formatBytes32String(`${MainnetSalt}`) : turbo ? ethers.utils.formatBytes32String(`${TurboSalt}`) : ethers.utils.formatBytes32String(`${TestnetSalt}`)
        // });

        const VPCBridgeDeployment = await deploy('VPCBridge', {
          from: deployer,
          contract: 'VPCBridge',
          log: true,
          deterministicDeployment: mainnet ? ethers.utils.formatBytes32String(`${MainnetSalt}`) : turbo ? ethers.utils.formatBytes32String(`${TurboSalt}`) : ethers.utils.formatBytes32String(`${TestnetSalt}`),
          proxy: {
            proxyContract: 'UUPS',
            execute: {
              // init: {
              methodName: 'initialize',
              args: [VPCBridgeArg1, VPCBridgeArg2, chains, VaultCurationRewardPoolDeployment.address, NendDeployment.address]
              // },
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
func.tags = ['VPCBridgeDeployment'];
module.exports.dependencies = ['DummyTicketDeployment', 'VpcDeployment', 'NendDeployment', 'VaultDeployment'];
