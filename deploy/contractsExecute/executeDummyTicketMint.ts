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

    const DummyTicketDeployment : DeploymentExt = await deployments.get('DummyTicket');
    const VPCBridgeDeployment : DeploymentExt = await deployments.get('VPCBridge');

    if (DummyTicketDeployment.newlyDeployed === undefined || VPCBridgeDeployment.newlyDeployed === undefined) {  
        while(true) {
            try {
              const DummyTicketDeploymentMint = await execute('DummyTicket',
                {from: deployer, log: true},
                'mint', VPCBridgeDeployment.address, ethers.utils.parseEther("40000")
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
func.tags = [ 'DummyTicketMint' ];
module.exports.dependencies = ['DummyTicketDeployment', 'VPCBridgeDeployment'];
module.exports.runAtTheEnd = true;