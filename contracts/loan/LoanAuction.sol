// SPDX-License-Identifier: MIT
pragma solidity >=0.8.7;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { AmountDeriver } from "../lib/AmountDeriver.sol";
import "../PeriFiAdmin.sol";
import "./LoanAuctionEnums.sol";
import "./LoanAuctionEventsAndErrors.sol";
import "./LoanAuctionStructs.sol";
import "./LoanRepaymentCalculator.sol";
import "../vault/Vault.sol";
import "../access/MWOwnable.sol";
import "hardhat/console.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract LoanAuction is
    ReentrancyGuard,
    AmountDeriver,
    LoanAuctionEventsAndErrors,
    UUPSUpgradeable,
    MWOwnable
{
    uint256 public auctionCount;
    mapping(uint256 => Auction) public auctions;
    mapping(uint256 => AuctionStatus) public status;
    mapping(uint256 => uint256) public bidAmounts;
    mapping(uint256 => address) public bidders;
    address public periFiAdminAddr;
    address public loanRepaymentAddr;
    uint256 public decrementInterval;

    function initialize(
        address _periFiAdminAddr,
        address _loanRepaymentAddr
    ) public virtual initializer {
        periFiAdminAddr = _periFiAdminAddr;
        loanRepaymentAddr = _loanRepaymentAddr;
        decrementInterval = 1 days;
        
        __MWOwnable_init();
    }

    // display current price

    // display price for borrower

    function beginAuction(
        AuctionParameters calldata params
    ) external virtual onlyOwner nonReentrant {
        Auction memory auction = Auction({
            id: auctionCount,
            protectedUntil: 0,
            parameters: params
        });

        address owner = IERC721(params.tokenAddress).ownerOf(params.tokenId);

        // We will assume auction contract will hold the defaulted collateral for ease of use.
        if (owner != address(this)) {
            revert CollateralOwnershipNotTransferred();
        }

        if (params.startAmount <= params.endAmount) {
            revert InvalidPriceRange(params.startAmount, params.endAmount);
        }

        if (params.startTime >= params.endTime) {
            revert InvalidTimeRange(params.startTime, params.endTime);
        }

        if (block.timestamp >= params.endTime) {
            revert InvalidTimeRange(params.startTime, params.endTime);
        }

        if (params.stepDownConfig.length != 0) {
            validateStepDownConfig(
                params.startTime,
                params.endTime,
                params.stepDownConfig
            );
        }

        // set liquidation protection expiration
        if (params.isProtected) {
            uint256 protection = PeriFiAdmin(periFiAdminAddr)
                .liquidateProtectionDuration();
            auction.protectedUntil = params.startTime + protection;
        }

        auctions[auctionCount] = auction;
        status[auctionCount] = AuctionStatus.Registered;
        auctionCount += 1;
        emit LoanAuctionBegun(
            auction.id,
            params.loanId,
            params.tokenAddress,
            params.paymentToken,
            params.loanBorrower,
            params.tokenId,
            params.startAmount,
            params.endAmount,
            params.startTime,
            params.endTime,
            auction.protectedUntil,
            params.loanRepaymentAmount,
            params.stepDownConfig
        );
    }

    function makeBid(
        uint256 auctionId
    ) external virtual nonReentrant returns (bool completed) {
        if (status[auctionId] != AuctionStatus.Registered) {
            revert AuctionInvalidStatus(auctionId, status[auctionId]);
        }

        uint256 currentPrice = currentBidPrice(auctionId);

        Auction memory item = auctions[auctionId];
        AuctionParameters memory params = item.parameters;

        if (item.protectedUntil > block.timestamp) {
            // hold the asset until the protection period is over
            IERC20(params.paymentToken).transferFrom(
                msg.sender,
                address(this),
                currentPrice
            );
            bidders[auctionId] = msg.sender;
            status[auctionId] = AuctionStatus.Protected;
            bidAmounts[auctionId] = currentPrice;
            emit LoanAuctionSoldAndProtected(
                auctionId,
                msg.sender,
                params.loanBorrower,
                currentPrice
            );
            return false;
        }

        IERC721(params.tokenAddress).transferFrom(
            address(this),
            msg.sender,
            params.tokenId
        );

        // transfer erc20 from this contract to all the recipients
        LoanRepaymentCalculator calculator = LoanRepaymentCalculator(
            loanRepaymentAddr
        );
        Repayment[] memory repayments = calculator.getDestinations(
            params.loanId,
            params.loanRepaymentAmount,
            params.loanAmount,
            params.lender
        );
        address insuranceVaultAddr = calculator.insuranceVaultAddress();
        IERC20 erc20 = IERC20(params.paymentToken);
        uint256 bidAmountLeft = currentPrice;
        uint256 insuranceLeft = erc20.balanceOf(insuranceVaultAddr);
        uint repaymentLength = repayments.length;
        for (uint idx = 0; idx < repaymentLength; idx++) {
            Repayment memory repaymentItem = repayments[idx];
            uint256 paymentLeft = repaymentItem.value;

            // cover the repayment from deposit amount from bid
            if (bidAmountLeft > 0) {
                if (bidAmountLeft >= paymentLeft) {
                    console.log(
                        "sending from %s to %s, %s",
                        msg.sender,
                        repaymentItem.targetAddress,
                        paymentLeft
                    );
                    erc20.transferFrom(
                        msg.sender,
                        repaymentItem.targetAddress,
                        paymentLeft
                    );
                    bidAmountLeft -= paymentLeft;
                    continue;
                }
                console.log(
                    "sending partial from %s to %s, %s",
                    msg.sender,
                    repaymentItem.targetAddress,
                    bidAmountLeft
                );
                erc20.transferFrom(
                    msg.sender,
                    repaymentItem.targetAddress,
                    bidAmountLeft
                );
                paymentLeft -= bidAmountLeft;
                bidAmountLeft = 0;
            }
            if (insuranceVaultAddr == repaymentItem.targetAddress) {
                continue;
            }

            // if not guaranteed, next
            if (!repaymentItem.guaranteed) {
                continue;
            }
            // if guaranteed, pay with insurance
            if (insuranceLeft >= paymentLeft) {
                console.log(
                    "sending from IV to %s, %s",
                    repaymentItem.targetAddress,
                    paymentLeft
                );

                Vault(payable(insuranceVaultAddr)).transferERC20(
                    params.paymentToken,
                    repaymentItem.targetAddress,
                    paymentLeft
                );
                insuranceLeft -= paymentLeft;
                continue;
            }

            // if insurance can't cover the current payment, pay what it has, and stop
            if (insuranceLeft > 0) {
                console.log(
                    "sending partial from IV to %s, %s",
                    repaymentItem.targetAddress,
                    insuranceLeft
                );
                Vault(payable(insuranceVaultAddr)).transferERC20(
                    params.paymentToken,
                    repaymentItem.targetAddress,
                    insuranceLeft
                );
            }
            break;
        }
        if (bidAmountLeft > 0) {
            console.log(
                "sending from %s to %s, %s",
                msg.sender,
                params.loanBorrower,
                bidAmountLeft
            );
            erc20.transferFrom(msg.sender, params.loanBorrower, bidAmountLeft);
        }
        emit LoanAuctionSoldToBidder(auctionId, msg.sender, currentPrice);
        status[auctionId] = AuctionStatus.SoldToBidder;
        return true;
    }

    function claim(uint256 auctionId) external virtual nonReentrant {
        if (status[auctionId] != AuctionStatus.Protected) {
            revert AuctionInvalidStatus(auctionId, status[auctionId]);
        }

        Auction memory item = auctions[auctionId];

        AuctionParameters memory params = item.parameters;

        if (block.timestamp < item.protectedUntil) {
            revert ProtectionNotOver();
        }

        IERC721(params.tokenAddress).transferFrom(
            address(this),
            msg.sender,
            params.tokenId
        );
        status[auctionId] = AuctionStatus.SoldToBidder;
        uint256 bidAmount = bidAmounts[auctionId];
        address bidder = bidders[auctionId];

        // transfer erc20 from this contract to all the recipients
        LoanRepaymentCalculator calculator = LoanRepaymentCalculator(
            loanRepaymentAddr
        );
        Repayment[] memory repayments = calculator.getDestinations(
            params.loanId,
            params.loanRepaymentAmount,
            params.loanAmount,
            params.lender
        );

        address insuranceVaultAddr = calculator.insuranceVaultAddress();
        IERC20 erc20 = IERC20(params.paymentToken);
        uint256 bidAmountLeft = bidAmount;
        uint256 insuranceLeft = erc20.balanceOf(insuranceVaultAddr);
        uint repaymentLength = repayments.length;
        for (uint idx = 0; idx < repaymentLength; idx++) {
            Repayment memory repaymentItem = repayments[idx];
            uint256 paymentLeft = repaymentItem.value;

            // cover the repayment from deposit amount from bid
            if (bidAmountLeft > 0) {
                if (bidAmountLeft >= paymentLeft) {
                    console.log(
                        "sending from %s to %s, %s",
                        address(this),
                        repaymentItem.targetAddress,
                        paymentLeft
                    );
                    erc20.transfer(repaymentItem.targetAddress, paymentLeft);
                    bidAmountLeft -= paymentLeft;
                    continue;
                }
                console.log(
                    "sending partial from %s to %s, %s",
                    address(this),
                    repaymentItem.targetAddress,
                    bidAmountLeft
                );
                erc20.transfer(repaymentItem.targetAddress, bidAmountLeft);
                paymentLeft -= bidAmountLeft;
                bidAmountLeft = 0;
            }
            if (insuranceVaultAddr == repaymentItem.targetAddress) {
                continue;
            }
            // if not guaranteed, next
            if (!repaymentItem.guaranteed) {
                continue;
            }
            // if guaranteed, pay with insurance
            if (insuranceLeft >= paymentLeft) {
                console.log(
                    "sending from IV to %s, %s",
                    repaymentItem.targetAddress,
                    paymentLeft
                );
                Vault(payable(insuranceVaultAddr)).transferERC20(
                    params.paymentToken,
                    repaymentItem.targetAddress,
                    paymentLeft
                );
                insuranceLeft -= paymentLeft;
                continue;
            }

            // if insurance can't cover the current payment, pay what it has, and stop
            if (insuranceLeft > 0) {
                console.log(
                    "sending partial from IV to %s, %s",
                    repaymentItem.targetAddress,
                    insuranceLeft
                );
                Vault(payable(insuranceVaultAddr)).transferERC20(
                    params.paymentToken,
                    repaymentItem.targetAddress,
                    insuranceLeft
                );
            }
            break;
        }
        if (bidAmountLeft > 0) {
            console.log(
                "sending from %s to %s, %s",
                address(this),
                params.loanBorrower,
                bidAmountLeft
            );
            erc20.transfer(params.loanBorrower, bidAmountLeft);
        }
        emit LoanAuctionSoldToBidder(auctionId, bidder, bidAmount);
    }

    function payout(uint256 auctionId) external virtual nonReentrant {
        AuctionStatus currentStatus = status[auctionId];

        if (
            currentStatus != AuctionStatus.Registered &&
            currentStatus != AuctionStatus.Protected
        ) {
            revert AuctionInvalidStatus(auctionId, currentStatus);
        }

        Auction memory item = auctions[auctionId];
        AuctionParameters memory params = item.parameters;

        if (msg.sender != params.loanBorrower) {
            revert NotAuthorized();
        }

        // check auction's protection period has been expired
        if (block.timestamp > item.protectedUntil) {
            revert ProtectionOver();
        }

        uint256 repayment = params.loanRepaymentAmount;
        uint256 penalty = 0;
        if (currentStatus == AuctionStatus.Protected) {
            uint bidAmount = bidAmounts[auctionId];
            penalty = (bidAmount * 5) / 100;
            IERC20(params.paymentToken).transferFrom(
                msg.sender,
                bidders[auctionId],
                penalty
            );
            IERC20(params.paymentToken).transfer(bidders[auctionId], bidAmount);
            bidAmounts[auctionId] = 0;
        }
        uint256 fullRepayment = repayment + penalty;
        IERC721(params.tokenAddress).transferFrom(
            address(this),
            msg.sender,
            params.tokenId
        );

        LoanRepaymentCalculator calculator = LoanRepaymentCalculator(
            loanRepaymentAddr
        );
        Repayment[] memory repayments = calculator.getDestinations(
            params.loanId,
            params.loanRepaymentAmount,
            params.loanAmount,
            params.lender
        );
        IERC20 erc20 = IERC20(params.paymentToken);
        uint repaymentLength = repayments.length;
        for (uint idx = 0; idx < repaymentLength; idx++) {
            Repayment memory repaymentItem = repayments[idx];
            erc20.transferFrom(
                msg.sender,
                repaymentItem.targetAddress,
                repaymentItem.value
            );
        }
        status[auctionId] = AuctionStatus.SoldToBorrower;
        emit LoanAuctionCancelledByPayout(auctionId, msg.sender, fullRepayment);
    }

    function currentDebt(uint256 auctionId) public virtual view returns (uint256 debt) {
        AuctionStatus currentStatus = status[auctionId];

        if (
            currentStatus != AuctionStatus.Registered &&
            currentStatus != AuctionStatus.Protected
        ) {
            return 0;
        }

        Auction memory item = auctions[auctionId];
        AuctionParameters memory params = item.parameters;

        if (msg.sender != params.loanBorrower) {
            return 0;
        }

        uint256 repayment = params.loanRepaymentAmount;
        uint256 penalty = 0;
        if (currentStatus == AuctionStatus.Protected) {
            uint bidAmount = bidAmounts[auctionId];
            penalty = (bidAmount * 5) / 100;
        }
        return repayment + penalty;
    }

    function currentBidPrice(
        uint256 auctionId
    ) public view returns (uint256 amount) {
        if (status[auctionId] != AuctionStatus.Registered) {
            return 0;
        }

        Auction memory item = auctions[auctionId];
        AuctionParameters memory params = item.parameters;
        if (params.stepDownConfig.length == 0) {
            // no stepDown
            return
                _locateCurrentAmount(
                    params.startAmount,
                    params.endAmount,
                    params.startTime,
                    params.endTime,
                    true
                );
        }

        // stepDown
        return
            _locateCurrentStepDownAmount(
                params.startAmount,
                params.endAmount,
                params.startTime,
                params.stepDownConfig,
                true
            );
    }

    function validateStepDownConfig(
        uint256 startTime,
        uint256 endTime,
        bytes memory config
    ) internal virtual view {
        if (config.length <= 0) {
            revert InvalidStepDownConfig();
        }

        uint accDecrement;
        uint8 actualLength;
        uint length = config.length;
        for (uint idx = 0; idx < length; idx++) {
            uint8 decrement = uint8(config[idx]);
            if (decrement == 255) {
                break;
            }
            accDecrement += decrement;
            actualLength++;
        }

        uint256 duration = endTime - startTime;
        uint256 minDuration = uint256(actualLength * decrementInterval);
        uint256 maxDuration = uint256((actualLength + 2) * decrementInterval);
        if (duration <= minDuration) {
            revert StepDownConfigAndAuctionTimeMismatch();
        }
        if (duration >= maxDuration) {
            revert StepDownConfigAndAuctionTimeMismatch();
        }
    }

    function updateDecrementInterval(uint256 intervalInSec) public {
        require(intervalInSec != 0, "interval must be non-zero value");
        decrementInterval = intervalInSec;
    }

    function _locateCurrentStepDownAmount(
        uint256 startAmount,
        uint256 endAmount,
        uint256 startTime,
        bytes memory stepDownConfig,
        bool roundUp
    ) internal virtual view returns (uint256 amount) {
        // Only modify end amount if it doesn't already equal start amount.
        if (startAmount != endAmount) {
            // Declare variables to derive in the subsequent unchecked scope.
            uint256 duration;
            uint256 elapsed;
            uint256 remaining;

            uint256 elapsedTs;
            uint accDecrement;
            uint totalDecrement;
            // Skip underflow checks as startTime <= block.timestamp < endTime.
            unchecked {
                // Derive the duration for the order and place it on the stack.
                // duration = endTime - startTime;

                // Derive time elapsed since the order started & place on stack.
                elapsedTs = block.timestamp - startTime;

                // Derive time remaining until order expires and place on stack.
                // remaining = duration - elapsed;
            }
            uint256 daysPassed = elapsedTs / decrementInterval;
            uint length = stepDownConfig.length;
            for (uint idx = 0; idx < length; idx++) {
                uint8 decrement = uint8(stepDownConfig[idx]);
                if (decrement == 255) {
                    break;
                }
                if (idx < daysPassed) {
                    accDecrement += decrement;
                }
                totalDecrement += decrement;
            }
            duration = totalDecrement;
            elapsed = accDecrement;
            remaining = duration - elapsed;
            // Aggregate new amounts weighted by time with rounding factor.
            uint256 totalBeforeDivision = ((startAmount * remaining) +
                (endAmount * elapsed));

            // Use assembly to combine operations and skip divide-by-zero check.
            assembly {
                // Multiply by iszero(iszero(totalBeforeDivision)) to ensure
                // amount is set to zero if totalBeforeDivision is zero,
                // as intermediate overflow can occur if it is zero.
                amount := mul(
                    iszero(iszero(totalBeforeDivision)),
                    // Subtract 1 from the numerator and add 1 to the result if
                    // roundUp is true to get the proper rounding direction.
                    // Division is performed with no zero check as duration
                    // cannot be zero as long as startTime < endTime.
                    add(
                        div(sub(totalBeforeDivision, roundUp), duration),
                        roundUp
                    )
                )
            }

            // Return the current amount.
            return amount;
        }

        // Return the original amount as startAmount == endAmount.
        return endAmount;
    }

    function _authorizeUpgrade(address) internal virtual override onlyOwner {}
}
