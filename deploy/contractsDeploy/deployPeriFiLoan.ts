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

    const PeriFiAdminDeployment : DeploymentExt = await deployments.get('PeriFiAdmin');
    const LoanRepaymentCalculatorDeployment : DeploymentExt = await deployments.get('LoanRepaymentCalculator');
    const LoanAuctionDeployment : DeploymentExt = await deployments.get('LoanAuction');
    const TrustDeedDeployment : DeploymentExt = await deployments.get('TrustDeed');

    while(true) {
        try {
          // const PeriFiLoanDeployment = await deploy('PeriFiLoan', {
          //   from: deployer,
          //   contract: 'PeriFiLoan',
          //   args: [PeriFiAdminDeployment.address, LoanRepaymentCalculatorDeployment.address, LoanAuctionDeployment.address, TrustDeedDeployment.address],
          //   log: true,
          //   deterministicDeployment: mainnet ? ethers.utils.formatBytes32String(`${MainnetSalt}`) : turbo ? ethers.utils.formatBytes32String(`${TurboSalt}`) : ethers.utils.formatBytes32String(`${TestnetSalt}`)
          // });

          const PeriFiLoanDeployment = await deploy('PeriFiLoan', {
            from: deployer,
            contract: 'PeriFiLoan',
            log: true,
            deterministicDeployment: mainnet ? ethers.utils.formatBytes32String(`${MainnetSalt}`) : turbo ? ethers.utils.formatBytes32String(`${TurboSalt}`) : ethers.utils.formatBytes32String(`${TestnetSalt}`),
            proxy: {
              proxyContract: 'UUPS',
              execute: {
                // init: {
                  methodName: 'initialize',
                  args: [PeriFiAdminDeployment.address, LoanRepaymentCalculatorDeployment.address, LoanAuctionDeployment.address, TrustDeedDeployment.address],
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
func.tags = [ 'PeriFiLoanDeployment' ];
module.exports.dependencies = [ 'PeriFiAdminDeployment', 'LoanRepaymentCalculatorDeployment', 'LoanAuctionDeployment', 'TrustDeedDeployment' ];