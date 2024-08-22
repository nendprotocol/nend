// SPDX-License-Identifier: MIT
pragma solidity >=0.8.7;

import "./LoanAuctionEnums.sol";

interface LoanAuctionEventsAndErrors{
    error InvalidStepDownConfig();
    error StepDownConfigOverflow();
    error IncompleteStepDownConfig();
    error StepDownConfigAndAuctionTimeMismatch();
    
    error CollateralOwnershipNotTransferred();
    error AuctionInvalidStatus(uint256 auctionId, AuctionStatus status);
    error AuctionNotRegistered();
    error ProtectionNotOver();
    error ProtectionOver();
    error InvalidPriceRange(uint256 startAmount, uint256 endAmount);
    error InvalidTimeRange(uint256 startTime, uint256 endTime);
    error NotAuthorized();

    event LoanAuctionBegun(uint256 indexed auctionId, uint256 loanId, 
        address tokenAddr, address paymentToken, 
        address loanBorrower, uint256 tokenId, uint256 startAmount, uint256 endAmount,
        uint256 startTime, uint256 endTime, uint256 protectedUntil, uint256 loanRepaymentAmount,
        bytes stepDownConfig);
    event LoanAuctionSoldAndProtected(uint256 indexed auctionId, address bidder, address borrower, uint256 bidAmount);
    event LoanAuctionSoldToBidder(uint256 indexed auctionId, address bidder, uint256 bidAmount);
    event LoanAuctionCancelledByPayout(uint256 indexed auctionId, address borrower, uint256 payout);
}