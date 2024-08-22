import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction, Deployment} from 'hardhat-deploy/types';
const {ethers} = require("hardhat");
import version from '../version';
import vpcLevels from '../models/vpcLevels';
import retry from '../retry';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const {deployments, getNamedAccounts, getChainId} = hre;
    const {deploy, execute} = deployments;
    const {deployer} = await getNamedAccounts();
    const ChainId = await getChainId();

    const mainnet = version.mainnet;
    const turbo = version.turbo;
    const MainnetSalt = `nend-mainnet-v${version.number}`;
    const TestnetSalt = `nend-testnet-v${version.number}`;
    const TurboSalt = `nend-turbo-v${version.number}`;

    for (const [level] of Object.entries(vpcLevels)) {

      while(true) {
        try {
          // const VpcDeployment = await deploy(`VpcLevel${level}`, {
          //   from: deployer,
          //   contract: 'PERIv2',
          //   //args: [],
          //   log: true,
          //   deterministicDeployment: !turbo ? ethers.utils.formatBytes32String(`${MainnetSalt}-Level${level}`) : ethers.utils.formatBytes32String(`${TurboSalt}-Level${level}`)
          // });

          const VpcDeployment = await deploy(`VpcLevel${level}`, {
            from: deployer,
            contract: 'PERIv2',
            log: true,
            deterministicDeployment: mainnet ? ethers.utils.formatBytes32String(`${MainnetSalt}-Level${level}`) : turbo ? ethers.utils.formatBytes32String(`${TurboSalt}-Level${level}`) : ethers.utils.formatBytes32String(`${TestnetSalt}-Level${level}`),
            proxy: {
              proxyContract: 'UUPS',
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

}

export default func;
func.tags = [ 'VpcDeployment' ];
// module.exports.dependencies = ['example1'];