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

    const VaultLendingPoolDeployment : DeploymentExt = await deployments.get('VaultLendingPool');
    const VaultCurationRewardPoolDeployment : DeploymentExt = await deployments.get('VaultCurationRewardPool');
    const VaultInsuranceVaultDeployment : DeploymentExt = await deployments.get('VaultInsuranceVault');
    const VaultEcosystemFundDeployment : DeploymentExt = await deployments.get('VaultEcosystemFund');
    const LoanAuctionDeployment : DeploymentExt = await deployments.get('LoanAuction');
    const PeriFiLoanDeployment : DeploymentExt = await deployments.get('PeriFiLoan');
    const StakingDeployment: DeploymentExt  = await deployments.get('Staking');
    const PeriFiCurationDeployment : DeploymentExt = await deployments.get('PeriFiCuration');
    const VPCBridgeDeployment : DeploymentExt = await deployments.get('VPCBridge');
    const BondDepositoryDeployment : DeploymentExt = await deployments.get('BondDepository');    

    if (VaultInsuranceVaultDeployment.newlyDeployed === undefined || PeriFiLoanDeployment.newlyDeployed === undefined ) {

        while(true) {
            try {
              const VaultInsuranceVaultAuthorizePeriFiLoan = await execute('VaultInsuranceVault',
                {from: deployer, log: true},
                'authorize', PeriFiLoanDeployment.address, 'spender', true
              );
              break;
            }catch(err) {
              console.log(err);
              console.log('Transaction failed');
              await retry();
            }
        }

    }

    if (VaultInsuranceVaultDeployment.newlyDeployed === undefined || LoanAuctionDeployment.newlyDeployed === undefined ) {

        while(true) {
            try {
              const VaultInsuranceVaultAuthorizeLoanAuction = await execute('VaultInsuranceVault',
                {from: deployer, log: true},
                'authorize', LoanAuctionDeployment.address, 'spender', true
              );
              break;
            }catch(err) {
              console.log(err);
              console.log('Transaction failed');
              await retry();
            }
        }

    }

    if (VaultLendingPoolDeployment.newlyDeployed === undefined || PeriFiLoanDeployment.newlyDeployed === undefined ) {

        while(true) {
            try {
              const VaultLendingPoolAuthorizePeriFiLoan = await execute('VaultLendingPool',
                {from: deployer, log: true},
                'authorize', PeriFiLoanDeployment.address, 'spender', true
              );
              break;
            }catch(err) {
              console.log(err);
              console.log('Transaction failed');
              await retry();
            }
        }

    }

    if (VaultLendingPoolDeployment.newlyDeployed === undefined || LoanAuctionDeployment.newlyDeployed === undefined) {  

        while(true) {
            try {
              const VaultLendingPoolAuthorizeLoanAuction = await execute('VaultLendingPool',
                {from: deployer, log: true},
                'authorize', LoanAuctionDeployment.address, 'spender', true
              );
              break;
            }catch(err) {
              console.log(err);
              console.log('Transaction failed');
              await retry();
            }
        }

    } 
 
    if (VaultLendingPoolDeployment.newlyDeployed === undefined || StakingDeployment.newlyDeployed === undefined) {  

        while(true) {
            try {
              const VaultLendingPoolAuthorizeStaking = await execute('VaultLendingPool',
                {from: deployer, log: true},
                'authorize', StakingDeployment.address, 'spender', true
              );
              break;
            }catch(err) {
              console.log(err);
              console.log('Transaction failed');
              await retry();
            }
        }

    } 

    if (VaultCurationRewardPoolDeployment.newlyDeployed === undefined || PeriFiCurationDeployment.newlyDeployed === undefined) {  

        while(true) {
            try {
              const VaultCurationRewardPoolAuthorizePeriFiCuration = await execute('VaultCurationRewardPool',
                {from: deployer, log: true},
                'authorize', PeriFiCurationDeployment.address, 'spender', true
              );
              break;
            }catch(err) {
              console.log(err);
              console.log('Transaction failed');
              await retry();
            }
        }

    }

    if (VaultCurationRewardPoolDeployment.newlyDeployed === undefined || VPCBridgeDeployment.newlyDeployed === undefined) {  

      while(true) {
          try {
            const VaultCurationRewardPoolAuthorizeVPCBridge = await execute('VaultCurationRewardPool',
              {from: deployer, log: true},
              'authorize', VPCBridgeDeployment.address, 'spender', true
            );
            break;
          }catch(err) {
            console.log(err);
            console.log('Transaction failed');
            await retry();
          }
      }

  }

  if (VaultEcosystemFundDeployment.newlyDeployed === undefined || BondDepositoryDeployment.newlyDeployed === undefined) {  

    while(true) {
        try {
          const VaultEcosystemFundAuthorizeBondDepository = await execute('VaultEcosystemFund',
            {from: deployer, log: true},
            'authorize', BondDepositoryDeployment.address, 'spender', true
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

export default func;
func.tags = [ 'VaultAuthorize' ];
module.exports.dependencies = ['VaultDeployment', 'LoanAuctionDeployment', 'PeriFiLoanDeployment', 'StakingDeployment', 'PeriFiCurationDeployment', 'VPCBridgeDeployment'];
module.exports.runAtTheEnd = true;