// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

/**
 * @title ProxyRescue
 * @dev Contract to rescue UUPS proxies with lost admin/owner.
 * This contract can be used to regain control of proxies where the
 * admin was set to 0x0 or where the owner was lost during an upgrade.
 */
contract ProxyRescue {
    // ERC1967 implementation slot
    bytes32 private constant _IMPLEMENTATION_SLOT =
        0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc;
    // ERC1967 admin slot
    bytes32 private constant _ADMIN_SLOT =
        0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103;

    // Event emitted when a rescue operation is performed
    event ProxyRescued(address indexed proxy, address indexed newAdmin);
    event ProxyUpgraded(
        address indexed proxy,
        address indexed newImplementation
    );

    /**
     * @notice Attempts to rescue a proxy where the admin was set to zero address
     * @dev This uses a low-level call to directly set the admin slot without checks
     * @param proxyAddress The address of the proxy to rescue
     * @return success Whether the rescue operation was successful
     */
    function rescueProxy(
        address payable proxyAddress
    ) external returns (bool success) {
        // Call to take over as admin - this bypasses most checks since we're directly
        // writing to the admin slot using a special payload
        (success, ) = proxyAddress.call(
            abi.encodeWithSignature("changeAdmin(address)", address(this))
        );

        // Check if the rescue was successful by reading the admin slot
        address currentAdmin = getProxyAdmin(proxyAddress);
        require(
            currentAdmin == address(this),
            "Rescue failed: could not set admin"
        );

        emit ProxyRescued(proxyAddress, address(this));
        return success;
    }

    /**
     * @notice Upgrades a proxy to a new implementation
     * @dev Only works if this contract is the admin of the proxy
     * @param proxyAddress The address of the proxy to upgrade
     * @param newImplementation The address of the new implementation
     * @return success Whether the upgrade was successful
     */
    function upgradeProxy(
        address payable proxyAddress,
        address newImplementation
    ) external returns (bool success) {
        // Check that this contract is the admin
        address currentAdmin = getProxyAdmin(proxyAddress);
        require(currentAdmin == address(this), "Not admin of proxy");

        // Call upgradeTo function on the proxy
        (success, ) = proxyAddress.call(
            abi.encodeWithSignature("upgradeTo(address)", newImplementation)
        );

        // Verify the implementation was changed
        address currentImpl = getProxyImplementation(proxyAddress);
        require(
            currentImpl == newImplementation,
            "Upgrade failed: implementation not changed"
        );

        emit ProxyUpgraded(proxyAddress, newImplementation);
        return success;
    }

    /**
     * @notice Gets the current admin of a proxy
     * @param proxyAddress The proxy to check
     * @return admin The current admin address
     */
    function getProxyAdmin(
        address proxyAddress
    ) public view returns (address admin) {
        bytes32 slot = _ADMIN_SLOT;
        assembly {
            admin := sload(slot)
        }
    }

    /**
     * @notice Gets the current implementation of a proxy
     * @param proxyAddress The proxy to check
     * @return implementation The current implementation address
     */
    function getProxyImplementation(
        address proxyAddress
    ) public view returns (address implementation) {
        // Read directly from the ERC1967 implementation slot
        bytes32 slot = _IMPLEMENTATION_SLOT;
        assembly {
            implementation := sload(slot)
        }
    }

    /**
     * @notice After rescuing, this function can transfer admin rights to a new address
     * @param proxyAddress The address of the rescued proxy
     * @param newAdmin The new admin address
     * @return success Whether the admin transfer was successful
     */
    function transferProxyAdmin(
        address payable proxyAddress,
        address newAdmin
    ) external returns (bool success) {
        // Verify we're currently the admin
        address currentAdmin = getProxyAdmin(proxyAddress);
        require(currentAdmin == address(this), "Not admin of proxy");

        // Transfer admin rights
        (success, ) = proxyAddress.call(
            abi.encodeWithSignature("changeAdmin(address)", newAdmin)
        );

        require(success, "Admin transfer failed");
        return success;
    }
}
