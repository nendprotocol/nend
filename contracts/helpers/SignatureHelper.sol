// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

library SignatureHelper {
    function recoverSigner(bytes32 messageHash, bytes memory signature)
        internal
        pure
        returns (address)
    {
        (bytes32 r, bytes32 s, uint8 v) = splitSig(signature);

        bytes memory prefix = "\x19Ethereum Signed Message:\n32";
        bytes32 prefixedHashMessage = keccak256(
            abi.encodePacked(prefix, messageHash)
        );

        return ecrecover(prefixedHashMessage, v, r, s);
    }

    function splitSig(bytes memory signature)
        internal
        pure
        returns (
            bytes32 r,
            bytes32 s,
            uint8 v
        )
    {
        assembly {
            r := mload(add(signature, 32))
            s := mload(add(signature, 64))
            v := and(mload(add(signature, 65)), 255)
        }
        if (v < 27) v += 27;
    }
}
