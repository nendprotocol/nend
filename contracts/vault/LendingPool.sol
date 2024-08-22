// SPDX-License-Identifier: MIT
pragma solidity >=0.8.7;

import "./Vault.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

error NotSufficientBalanceInPool(
    uint256 loanId,
    uint256 balance,
    uint256 requested
);
error IllegalLeverageAccess(address sender, uint256 loanId, uint256 requested);
error AlreadyLeveragedLoan(uint256 loanId);

contract LendingPool is Vault, ReentrancyGuardUpgradeable {
    address public loanAddress;

    mapping(uint256 => bool) public leveragedLoan;

    mapping(uint256 => uint256) public loanToLeverage;

    mapping(uint256 => uint256) public loanToPoolUsageInBasisPoint;

    function initialize(
        string memory name
    ) public virtual override initializer {
        __Vault_init(name);
        __MWOwnable_init();
        __ReentrancyGuard_init();
    }

    function leverageLoan(
        uint256 loanId,
        address paymentToken,
        uint256 leveragedAmount,
        address borrower
    ) external virtual nonReentrant onlyRole("spender") {
        if (leveragedLoan[loanId]) {
            revert AlreadyLeveragedLoan(loanId);
        }

        if (leveragedAmount == 0) {
            leveragedLoan[loanId] = true;
            return;
        }

        IERC20 erc20 = IERC20(paymentToken);
        uint256 balance = erc20.balanceOf(address(this));

        if (balance < leveragedAmount) {
            revert NotSufficientBalanceInPool(loanId, balance, leveragedAmount);
        }

        erc20.transfer(borrower, leveragedAmount);
        uint256 poolUsageInBasisPoint = (leveragedAmount * 10000) / balance;
        loanToLeverage[loanId] = leveragedAmount;
        loanToPoolUsageInBasisPoint[loanId] = poolUsageInBasisPoint;
        leveragedLoan[loanId] = true;
    }
}
