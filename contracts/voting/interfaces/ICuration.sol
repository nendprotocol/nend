// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

interface ICuration {
    event VoteCasted(
        bool accept,
        bool bet,
        bool leverageLending,
        uint8 loanAmount,
        uint8 duration,
        uint8 apr,
        uint8 cardLevel,
        uint256 cardId,
        uint48 voteTime,
        bytes32 curationHash,
        address voter
    );

    event CurationEnded(
        bytes32 curationHash,
        address[] votersRedeemableCard,
        address[] votersRewarded,
        uint256[] rewards
    );

    event VPCRedeemed(bytes32 curationHash, address voter);
    event RewardClaimed(bytes32 curationHash, address voter);

    struct Vote {
        bool accept;
        bool bet;
        bool leverageLending;
        bool vpcRedeemable;
        bool rewardsClaimed;
        uint8 loanAmount;
        uint8 duration;
        uint8 apr;
        uint8 cardLevel;
        uint256 cardId;
        uint48 voteTime;
        address voter;
        uint256 reward;
    }

    struct EndCurationArgs {
        bytes32 curationHash;
        bool rejected;
        uint8 winningOption;
        uint256 totalRewards;
        uint256 winningPower;
    }

    function castVote(
        bool _accept,
        bool _bet,
        bool _leverageLending,
        uint8 _loanAmount,
        uint8 _duration,
        uint8 _apr,
        uint8 _cardLevel,
        uint256 _cardId,
        uint48 _curationEnd,
        bytes32 _curationHash,
        bytes memory _signature
    ) external;

    function redeemVpc(bytes32 _curationHash) external;

    function endCuration(EndCurationArgs memory _args) external;

    function getVoteCount(bytes32 _curationHash)
        external
        view
        returns (uint256);
}
