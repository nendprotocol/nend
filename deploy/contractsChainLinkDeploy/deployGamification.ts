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

    while(true) {
        try {
          const GamificationDeployment = await deploy('Gamification', {
            from: deployer,
            contract: 'Gamification',
            args: [91, '0xd5D517aBE5cF79B7e95eC98dB0f0277788aFF634', '0x83250c5584ffa93feb6ee082981c5ebe484c865196750b39835ad4f13780435d'],
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
func.tags = [ 'GamificationDeployment' ];
// module.exports.dependencies = [ ];