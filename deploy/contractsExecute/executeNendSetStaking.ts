import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction, Deployment } from 'hardhat-deploy/types';
import version from '../version';
import retry from '../retry';
import inquirer from 'inquirer';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, getChainId } = hre;
  const { deploy, execute } = deployments;
  const { deployer } = await getNamedAccounts();
  const ChainId = await getChainId();

   async function promptUser (question: string): Promise<string> {
    try {
      const answers = await inquirer.prompt([{
        type: 'input', name: 'response', message: question
      }]);
      return answers.response;
    } catch (error) {
      console.error('Error during user prompt:', error);
      return 'no';
    }
  }
  interface DeploymentExt extends Deployment {
      newlyDeployed?: boolean;
  }

  const mainnet = version.mainnet;
  const turbo = version.turbo;
  const MainnetSalt = `nend-mainnet-v${version.number}`;
  const TestnetSalt = `nend-testnet-v${version.number}`;
  const TurboSalt = `nend-turbo-v${version.number}`;

  const NendDeployment : DeploymentExt = await deployments.get('NEND');
  const StakingDeployment : DeploymentExt = await deployments.get((ChainId === '137' ? 'StakingPool' : 'Staking'));
  console.log(`Found NEND at: ${NendDeployment.address}`);
  console.log(`Found Staking at: ${StakingDeployment.address}`);

  const shouldExecute = await promptUser('Would you like to set staking address to NEND? (yes/no): ');
  if (shouldExecute.toLowerCase() !== 'yes') {
    console.log('executing setStaking skipped.');
    return;
  }

  if (NendDeployment.newlyDeployed === undefined || StakingDeployment.newlyDeployed === undefined) {
    while (true) {
      try {
        const NendDeploymentDeploymentSetStaking = await execute('NEND',
          { from: deployer, log: true },
          'setStaking', StakingDeployment.address
        );
        break;
      } catch (err) {
        console.log(err);
        console.log('Transaction failed');
        await retry();
      }
    }
  }
};

export default func;
func.tags = ['NendSetStaking'];
module.exports.dependencies = ['NendDeployment', 'StakingDeployment'];
module.exports.runAtTheEnd = true;
