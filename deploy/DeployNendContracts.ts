
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction, Deployment} from 'hardhat-deploy/types';
import version from './version';
import { ContractAddresses, ChainNames} from './models/chain'
// import { VaultProxyAddresses} from './models/vaultProxy'
import VpcLevels from './models/vpcLevels';
import {saveToDb} from './nendSave';
const {ethers} = require("hardhat");
import * as readline from 'readline';

let rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function check() {
  return new Promise<void>(resolve => {
    rl.question('Press any key to continue', (answer) => {
      switch(answer.toLowerCase()) {
        default:
      }

      resolve();
    });
  });
}

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

    console.log (mainnet ? `${MainnetSalt}` : turbo ? `${TurboSalt}` : `${TestnetSalt}`);

    const NendDeployment = await deployments.get('NEND');
    ContractAddresses[`nendAddress`].address = NendDeployment.address;
    
    const ERC721FactoryDeployment = await deployments.get('ERC721Factory');
    ContractAddresses[`collectionFactoryAddress`].address = ERC721FactoryDeployment.address;

    const ConduitControllerDeployment = await deployments.get('ConduitController');
    const ConsiderationDeployment = await deployments.get('Consideration');
    ContractAddresses[`marketplaceAddress`].address = ConsiderationDeployment.address;

    var vpc: {[key:string]:Deployment} = {};
    for (const [level] of Object.entries(VpcLevels)) {
        vpc[`VpcLevel${level}Deployment`] = await deployments.get(`VpcLevel${level}`);
        ContractAddresses[`vpc${level}Address`].address = vpc[`VpcLevel${level}Deployment`].address;
    }
 
    const VaultComissionPoolDeployment = await deployments.get('VaultComissionPool');
    ContractAddresses[`commissionPoolAddress`].address = VaultComissionPoolDeployment.address;
    const VaultLendingPoolDeployment = await deployments.get('VaultLendingPool');
    ContractAddresses[`lendingPoolAddress`].address = VaultLendingPoolDeployment.address;
    const VaultCurationRewardPoolDeployment = await deployments.get('VaultCurationRewardPool');
    ContractAddresses[`curationRewardAddress`].address = VaultCurationRewardPoolDeployment.address;
    const VaultInsuranceVaultDeployment = await deployments.get('VaultInsuranceVault');
    ContractAddresses[`insuranceVaultAddress`].address = VaultInsuranceVaultDeployment.address;
    const VaultEcosystemFundDeployment = await deployments.get('VaultEcosystemFund');
    ContractAddresses[`ecosystemFundAddress`].address = VaultEcosystemFundDeployment.address;

    const VPCBridgeDeployment = await deployments.get('VPCBridge');
    ContractAddresses[`vpcBridgeAddress`].address = VPCBridgeDeployment.address;

    const PeriFiAdminDeployment = await deployments.get('PeriFiAdmin');
    ContractAddresses[`adminAddress`].address = PeriFiAdminDeployment.address;
    const TrustDeedDeployment = await deployments.get('TrustDeed');
    ContractAddresses[`trustDeedAddress`].address = TrustDeedDeployment.address;

    const BondDepositoryDeployment = await deployments.get('BondDepository');
    ContractAddresses[`bondingAddress`].address = BondDepositoryDeployment.address;
    const StakingDeployment = await deployments.get('Staking');
    ContractAddresses[`lendingPoolStakingAddress`].address = StakingDeployment.address;
    const LiquidityPoolStakingDeployment = await deployments.get('LiquidityPoolStaking');
    ContractAddresses[`liquidityPoolStakingAddress`].address = LiquidityPoolStakingDeployment.address;
    const PeriFiCurationDeployment = await deployments.get('PeriFiCuration');
    ContractAddresses[`curationAddress`].address = PeriFiCurationDeployment.address;

    // const VaultProxyIfpDeployment = await deployments.get('VaultProxyIfp');
    // VaultProxyAddresses['Ifp'].address = VaultProxyIfpDeployment.address;
    // const VaultProxyTcDeployment = await deployments.get('VaultProxyTc');
    // VaultProxyAddresses['Tc'].address = VaultProxyTcDeployment.address;
    // const VaultProxyIflDeployment = await deployments.get('VaultProxyIfl');
    // VaultProxyAddresses['Ifl'].address = VaultProxyIflDeployment.address;

    const LoanRepaymentCalculatorDeployment = await deployments.get('LoanRepaymentCalculator');
    const LoanAuctionDeployment = await deployments.get('LoanAuction');
    ContractAddresses[`auctionAddress`].address = LoanAuctionDeployment.address;
    const PeriFiLoanDeployment = await deployments.get('PeriFiLoan');
    ContractAddresses[`loanAddress`].address = PeriFiLoanDeployment.address;

    console.log(`-----------------------------------------------------------------------------------------------------------------`);
    console.log(`----------------------- Deployed to Chain: ${ChainId} Mainnet: ${mainnet} Turbo: ${turbo} Version: ${version.number} --------------------`);
    console.log(``);
    console.log(`NendDeployment.address:                    ${NendDeployment.address}`);
    console.log(``);
    console.log(`ERC721FactoryDeployment.address:           ${ERC721FactoryDeployment.address}`);
    console.log(`ConduitControllerDeployment.address:       ${ConduitControllerDeployment.address}`);
    console.log(`ConsiderationDeployment.address:           ${ConsiderationDeployment.address}`);
    console.log(``);  
    for (const [level] of Object.entries(VpcLevels)) {
        console.log(`VpcLevel${level}Deployment.address:               ${vpc[`VpcLevel${level}Deployment`].address}`);
    }
    console.log(``);
    console.log(`VPCBridgeDeployment.address:               ${VPCBridgeDeployment.address}`);
    console.log(``);
    console.log(`VaultComissionPoolDeployment.address:      ${VaultComissionPoolDeployment.address}`);
    console.log(`VaultLendingPoolDeployment.address:        ${VaultLendingPoolDeployment.address}`);
    console.log(`VaultCurationRewardPoolDeployment.address: ${VaultCurationRewardPoolDeployment.address}`);
    console.log(`VaultInsuranceVaultDeployment.address:     ${VaultInsuranceVaultDeployment.address}`); 
    console.log(`VaultEcosystemFundDeployment.address:      ${VaultEcosystemFundDeployment.address}`); 
    console.log(``);  
    console.log(`PeriFiAdminDeployment.address:             ${PeriFiAdminDeployment.address}`);
    console.log(``);  
    console.log(`TrustDeedDeployment.address:               ${TrustDeedDeployment.address}`); 
    console.log(``);  
    console.log(`LoanRepaymentCalculatorDeployment.address: ${LoanRepaymentCalculatorDeployment.address}`);   
    console.log(`LoanAuctionDeployment.address:             ${LoanAuctionDeployment.address}`);
    console.log(`PeriFiLoanDeployment.address:              ${PeriFiLoanDeployment.address}`);
    console.log(``); 
    console.log(`BondDepositoryDeployment.address:          ${BondDepositoryDeployment.address}`);
    console.log(``); 
    console.log(`StakingDeployment.address:                 ${StakingDeployment.address}`);  
    console.log(``); 
    console.log(`LiquidityPoolStakingDeployment.address:    ${LiquidityPoolStakingDeployment.address}`);  
    console.log(``); 
    console.log(`PeriFiCurationDeployment.address:          ${PeriFiCurationDeployment.address}`); 
    // console.log(``); 
    // console.log(`VaultProxyIfpDeployment.address:           ${VaultProxyIfpDeployment.address}`);   
    // console.log(`VaultProxyTcDeployment.address:            ${VaultProxyTcDeployment.address}`);   
    // console.log(`VaultProxyIflDeployment.address:           ${VaultProxyIflDeployment.address}`);  
    console.log(``);
    console.log(``); 

    
    console.log(`Saving Nend Contracts from Chain: ${ChainId}`);
    console.log(`Mainnet: ${mainnet}`);
    console.log(`Turbo: ${turbo}`);
    console.log(`Version: ${version.number}`);
    console.log(`Database: ${process.env.POSTGRES_DB}`);
    await check();
    // await saveToDb(ChainId, ContractAddresses, VaultProxyAddresses);
    await saveToDb(ChainId, ContractAddresses);

}

export default func;
func.tags = [ 'DeployNendContracts' ];
func.dependencies = [
'NendDeployment',
'ERC721FactoryDeployment',
'ConduitControllerDeployment',
'ConsiderationDeployment',
'DummyS2Deployment',
'DummyTicketDeployment',
'VpcDeployment',
'VaultDeployment',
'VPCBridgeDeployment',
'PeriFiAdminDeployment',
'TrustDeedDeployment',
'BondDepositoryDeployment',
'StakingDeployment',
'LiquidityPoolStakingDeployment',
'PeriFiCurationDeployment',
// 'VaultProxyDeployment', not used
'LoanRepaymentCalculatorDeployment',
'LoanAuctionDeployment',
'PeriFiLoanDeployment',

// -- functions


// 'NendSetInflationAmount', not used
'NendReset',
'NendAuthorize',
'NendSetStaking',
'NendMint',
'VpcInitialize',
'DummyTicketMint',
// 'VaultProxyInitialize', not used
'VaultAuthorize',
// 'VaultAuthorizeVaultProxy', not used
'TrustDeedAuthorize',
'TrustDeedSetLoan',
'TrustDeedSetAdmin',
'TurboChecks'
];