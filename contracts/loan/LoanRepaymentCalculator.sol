// SPDX-License-Identifier: MIT
pragma solidity >=0.8.7;

import "../PeriFiAdmin.sol";
import "../vault/LendingPool.sol";

enum DestinationType {
    Pool,
    Lender,
    InsuranceVault,
    Commission,
    CurationRewardPool
}

struct Repayment {
    address targetAddress;
    uint256 value;
    bool guaranteed;
}


contract LoanRepaymentCalculator {
    address public insuranceVaultAddress;
    address public lendingPoolAddress;
    address public masterWalletAddress;
    address public periFiAdminAddress;
    address public curationRewardPoolAddress;

    constructor(
        address _insuranceVaultAddress,
        address _lendingPoolAddress,
        address _masterWalletAddress,
        address _periFiAdminAddress,
        address _curationRewardPoolAddress) {
        insuranceVaultAddress = _insuranceVaultAddress;
        lendingPoolAddress = _lendingPoolAddress;
        masterWalletAddress = _masterWalletAddress;
        periFiAdminAddress = _periFiAdminAddress;
        curationRewardPoolAddress = _curationRewardPoolAddress;
    }

    function getDestinations(
        uint256 loanId,
        uint256 repaymentAmount, 
        uint256 loanAmount,
        address lender
    ) external view returns (Repayment[] memory results) {
        uint256 interestDue = repaymentAmount - loanAmount;

        LendingPool lendingPool = LendingPool(payable(lendingPoolAddress));
        uint256 leverageAmount = lendingPool.loanToLeverage(loanId);

        // if there is no interest
        if (interestDue == 0) {
            if (leverageAmount == 0){
                results = new Repayment[](1);
                results[0] = Repayment(lender, loanAmount, false);
            } else {
                results = new Repayment[](2);
                results[0] = Repayment(lendingPoolAddress, leverageAmount, true);
                results[1] = Repayment(lender, loanAmount - leverageAmount, false);
            }
            return results;
        }

        uint256 interestForPool = interestDue * leverageAmount / loanAmount;
        uint256 interestForLender = interestDue - interestForPool;
        uint256 loanAmountByLender = loanAmount - leverageAmount;

        uint256 lenderForIFL;
        uint256 commissionForIFL;
        uint256 curationRewardForIFL;

        (
            lenderForIFL, 
            commissionForIFL, 
            curationRewardForIFL
        ) = distributeIFL(interestForLender);

        if (leverageAmount == 0) {
            // no leverage Used, only need to get InterestForLender (IFL)
            results = new Repayment[](3);
            results[0] = Repayment(lender, loanAmountByLender + lenderForIFL, false);
            results[1] = Repayment(masterWalletAddress, commissionForIFL, false);
            results[2] = Repayment(curationRewardPoolAddress, curationRewardForIFL, true);
        } else {
            PeriFiAdmin periFiAdmin = PeriFiAdmin(periFiAdminAddress);

            uint256 poolUsageInBasisPoints = lendingPool.loanToPoolUsageInBasisPoint(loanId);
            uint256 ivCommissionForIFP = periFiAdmin.ivCommissionForIFP();

            uint256 commissionBasisPoint = poolCommissionInBasisPointByPoolUsage(poolUsageInBasisPoints);
            
            uint256 poolForIFP = interestForPool * commissionBasisPoint / 10000;
            uint256 insuranceVaultForIFP = interestForPool * ivCommissionForIFP / 10000;
            uint256 lenderForIFP = interestForPool - (poolForIFP + insuranceVaultForIFP);

            results = new Repayment[](7);
            results[0] = Repayment(lendingPoolAddress, leverageAmount, true);
            results[1] = Repayment(lender, loanAmountByLender, false);
            results[2] = Repayment(lendingPoolAddress, poolForIFP, false);
            results[3] = Repayment(lender, lenderForIFP + lenderForIFL, false);
            results[4] = Repayment(curationRewardPoolAddress, curationRewardForIFL, true);
            results[5] = Repayment(insuranceVaultAddress, insuranceVaultForIFP, false);
            results[6] = Repayment(masterWalletAddress, commissionForIFL, false);
        }
    }

    function distributeIFL(
        uint256 interestForLender) internal view returns (
            uint256 lenderForIFL,
            uint256 commissionForIFL,
            uint256 curationRewardForIFL
        ) {
            PeriFiAdmin periFiAdmin = PeriFiAdmin(periFiAdminAddress);
            uint256 commissionInBasisPoints = periFiAdmin.commissionForIFL();
            if (commissionInBasisPoints < 100) {
                commissionInBasisPoints = 100; // to ensure curation reward commission
            }
            // no leverage Used, only need to get InterestForLender (IFL)
            uint256 totalCommission = interestForLender * commissionInBasisPoints / 10000;
            curationRewardForIFL = interestForLender / 100; // take 1%
            commissionForIFL = totalCommission - curationRewardForIFL;
            lenderForIFL = interestForLender - totalCommission;
        }

    function poolCommissionInBasisPointByPoolUsage(uint256 poolUsageInBasisPoints) internal view returns (uint256 basisPoint) {
            PeriFiAdmin periFiAdmin = PeriFiAdmin(periFiAdminAddress);
            if (poolUsageInBasisPoints <= 2000) {
                basisPoint = periFiAdmin.poolCommissionIFPUpTo20();
            }
            else if (poolUsageInBasisPoints <= 3000) {
                basisPoint = periFiAdmin.poolCommissionIFPUpTo30();
            }
            else if (poolUsageInBasisPoints <= 4000) {
                basisPoint = periFiAdmin.poolCommissionIFPUpTo40();
            }
            else if (poolUsageInBasisPoints <= 5000) {
                basisPoint = periFiAdmin.poolCommissionIFPUpTo50();
            }
            else if (poolUsageInBasisPoints <= 6000) {
                basisPoint = periFiAdmin.poolCommissionIFPUpTo60();
            }
            else if (poolUsageInBasisPoints <= 7000) {
                basisPoint = periFiAdmin.poolCommissionIFPUpTo70();
            }
            else if (poolUsageInBasisPoints <= 8000) {
                basisPoint = periFiAdmin.poolCommissionIFPUpTo80();
            }
            else if (poolUsageInBasisPoints <= 9000) {
                basisPoint = periFiAdmin.poolCommissionIFPUpTo90();
            }
            else {
                basisPoint = periFiAdmin.poolCommissionIFPUpTo100();
            }
            return basisPoint;
    }

}