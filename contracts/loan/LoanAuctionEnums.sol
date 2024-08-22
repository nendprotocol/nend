// SPDX-License-Identifier: MIT
pragma solidity >=0.8.7;

enum AuctionStatus {
    NotRegistered,
    Registered,
    Protected,
    SoldToBidder,
    SoldToBorrower
}

enum RecipientType {
    LendingPool,
    Lender,
    Commission,
    Borrower
}