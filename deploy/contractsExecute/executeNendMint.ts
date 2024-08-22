import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction, Deployment} from 'hardhat-deploy/types';
const {ethers} = require("hardhat");
import version from '../version';
import NendInflationAmounts from '../models/nendInflation';
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
    const LiquidityPoolStakingDeployment : DeploymentExt = await deployments.get('LiquidityPoolStaking');
    const VaultEcosystemFundDeployment : DeploymentExt = await deployments.get('VaultEcosystemFund');

    if (ChainId === '5' || ChainId === '80001' || ChainId === "31337") {
      if(NendDeployment.newlyDeployed === undefined || LiquidityPoolStakingDeployment.newlyDeployed === undefined ) {

          while(true) {
              try {
                const NendMintLiquidityPoolStaking = await execute('NEND',
                  {from: deployer, log: true},
                  'mint', LiquidityPoolStakingDeployment.address, ethers.utils.parseEther("20000000")
                );	
                break;
              }catch(err) {
                console.log(err);
                console.log('Transaction failed');
                await retry();
              }
          }

      }

      if(NendDeployment.newlyDeployed === undefined || VaultEcosystemFundDeployment.newlyDeployed === undefined ) {

        while(true) {
            try {
              const NendMintLiquidityPoolStaking = await execute('NEND',
                {from: deployer, log: true},
                'mint', VaultEcosystemFundDeployment.address, ethers.utils.parseEther("50000000")
              );	
              break;
            }catch(err) {
              console.log(err);
              console.log('Transaction failed');
              await retry();
            }
        }

    }
  }

}

export default func;
func.tags = [ 'NendMint' ];
module.exports.dependencies = ['NendDeployment', 'LiquidityPoolStakingDeployment', 'VaultDeployment'];
module.exports.runAtTheEnd = true;