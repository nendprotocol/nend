// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/vrf/VRFConsumerBaseV2.sol";
import "../access/MWOwnable.sol";

contract Gamification is VRFConsumerBaseV2, MWOwnable {
    event WinningOptionsSettled(bytes32[] curationHashes, uint8[] winningOptions);

    VRFCoordinatorV2Interface COORDINATOR;

    uint64 public subscriptionId;

    address public vrfCoordinator;

    bytes32 public keyHash;

    uint32 public callbackGasLimitPerWord = 200000;

    uint16 public requestConfirmations = 1;

    // 0 = Not settled
    // 1-5 = Settled (1-indexed, subtract 1 to get actuall off chain winning option)
    mapping(bytes32 => uint8) public hashToWinningOption;

    mapping(uint256 => bytes32[]) internal requestIdToHashes;

    constructor(uint64 _subscriptionId, address _vrfCoordinator, bytes32 _keyHash) VRFConsumerBaseV2(vrfCoordinator) {
        COORDINATOR = VRFCoordinatorV2Interface(_vrfCoordinator);
        subscriptionId = _subscriptionId;
        vrfCoordinator = _vrfCoordinator;
        keyHash = _keyHash;
    }

    function setCoordinator(address _vrfCoordinator) external onlyOwner {
        vrfCoordinator = _vrfCoordinator;
        COORDINATOR = VRFCoordinatorV2Interface(vrfCoordinator);
    }

    function setKeyHash(bytes32 _keyHash) external onlyOwner {
        keyHash = _keyHash;
    }

    function setCallbackGasLimitPerWord(uint32 _gasLimit) external onlyOwner {
        callbackGasLimitPerWord = _gasLimit;
    }

    function setRequestConfirmations(uint16 _confirmationCount)
        external
        onlyOwner
    {
        requestConfirmations = _confirmationCount;
    }

    // Assumes the subscription is funded sufficiently.
    function requestCurationWinningOption(bytes32[] memory hashes)
        external
        onlyOwner
    {
        uint32 numHashes = uint32(hashes.length);

        require(
            numHashes > 0 && numHashes <= 500,
            "Invalid number of random words requested"
        );

        for (uint256 i = 0; i < hashes.length; i++) {
            require(
                hashToWinningOption[hashes[i]] == 0,
                "Curation winning option already settled"
            );
        }

        // Will revert if subscription is not set and funded.
        uint256 requestId = COORDINATOR.requestRandomWords(
            keyHash,
            subscriptionId,
            requestConfirmations,
            callbackGasLimitPerWord * numHashes,
            numHashes
        );

        requestIdToHashes[requestId] = hashes;
    }

    function fulfillRandomWords(uint256 requestId, uint256[] memory randomWords)
        internal
        override
    {
        bytes32[] memory hashes = requestIdToHashes[requestId];
        uint8[] memory options = new uint8[](hashes.length);

        require(
            hashes.length == randomWords.length,
            "Hashes and random words length not matching"
        );

        for (uint256 i = 0; i < hashes.length; i++) {
            // Settled by another request
            if (hashToWinningOption[hashes[i]] != 0) {
                options[i] = hashToWinningOption[hashes[i]];
                continue;
            }

            uint8 winningOption = uint8(randomWords[i] % 5) + 1;

            hashToWinningOption[hashes[i]] = winningOption;
            options[i] = winningOption;
        }

        emit WinningOptionsSettled(hashes, options);
    }
}
