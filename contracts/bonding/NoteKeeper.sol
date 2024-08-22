// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.0;

import "./INoteKeeper.sol";
import "../token/ERC20/NEND.sol";
import "../vault/Vault.sol";

abstract contract NoteKeeper is INoteKeeper, Testing {
    mapping(address => Note[]) public notes; // user deposit data
    address public insurancePool;
    address public ecosystemPool;
    address public nend;
    uint8 public totalVestingCount;
    uint16 public commissionRate;
    uint48 public vestingInverval;
    uint48 public testVestingInverval;

    function __NoteKeeper_init(
        address _nend,
        address _insurancePool,
        address _ecosystemPool
    ) internal virtual onlyInitializing {
        nend = _nend;
        insurancePool = _insurancePool;
        ecosystemPool = _ecosystemPool;
        totalVestingCount = 5; // 5 times in 5 days
        commissionRate = 30; // Commission in basis point
        vestingInverval = 1 days;
        testVestingInverval = 10 minutes;
    }

    // if treasury address changes on authority, update it
    function updateNend(address _nend) external onlyOwner {
        nend = _nend;
    }

    function updateInsurancePool(address _insurancePool) external onlyOwner {
        insurancePool = _insurancePool;
    }

    function updateEcosystemPool(address _ecosystemPool) external onlyOwner {
        ecosystemPool = _ecosystemPool;
    }

    function updateCommissionRate(uint16 _commissionRate) external onlyOwner {
        require(
            _commissionRate >= 0 && _commissionRate <= 10000,
            "Invalid basis point"
        );
        commissionRate = _commissionRate;
    }

    /* ========== ADD ========== */

    /**
     * @notice             adds a new Note for a user, stores the front end & DAO rewards, and mints & stakes payout & rewards
     * @param _marketId    id of the market that created the note
     * @param _amount      amount of quote token bonded
     * @param _price       the bond price
     * @param _user        the user that owns the Note
     * @param _payout      the amount of NEND due to the user
     * @return index_      the index of the Note in the user's array
     */
    function addNote(
        uint48 _marketId,
        uint256 _amount,
        uint256 _price,
        address _user,
        uint256 _payout
    ) internal virtual returns (uint256 index_) {
        require(
            IERC20(nend).balanceOf(ecosystemPool) >= _payout,
            "Insufficient treasury balance for payout"
        );

        Vault(payable(ecosystemPool)).transferERC20(
            nend,
            address(this),
            _payout
        );

        uint256 insuranceFund = (_payout * commissionRate) / 10000;
        uint256 userPayout = _payout - insuranceFund;

        index_ = notes[_user].length;

        // the new note is pushed to the user's array
        notes[_user].push(
            Note({
                payout: userPayout,
                payoutPerVesting: userPayout / 5,
                created: uint48(block.timestamp),
                marketID: _marketId,
                vestingCount: 0
            })
        );

        IERC20(nend).transfer(insurancePool, insuranceFund);

        emit NoteCreated(
            msg.sender,
            _marketId,
            index_,
            _amount,
            _price,
            userPayout,
            userPayout / 5,
            uint48(block.timestamp)
        );
    }

    /* ========== REDEEM ========== */

    /**
     * @notice             redeem notes for user
     * @param _indexes     the note indexes to redeem
     * @return payout_     sum of payout sent, in NEND
     */
    function redeem(
        uint256[] memory _indexes
    ) public virtual override returns (uint256 payout_) {
        require(_indexes.length > 0, "Nothing to redeem");

        uint8[] memory vestingCount = new uint8[](_indexes.length);
        uint256[] memory totalVested = new uint256[](_indexes.length);

        for (uint256 i = 0; i < _indexes.length; i++) {
            Note storage note = notes[msg.sender][_indexes[i]];
            uint8 pendingVestingCount = getPendingVestingCount(
                msg.sender,
                _indexes[i]
            );

            require(pendingVestingCount > 0, "No pending vesting");

            note.vestingCount += pendingVestingCount;
            payout_ += note.payoutPerVesting * pendingVestingCount;

            vestingCount[i] = note.vestingCount;
            totalVested[i] = note.vestingCount * note.payoutPerVesting;
        }

        IERC20(nend).transfer(msg.sender, payout_);
        emit NotesRedeemed(msg.sender, _indexes, vestingCount, totalVested);
    }

    /**
     * @notice             redeem all redeemable markets for user
     * @dev                if possible, query indexesFor() off-chain and input in redeem() to save gas
     * @return             sum of payout sent, in NEND
     */
    function redeemAll(
        uint256 _marketId
    ) external virtual override returns (uint256) {
        return redeem(indexesFor(msg.sender, _marketId));
    }

    /* ========== VIEW ========== */

    // Note info

    /**
     * @notice             all pending notes for user
     * @param _user        the user to query notes for
     * @param _marketId    the market to query notes for
     * @return             the pending notes for the user
     */
    function indexesFor(
        address _user,
        uint256 _marketId
    ) internal view virtual returns (uint256[] memory) {
        Note[] memory info = notes[_user];

        uint256 length;
        for (uint256 i = 0; i < info.length; i++) {
            if (
                info[i].marketID == _marketId &&
                getPendingVestingCount(_user, i) > 0
            ) length++;
        }

        uint256[] memory indexes = new uint256[](length);
        uint256 position;

        for (uint256 i = 0; i < info.length; i++) {
            if (
                info[i].marketID == _marketId &&
                getPendingVestingCount(_user, i) > 0
            ) {
                indexes[position] = i;
                position++;
            }
        }

        return indexes;
    }

    function getPendingVestingCount(
        address _owner,
        uint256 _noteId
    ) internal view virtual returns (uint8) {
        Note memory note = notes[_owner][_noteId];

        // Max vesting
        if (note.vestingCount == totalVestingCount) {
            return 0;
        }

        uint256 secondsElapsed = block.timestamp - note.created;
        uint256 invervalsElapsed = secondsElapsed /
            (testing ? testVestingInverval : vestingInverval);

        return
            uint8(
                invervalsElapsed > totalVestingCount
                    ? totalVestingCount
                    : invervalsElapsed
            ) - note.vestingCount;
    }
}
