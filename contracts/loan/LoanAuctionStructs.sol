// SPDX-License-Identifier: MIT
pragma solidity >=0.8.7;

import "./LoanAuctionEnums.sol";

struct AuctionParameters {
    uint256 loanId;
    address tokenAddress;
    address paymentToken;
    uint256 tokenId;
    uint256 startAmount;
    uint256 endAmount;
    uint256 startTime;
    uint256 endTime;
    bytes stepDownConfig;
    address loanBorrower;
    uint256 loanAmount;
    uint256 loanRepaymentAmount;
    address lender;
    bool isProtected;
}


struct PaymentRecipients {
    address recipient;
    uint256 amount;
    RecipientType recipientType;
}

struct Auction {
    uint256 id;
    uint256 protectedUntil;
    AuctionParameters parameters;
}