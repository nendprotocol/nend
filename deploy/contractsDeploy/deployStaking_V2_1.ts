import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction, Deployment } from "hardhat-deploy/types";
const { ethers } = require("hardhat");
import version from "../version";
import retry from "../retry";

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

  const NendDeployment: DeploymentExt = await deployments.get("NEND");
  const VaultLendingPoolDeployment: DeploymentExt = await deployments.get(
    "VaultLendingPool"
  );
  const ExistingStakingDeployment: DeploymentExt = await deployments.get(
    "Staking"
  );

  while (true) {
    try {
      // Deploy the new implementation
      const StakingImplDeployment = await deploy(
        "LendingPoolStakingV2_Implementation",
        {
          from: deployer,
          contract: "LendingPoolStakingV2",
          args: [],
          log: true,
        }
      );

      // Upgrade the existing proxy to point to the new implementation
      await execute(
        "Staking",
        { from: deployer, log: true },
        "upgradeTo",
        StakingImplDeployment.address
      );

      // Call the migration function to migrate the data
      await execute(
        "Staking",
        { from: deployer, log: true },
        "migrateStakesToMapping"
      );

      console.log("Successfully upgraded Staking contract and migrated data");
      break;
    } catch (err) {
      console.log(err);
      console.log("Transaction failed");
      await retry();
    }
  }
};

export default func;
func.tags = ["StakingUpgrade_V2"];
module.exports.dependencies = ["NendDeployment", "VaultDeployment"];
