// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.0;

interface INoteKeeper {
    // Info for market note
    struct Note {
        uint256 payout; // Total NEND to be paid
        uint256 payoutPerVesting; // Amount claimable every vesting
        uint48 created; // time note was created
        uint48 marketID; // market ID of deposit. uint48 to avoid adding a slot.
        uint8 vestingCount; // Number of times vested
    }

    event NoteCreated(
        address ownerAddress,
        uint48 marketId,
        uint256 noteId,
        uint256 amount,
        uint256 price,
        uint256 payout,
        uint256 payoutPerVesting,
        uint48 created
    );

    event NotesRedeemed(
        address ownerAddress,
        uint256[] indexes,
        uint8[] vestingCount,
        uint256[] totalVested
    );

    function redeem(uint256[] memory _indexes) external returns (uint256);

    function redeemAll(uint256 _marketId) external returns (uint256);
}
