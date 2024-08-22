// SPDX-License-Identifier: MIT
pragma solidity >=0.8.7;

import "./access/MWOwnable.sol";

contract PeriFiAdmin is MWOwnable {
    uint256 public maximumLoanDuration = 53 weeks;
    uint256 public maximumNumberOfActiveLoans = 100;

    uint256 public poolCommissionIFPUpTo20 = 4000;
    uint256 public poolCommissionIFPUpTo30 = 4500;
    uint256 public poolCommissionIFPUpTo40 = 5000;
    uint256 public poolCommissionIFPUpTo50 = 5000;
    uint256 public poolCommissionIFPUpTo60 = 5500;
    uint256 public poolCommissionIFPUpTo70 = 6000;
    uint256 public poolCommissionIFPUpTo80 = 7000;
    uint256 public poolCommissionIFPUpTo90 = 8000;
    uint256 public poolCommissionIFPUpTo100 = 9000;

    uint256 public ivCommissionForIFP = 500; // 5%
    uint256 public commissionForIFL = 500;
    
    // uint256 public loanCommissionInBasisPoints = 500; // 5%
    uint256 public preLiquidationDuration = 24 hours;
    uint256 public claimCollateralDuration = 24 hours;
    uint256 public liquidateProtectionDuration = 48 hours;
    
    uint256 public liquidationThresholdInBasisPoints = 8000; // 80%
    
    function updateMaximumLoanDuration(uint256 _newMaximumLoanDuration) external onlyOwner {
        require(_newMaximumLoanDuration <= uint256(~uint32(0)), 'loan duration cannot exceed space alotted in struct');
        maximumLoanDuration = _newMaximumLoanDuration;
    }

    function updateMaximumNumberOfActiveLoans(uint256 _newMaximumNumberOfActiveLoans) external onlyOwner {
        maximumNumberOfActiveLoans = _newMaximumNumberOfActiveLoans;
    }
    function updatePoolCommission(uint256 leveragePercent, uint256 poolCommissionInBasisPoint) external onlyOwner {
        require(leveragePercent % 10 == 0, "leveragePercent must be multiples of 10");
        require(leveragePercent >= 20, "leveragePercent must be bigger than or equal to 20");
        require(leveragePercent <= 100, "leveragePercent must be smaller than or equal to 100");

        if (leveragePercent == 20){
            poolCommissionIFPUpTo20 = poolCommissionInBasisPoint;
        } else if (leveragePercent == 30){
            poolCommissionIFPUpTo30 = poolCommissionInBasisPoint;
        } else if (leveragePercent == 40){
            poolCommissionIFPUpTo40 = poolCommissionInBasisPoint;
        } else if (leveragePercent == 50){
            poolCommissionIFPUpTo50 = poolCommissionInBasisPoint;
        } else if (leveragePercent == 60){
            poolCommissionIFPUpTo60 = poolCommissionInBasisPoint;
        } else if (leveragePercent == 70){
            poolCommissionIFPUpTo70 = poolCommissionInBasisPoint;
        } else if (leveragePercent == 80){
            poolCommissionIFPUpTo80 = poolCommissionInBasisPoint;
        } else if (leveragePercent == 90){
            poolCommissionIFPUpTo90 = poolCommissionInBasisPoint;
        } else if (leveragePercent == 100){
            poolCommissionIFPUpTo100 = poolCommissionInBasisPoint;
        }
    }


    function updateIVCommissionForIFP(uint256 _newIVCommissionForIFP) external onlyOwner {
        require(_newIVCommissionForIFP <= 10000, 'By definition, basis points cannot exceed 10000');
        ivCommissionForIFP = _newIVCommissionForIFP;
        // emit InterestForIVUpdated(_newInterestForIVInBasisPoints);
    }

    function updateCommissionForIFL(uint256 _newCommissionForIFL) external onlyOwner {
        require(_newCommissionForIFL <= 10000, 'By definition, basis points cannot exceed 10000');
        commissionForIFL = _newCommissionForIFL;
        // emit InterestForIVUpdated(_newInterestForIVInBasisPoints);
    }
    

    function updateLiquidateProtectionDuration(uint256 _newLiquidateProtectionDuration) external onlyOwner {
        liquidateProtectionDuration = _newLiquidateProtectionDuration;
    }

    function updatePreLiquidationDuration(uint256 _newPreLiquidationDuration) external onlyOwner {
        preLiquidationDuration = _newPreLiquidationDuration;
    }
    function updateClaimCollateralDuration(uint256 _newClaimCollateralDuration) external onlyOwner {
        claimCollateralDuration = _newClaimCollateralDuration;
    }

    function updateLiquidationThreshold(uint256 _newLiquidationThresholdInBasisPoints) external onlyOwner {
        require(_newLiquidationThresholdInBasisPoints <= 10000, 'By definition, basis points cannot exceed 10000');
        liquidationThresholdInBasisPoints = _newLiquidationThresholdInBasisPoints;
        // emit InterestForIVUpdated(_newLiquidationThresholdInBasisPoints);
    }

    // function updateloanCommissionInBasisPoints(uint256 _newLoanCommissionInBasisPoints) external onlyOwner {
    //     require(_newLoanCommissionInBasisPoints <= 10000, 'By definition, basis points cannot exceed 10000');
    //     loanCommissionInBasisPoints = _newLoanCommissionInBasisPoints;
    //     // emit LoanCommissionUpdated(_newLoanCommissionInBasisPoints);
    // }
}
    // event InterestForIVUpdated(
    //     uint256 basisPointValue
    // );

    // event LoanCommissionUpdated(
    //     uint256 basisPointValue
    // );

    // event LiquidationThresholdUpdated(
    //     uint256 basisPointValue
    // );

    // event ProtectionDurationUpdated(
    //     uint256 durationInSeconds
    // );

    // event LiquidateDurationUpdated(
    //     uint256 durationInSeconds
    // );

    // event ERC20WhiteListConfigured(
    //     address erc20,
    //     bool isWhitelisted
    // );

    // event CollectionLeverageConfigured(
    //     address collection,
    //     bool isAllowed
    // );

    // event CollectionHealthFactorConfigured(
    //     address collection,
    //     bool isTrakcked
    // );

    // @notice A mapping from from an ERC20 currency address to whether that
    //         currency is whitelisted to be used by this contract.
    // mapping (address => bool) public erc20CurrencyIsWhitelisted;

    // mapping (address => bool) public leverageAvailableCollections;

    // mapping (address => bool) public healthFactorEnabledCollection;
    // @notice The percentage of interest earned by lenders on this platform
    //         that is taken by the contract admin's as a fee, measured in
    //         basis points (hundreths of a percent).
    
    // function whitelistERC20Currency(address _erc20Currency, bool _setAsWhitelisted) external onlyOwner {
    //     erc20CurrencyIsWhitelisted[_erc20Currency] = _setAsWhitelisted;
    //     emit ERC20WhiteListConfigured(_erc20Currency, _setAsWhitelisted);
    // }

    // function setLeverageOnCollection(address collection, bool allowed) external onlyOwner {
    //     leverageAvailableCollections[collection] = allowed;
    //     emit CollectionLeverageConfigured(collection, allowed);
    // }

    // function setHealthFactorOnCollection(address collection, bool tracked) external onlyOwner {
    //     healthFactorEnabledCollection[collection] = tracked;
    //     emit CollectionHealthFactorConfigured(collection, tracked);
    // }
