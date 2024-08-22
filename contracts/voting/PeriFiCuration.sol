// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "../helpers/SignatureHelper.sol";
import "../vault/Vault.sol";
import "./ScenarioOneV2.sol";
import "../access/MWOwnable.sol";
import "../token/ERC20/NEND.sol";
import "./ScenarioOneV2.sol";
import "./interfaces/ICuration.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract PeriFiCuration is ICuration, MWOwnable, UUPSUpgradeable {
    using SignatureHelper for bytes32;

    // Curation hash => votes
    mapping(bytes32 => Vote[]) public votes;
    mapping(bytes32 => uint48) public curationHashToEndTime;
    mapping(bytes32 => bool) public curationHashToEnded;
    address[4] public vpcAddresses;
    Vault public rewardPool;

    NEND public nend;

    function initialize(
        Vault _rewardPool,
        NEND _rewardToken,
        address[4] memory _vpcAddresses
    ) public virtual initializer {
        require(_vpcAddresses.length == 4, "Invalid number of vpc addresses");
        rewardPool = _rewardPool;
        nend = _rewardToken;
        vpcAddresses = _vpcAddresses;

        __MWOwnable_init();
    }

    function setRewardPool(Vault _rewardPool) external virtual onlyOwner {
        rewardPool = _rewardPool;
    }

    function setNend(NEND _nend) external virtual onlyOwner {
        nend = _nend;
    }

    function setVPCAddress(
        uint8 _level,
        address _address
    ) external virtual onlyOwner {
        vpcAddresses[_level - 1] = _address;
    }

    function setVPCAddresses(
        address[4] memory _addresses
    ) external virtual onlyOwner {
        vpcAddresses = _addresses;
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
    ) external virtual override {
        bytes32 messageHash = keccak256(
            abi.encodePacked(_curationEnd, msg.sender, _curationHash)
        );

        require(block.timestamp <= _curationEnd, "Curation ended");

        require(
            messageHash.recoverSigner(_signature) == owner(),
            "Invalid signature"
        );

        require(_cardLevel >= 1 && _cardLevel < 5, "Invalid card level");

        require(
            PERIv2(vpcAddresses[_cardLevel - 1]).revealChecked(_cardId),
            "Card not releaved"
        );

        if (curationHashToEndTime[_curationHash] != 0) {
            require(
                curationHashToEndTime[_curationHash] == _curationEnd,
                "Curation end mismatch"
            );
        } else {
            curationHashToEndTime[_curationHash] = _curationEnd;
        }

        for (uint256 i = 0; i < votes[_curationHash].length; i++) {
            if (votes[_curationHash][i].voter == msg.sender) {
                revert("Already voted");
            }
        }

        require(
            vpcAddresses[_cardLevel - 1] != address(0),
            "VPC address not set"
        );

        IERC721(vpcAddresses[_cardLevel - 1]).transferFrom(
            msg.sender,
            address(rewardPool),
            _cardId
        );

        uint48 voteTime = uint48(block.timestamp);

        votes[_curationHash].push(
            Vote(
                _accept,
                _bet,
                _leverageLending,
                false,
                false,
                _loanAmount,
                _duration,
                _apr,
                _cardLevel,
                _cardId,
                voteTime,
                msg.sender,
                0
            )
        );

        emit VoteCasted(
            _accept,
            _bet,
            _leverageLending,
            _loanAmount,
            _duration,
            _apr,
            _cardLevel,
            _cardId,
            voteTime,
            _curationHash,
            msg.sender
        );
    }

    function redeemVpc(bytes32 _curationHash) external virtual override {
        Vote[] storage _votes = votes[_curationHash];

        for (uint256 i = 0; i < _votes.length; i++) {
            Vote storage _vote = _votes[i];
            if (_vote.voter == msg.sender && _vote.vpcRedeemable) {
                _vote.vpcRedeemable = false;
                rewardPool.transferERC721(
                    vpcAddresses[_vote.cardLevel - 1],
                    _vote.voter,
                    _vote.cardId
                );

                emit VPCRedeemed(_curationHash, msg.sender);
                return;
            }
        }

        revert("No vote valid for vpc redeem");
    }

    function endCuration(
        EndCurationArgs memory args
    ) external virtual override onlyOwner {
        require(!curationHashToEnded[args.curationHash], "Curation ended");

        require(
            curationHashToEndTime[args.curationHash] == 0 ||
                block.timestamp >= curationHashToEndTime[args.curationHash],
            "Curation end time not reached"
        );

        curationHashToEnded[args.curationHash] = true;

        // No vote for the curation was casted on this chain
        if (curationHashToEndTime[args.curationHash] == 0) {
            return;
        }

        Vote[] storage _votes = votes[args.curationHash];

        uint256[] memory values = new uint256[](5); // numCardsRedeemed, numVotersRewarded, redeemIdx, rewardIdx, burnAmount

        for (uint256 i = 0; i < _votes.length; i++) {
            Vote memory _vote = _votes[i];

            if (
                args.rejected ||
                !_vote.bet ||
                _vote.loanAmount == args.winningOption
            ) {
                values[0]++;
            }

            if (
                !args.rejected &&
                _vote.bet &&
                _vote.loanAmount == args.winningOption
            ) {
                values[1]++;
            }
        }

        address[] memory votersCardRedeemable = new address[](values[0]);
        address[] memory votersRewarded = new address[](values[1]);
        uint256[] memory rewards = new uint256[](values[1]);

        for (uint256 i = 0; i < _votes.length; i++) {
            Vote storage _vote = _votes[i];

            if (
                args.rejected ||
                !_vote.bet ||
                _vote.loanAmount == args.winningOption
            ) {
                _vote.vpcRedeemable = true;
                votersCardRedeemable[values[2]++] = _vote.voter;
            }

            if (!args.rejected && _vote.bet) {
                // Reward winning votes with NEND
                if (_vote.loanAmount == args.winningOption) {
                    _vote.reward = rewards[values[3]] =
                        (_vote.cardLevel * args.totalRewards) /
                        args.winningPower;
                    votersRewarded[values[3]++] = _vote.voter;
                }
                // Burn NEND from losing votes
                else {
                    values[4] += PERIv2(vpcAddresses[_vote.cardLevel - 1])
                        .MINT_PRICE();
                }
                // End result on all chains: Total Burned == Total rewarded => Change in supply = 0
            }
        }

        if (values[4] > 0) {
            uint256 poolBalance = IERC20Upgradeable(nend).balanceOf(
                address(rewardPool)
            );
            rewardPool.burn(
                address(nend),
                values[4] > poolBalance ? poolBalance : values[4]
            );
        }

        emit CurationEnded(
            args.curationHash,
            votersCardRedeemable,
            votersRewarded,
            rewards
        );
    }

    function claimReward(
        bytes32 _curationHash,
        bytes memory _signature
    ) external virtual {
        bytes32 messageHash = keccak256(
            abi.encodePacked(msg.sender, _curationHash)
        );

        require(
            messageHash.recoverSigner(_signature) == owner(),
            "Invalid signature"
        );

        Vote[] storage _votes = votes[_curationHash];

        for (uint256 i = 0; i < _votes.length; i++) {
            if (_votes[i].voter != msg.sender) {
                continue;
            }

            Vote storage _vote = _votes[i];

            require(!_vote.rewardsClaimed, "Already claimed");
            require(_vote.reward > 0, "No reward");
            _vote.rewardsClaimed = true;

            nend.mint(msg.sender, _vote.reward);
            emit RewardClaimed(_curationHash, msg.sender);
            return;
        }

        revert("Not voted");
    }

    function getVoteCount(
        bytes32 _curationHash
    ) external view virtual override returns (uint256) {
        return votes[_curationHash].length;
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}
}
