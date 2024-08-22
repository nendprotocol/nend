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

    interface DeploymentExt extends Deployment {
        newlyDeployed?: boolean; 
    }

    const mainnet = version.mainnet;
    const turbo = version.turbo;
    const MainnetSalt = `nend-mainnet-v${version.number}`;
    const TestnetSalt = `nend-testnet-v${version.number}`;
    const TurboSalt = `nend-turbo-v${version.number}`;

    const NendDeployment : DeploymentExt = await deployments.get('NEND');
    const DummyS2Deployment : DeploymentExt = await deployments.get('DummyS2');
    const DummyTicketDeployment : DeploymentExt = await deployments.get('DummyTicket');
    const VaultCurationRewardPoolDeployment : DeploymentExt = await deployments.get('VaultCurationRewardPool');

    for (const [level, vpcPrice] of Object.entries(vpcLevels)) {
        const VpcDeployment : DeploymentExt = await deployments.get(`VpcLevel${level}`);

        if (VpcDeployment.newlyDeployed === undefined ) {  

            while(true) {
                try {
                  const VpcLevel1DeploymentInitialize = await execute(`VpcLevel${level}`,
                    {from: deployer, log: true},
                    'initialize', `VPC Level ${level}`, `VPC${level}`, NendDeployment.address, DummyTicketDeployment.address, ethers.utils.parseEther(`${vpcPrice.price}`)
                  );
                  break;
                }catch(err) {
                  console.log(err);
                  console.log('Transaction failed');
                  await retry();
                }
            }

            while(true) {
                try {
                  const VpcLevel1DeploymentSetNextScenarioConnect = await execute(`VpcLevel${level}`,
                    {from: deployer, log: true},
                    'setNextScenarioConenct', DummyS2Deployment.address
                  );
                  break;
                }catch(err) {
                  console.log(err);
                  console.log('Transaction failed');
                  await retry();
                }
            }

            while(true) {
                try {
                  const VpcLevel1DeploymentSetPublicMintState = await execute(`VpcLevel${level}`,
                    {from: deployer, log: true},
                    'setPublicMintState', ChainId === '5' ? true : false
                  );
                  break;
                }catch(err) {
                  console.log(err);
                  console.log('Transaction failed');
                  await retry();
                }
            }

            while(true) {
              try {
                const VpcLevel1DeploymentSetPublicMintState = await execute(`VpcLevel${level}`,
                  {from: deployer, log: true},
                  'setTicketMintState', true
                );
                break;
              }catch(err) {
                console.log(err);
                console.log('Transaction failed');
                await retry();
              }
            }

            while(true) {
                try {
                  const VpcLevel1DeploymentSetRevealState = await execute(`VpcLevel${level}`,
                    {from: deployer, log: true},
                    'setRevealState', true
                  );
                  break;
                }catch(err) {
                  console.log(err);
                  console.log('Transaction failed');
                  await retry();
                }
            }

            while(true) {
                try {
                  const VpcLevel1DeploymentSetBaseURI = await execute(`VpcLevel${level}`,
                    {from: deployer, log: true},
                    'setBaseURI', "ipfs://bafybeigf5w2ko6cck7kj5r7tk3syo5rthbrpuqqgfzzzvxkdsjyixnjqtu/"
                  );
                  break;
                }catch(err) {
                  console.log(err);
                  console.log('Transaction failed');
                  await retry();
                }
            }

            while(true) {
                try {
                  const VpcLevel1DeploymentSetNotRevealedURI = await execute(`VpcLevel${level}`,
                    {from: deployer, log: true},
                    'setNotRevealedURI', "ipfs://bafkreifxwss6pzw6ybcqojxkl6uo6us6wuqpibt6gh6opxe2x3vhavmdau/"
                  );
                  break;
                }catch(err) {
                  console.log(err);
                  console.log('Transaction failed');
                  await retry();
                }
            }

            while(true) {
              try {
                const VpcLevel1DeploymentAuthorize = await execute(`VpcLevel${level}`,
                  {from: deployer, log: true},
                  'authorize', deployer, "deployer", true
                );
                break;
              }catch(err) {
                console.log(err);
                console.log('Transaction failed');
                await retry();
              }
          }

            while(true) {
                try {
                  const VpcLevel1DeploymentTransferOwnership = await execute(`VpcLevel${level}`,
                    {from: deployer, log: true},
                    'transferOwnership', VaultCurationRewardPoolDeployment.address
                  );
                  break;
                }catch(err) {
                  console.log(err);
                  console.log('Transaction failed');
                  await retry();
                }
            }

        }

    };

}

export default func;
func.tags = [ 'VpcInitialize' ];
module.exports.dependencies = ['VpcDeployment', 'NendDeployment', 'DummyS2Deployment', 'DummyTicketDeployment', 'VaultDeployment'];
module.exports.runAtTheEnd = true;