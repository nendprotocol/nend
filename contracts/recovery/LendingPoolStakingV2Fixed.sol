// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "../staking/LendingPoolStakingV2.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title LendingPoolStakingV2Fixed
 * @dev Extended contract that inherits from LendingPoolStakingV2 but adds
 * rescue functionality to restore contract state after a failed upgrade
 */
contract LendingPoolStakingV2Fixed is LendingPoolStakingV2 {
    using Address for address;

    /**
     * @notice Rescue function to fix the owner state variable
     * @dev This uses assembly to directly modify the storage slot where the owner is stored
     * @param newOwner The address that should be set as the owner
     * @param nendToken The address of the NEND token
     * @param _lendingPool The address of the lending pool
     */
    function rescueInitialize(
        address newOwner,
        address nendToken,
        address _lendingPool
    ) external {
        // Only allow this function to be called if owner is 0x0
        // This prevents this function from being used maliciously
        require(owner() == address(0), "Owner already set");

        // Set the owner directly using assembly
        assembly {
            // OwnableUpgradeable typically stores the owner at slot 0
            sstore(0, newOwner)
        }

        // Re-initialize the token and lending pool references if needed
        // Contracts could lose references to other contracts during a failed upgrade
        if (address(nend) == address(0) && nendToken != address(0)) {
            nend = nendToken;
        }

        if (address(lendingPool) == address(0) && _lendingPool != address(0)) {
            lendingPool = Vault(payable(_lendingPool));
        }

        // Re-initialize any other crucial state variables if needed
        // This might need to be customized based on what state was lost
    }

    /**
     * @notice Emergency function to fix the owner and other critical state variables
     * @dev This is a more direct approach using assembly
     * @param newOwner The address that should be set as the owner
     * @param slotValues An array of values to write directly to specific storage slots
     * @param slotIndexes An array of storage slot indexes where to write the values
     */
    function emergencyStateRecovery(
        address newOwner,
        bytes32[] calldata slotValues,
        uint256[] calldata slotIndexes
    ) external {
        // Safety check
        require(
            slotValues.length == slotIndexes.length,
            "Arrays length mismatch"
        );

        // Only allow if owner is zero or this is already owned by the upgrader
        require(
            owner() == address(0) || owner() == msg.sender,
            "Not authorized"
        );

        // Set the owner
        if (newOwner != address(0)) {
            assembly {
                sstore(0, newOwner)
            }
        }

        // Set other storage slots as needed
        for (uint256 i = 0; i < slotValues.length; i++) {
            bytes32 value = slotValues[i];
            uint256 slot = slotIndexes[i];

            assembly {
                sstore(slot, value)
            }
        }
    }
}
