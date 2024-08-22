{

    function abi_decode_available_length_t_bytes_memory_ptr(src, length, end) -> array {
        array := allocate_memory(array_allocation_size_t_bytes_memory_ptr(length))
        mstore(array, length)
        let dst := add(array, 0x20)
        if gt(add(src, length), end) { revert_error_987264b3b1d58a9c7f8255e93e81c77d86d6299019c33110a076957a3e06e2ae() }
        copy_calldata_to_memory(src, dst, length)
    }

    function abi_decode_t_address(offset, end) -> value {
        value := calldataload(offset)
        validator_revert_t_address(value)
    }

    // address[]
    function abi_decode_t_array$_t_address_$dyn_calldata_ptr(offset, end) -> arrayPos, length {
        if iszero(slt(add(offset, 0x1f), end)) { revert_error_1b9f4a0a5773e33b91aa01db23bf8c55fce1411167c872835e7fa00a4f17d46d() }
        length := calldataload(offset)
        if gt(length, 0xffffffffffffffff) { revert_error_15abf5612cd996bc235ba1e55a4a30ac60e6bb601ff7ba4ad3f179b6be8d0490() }
        arrayPos := add(offset, 0x20)
        if gt(add(arrayPos, mul(length, 0x20)), end) { revert_error_81385d8c0b31fffe14be1da910c8bd3a80be4cfa248e04f42ec0faea3132a8ef() }
    }

    // uint256[]
    function abi_decode_t_array$_t_uint256_$dyn_calldata_ptr(offset, end) -> arrayPos, length {
        if iszero(slt(add(offset, 0x1f), end)) { revert_error_1b9f4a0a5773e33b91aa01db23bf8c55fce1411167c872835e7fa00a4f17d46d() }
        length := calldataload(offset)
        if gt(length, 0xffffffffffffffff) { revert_error_15abf5612cd996bc235ba1e55a4a30ac60e6bb601ff7ba4ad3f179b6be8d0490() }
        arrayPos := add(offset, 0x20)
        if gt(add(arrayPos, mul(length, 0x20)), end) { revert_error_81385d8c0b31fffe14be1da910c8bd3a80be4cfa248e04f42ec0faea3132a8ef() }
    }

    function abi_decode_t_bool(offset, end) -> value {
        value := calldataload(offset)
        validator_revert_t_bool(value)
    }

    function abi_decode_t_bool_fromMemory(offset, end) -> value {
        value := mload(offset)
        validator_revert_t_bool(value)
    }

    function abi_decode_t_bytes4(offset, end) -> value {
        value := calldataload(offset)
        validator_revert_t_bytes4(value)
    }

    function abi_decode_t_bytes4_fromMemory(offset, end) -> value {
        value := mload(offset)
        validator_revert_t_bytes4(value)
    }

    // bytes
    function abi_decode_t_bytes_memory_ptr(offset, end) -> array {
        if iszero(slt(add(offset, 0x1f), end)) { revert_error_1b9f4a0a5773e33b91aa01db23bf8c55fce1411167c872835e7fa00a4f17d46d() }
        let length := calldataload(offset)
        array := abi_decode_available_length_t_bytes_memory_ptr(add(offset, 0x20), length, end)
    }

    function abi_decode_t_uint256(offset, end) -> value {
        value := calldataload(offset)
        validator_revert_t_uint256(value)
    }

    function abi_decode_t_uint256_fromMemory(offset, end) -> value {
        value := mload(offset)
        validator_revert_t_uint256(value)
    }

    function abi_decode_t_uint8(offset, end) -> value {
        value := calldataload(offset)
        validator_revert_t_uint8(value)
    }

    function abi_decode_tuple_t_address(headStart, dataEnd) -> value0 {
        if slt(sub(dataEnd, headStart), 32) { revert_error_dbdddcbe895c83990c08b3492a0e83918d802a52331272ac6fdb6a7c4aea3b1b() }

        {

            let offset := 0

            value0 := abi_decode_t_address(add(headStart, offset), dataEnd)
        }

    }

    function abi_decode_tuple_t_addresst_address(headStart, dataEnd) -> value0, value1 {
        if slt(sub(dataEnd, headStart), 64) { revert_error_dbdddcbe895c83990c08b3492a0e83918d802a52331272ac6fdb6a7c4aea3b1b() }

        {

            let offset := 0

            value0 := abi_decode_t_address(add(headStart, offset), dataEnd)
        }

        {

            let offset := 32

            value1 := abi_decode_t_address(add(headStart, offset), dataEnd)
        }

    }

    function abi_decode_tuple_t_addresst_addresst_uint256(headStart, dataEnd) -> value0, value1, value2 {
        if slt(sub(dataEnd, headStart), 96) { revert_error_dbdddcbe895c83990c08b3492a0e83918d802a52331272ac6fdb6a7c4aea3b1b() }

        {

            let offset := 0

            value0 := abi_decode_t_address(add(headStart, offset), dataEnd)
        }

        {

            let offset := 32

            value1 := abi_decode_t_address(add(headStart, offset), dataEnd)
        }

        {

            let offset := 64

            value2 := abi_decode_t_uint256(add(headStart, offset), dataEnd)
        }

    }

    function abi_decode_tuple_t_addresst_addresst_uint256t_bytes_memory_ptr(headStart, dataEnd) -> value0, value1, value2, value3 {
        if slt(sub(dataEnd, headStart), 128) { revert_error_dbdddcbe895c83990c08b3492a0e83918d802a52331272ac6fdb6a7c4aea3b1b() }

        {

            let offset := 0

            value0 := abi_decode_t_address(add(headStart, offset), dataEnd)
        }

        {

            let offset := 32

            value1 := abi_decode_t_address(add(headStart, offset), dataEnd)
        }

        {

            let offset := 64

            value2 := abi_decode_t_uint256(add(headStart, offset), dataEnd)
        }

        {

            let offset := calldataload(add(headStart, 96))
            if gt(offset, 0xffffffffffffffff) { revert_error_c1322bf8034eace5e0b5c7295db60986aa89aae5e0ea0873e4689e076861a5db() }

            value3 := abi_decode_t_bytes_memory_ptr(add(headStart, offset), dataEnd)
        }

    }

    function abi_decode_tuple_t_addresst_bool(headStart, dataEnd) -> value0, value1 {
        if slt(sub(dataEnd, headStart), 64) { revert_error_dbdddcbe895c83990c08b3492a0e83918d802a52331272ac6fdb6a7c4aea3b1b() }

        {

            let offset := 0

            value0 := abi_decode_t_address(add(headStart, offset), dataEnd)
        }

        {

            let offset := 32

            value1 := abi_decode_t_bool(add(headStart, offset), dataEnd)
        }

    }

    function abi_decode_tuple_t_addresst_uint256(headStart, dataEnd) -> value0, value1 {
        if slt(sub(dataEnd, headStart), 64) { revert_error_dbdddcbe895c83990c08b3492a0e83918d802a52331272ac6fdb6a7c4aea3b1b() }

        {

            let offset := 0

            value0 := abi_decode_t_address(add(headStart, offset), dataEnd)
        }

        {

            let offset := 32

            value1 := abi_decode_t_uint256(add(headStart, offset), dataEnd)
        }

    }

    function abi_decode_tuple_t_addresst_uint256t_uint8(headStart, dataEnd) -> value0, value1, value2 {
        if slt(sub(dataEnd, headStart), 96) { revert_error_dbdddcbe895c83990c08b3492a0e83918d802a52331272ac6fdb6a7c4aea3b1b() }

        {

            let offset := 0

            value0 := abi_decode_t_address(add(headStart, offset), dataEnd)
        }

        {

            let offset := 32

            value1 := abi_decode_t_uint256(add(headStart, offset), dataEnd)
        }

        {

            let offset := 64

            value2 := abi_decode_t_uint8(add(headStart, offset), dataEnd)
        }

    }

    function abi_decode_tuple_t_array$_t_address_$dyn_calldata_ptrt_array$_t_uint256_$dyn_calldata_ptr(headStart, dataEnd) -> value0, value1, value2, value3 {
        if slt(sub(dataEnd, headStart), 64) { revert_error_dbdddcbe895c83990c08b3492a0e83918d802a52331272ac6fdb6a7c4aea3b1b() }

        {

            let offset := calldataload(add(headStart, 0))
            if gt(offset, 0xffffffffffffffff) { revert_error_c1322bf8034eace5e0b5c7295db60986aa89aae5e0ea0873e4689e076861a5db() }

            value0, value1 := abi_decode_t_array$_t_address_$dyn_calldata_ptr(add(headStart, offset), dataEnd)
        }

        {

            let offset := calldataload(add(headStart, 32))
            if gt(offset, 0xffffffffffffffff) { revert_error_c1322bf8034eace5e0b5c7295db60986aa89aae5e0ea0873e4689e076861a5db() }

            value2, value3 := abi_decode_t_array$_t_uint256_$dyn_calldata_ptr(add(headStart, offset), dataEnd)
        }

    }

    function abi_decode_tuple_t_bool_fromMemory(headStart, dataEnd) -> value0 {
        if slt(sub(dataEnd, headStart), 32) { revert_error_dbdddcbe895c83990c08b3492a0e83918d802a52331272ac6fdb6a7c4aea3b1b() }

        {

            let offset := 0

            value0 := abi_decode_t_bool_fromMemory(add(headStart, offset), dataEnd)
        }

    }

    function abi_decode_tuple_t_bytes4(headStart, dataEnd) -> value0 {
        if slt(sub(dataEnd, headStart), 32) { revert_error_dbdddcbe895c83990c08b3492a0e83918d802a52331272ac6fdb6a7c4aea3b1b() }

        {

            let offset := 0

            value0 := abi_decode_t_bytes4(add(headStart, offset), dataEnd)
        }

    }

    function abi_decode_tuple_t_bytes4_fromMemory(headStart, dataEnd) -> value0 {
        if slt(sub(dataEnd, headStart), 32) { revert_error_dbdddcbe895c83990c08b3492a0e83918d802a52331272ac6fdb6a7c4aea3b1b() }

        {

            let offset := 0

            value0 := abi_decode_t_bytes4_fromMemory(add(headStart, offset), dataEnd)
        }

    }

    function abi_decode_tuple_t_uint256(headStart, dataEnd) -> value0 {
        if slt(sub(dataEnd, headStart), 32) { revert_error_dbdddcbe895c83990c08b3492a0e83918d802a52331272ac6fdb6a7c4aea3b1b() }

        {

            let offset := 0

            value0 := abi_decode_t_uint256(add(headStart, offset), dataEnd)
        }

    }

    function abi_decode_tuple_t_uint256_fromMemory(headStart, dataEnd) -> value0 {
        if slt(sub(dataEnd, headStart), 32) { revert_error_dbdddcbe895c83990c08b3492a0e83918d802a52331272ac6fdb6a7c4aea3b1b() }

        {

            let offset := 0

            value0 := abi_decode_t_uint256_fromMemory(add(headStart, offset), dataEnd)
        }

    }

    function abi_encodeUpdatedPos_t_struct$_Escrow_$2103_memory_ptr_to_t_struct$_Escrow_$2103_memory_ptr(value0, pos) -> updatedPos {
        abi_encode_t_struct$_Escrow_$2103_memory_ptr_to_t_struct$_Escrow_$2103_memory_ptr(value0, pos)
        updatedPos := add(pos, 0x60)
    }

    function abi_encodeUpdatedPos_t_struct$_Stake_$2096_memory_ptr_to_t_struct$_Stake_$2096_memory_ptr(value0, pos) -> updatedPos {
        abi_encode_t_struct$_Stake_$2096_memory_ptr_to_t_struct$_Stake_$2096_memory_ptr(value0, pos)
        updatedPos := add(pos, 0xe0)
    }

    function abi_encode_t_address_to_t_address(value, pos) {
        mstore(pos, cleanup_t_address(value))
    }

    function abi_encode_t_address_to_t_address_fromStack(value, pos) {
        mstore(pos, cleanup_t_address(value))
    }

    // struct IStaking.Escrow[] -> struct IStaking.Escrow[]
    function abi_encode_t_array$_t_struct$_Escrow_$2103_memory_ptr_$dyn_memory_ptr_to_t_array$_t_struct$_Escrow_$2103_memory_ptr_$dyn_memory_ptr_fromStack(value, pos)  -> end  {
        let length := array_length_t_array$_t_struct$_Escrow_$2103_memory_ptr_$dyn_memory_ptr(value)
        pos := array_storeLengthForEncoding_t_array$_t_struct$_Escrow_$2103_memory_ptr_$dyn_memory_ptr_fromStack(pos, length)
        let baseRef := array_dataslot_t_array$_t_struct$_Escrow_$2103_memory_ptr_$dyn_memory_ptr(value)
        let srcPtr := baseRef
        for { let i := 0 } lt(i, length) { i := add(i, 1) }
        {
            let elementValue0 := mload(srcPtr)
            pos := abi_encodeUpdatedPos_t_struct$_Escrow_$2103_memory_ptr_to_t_struct$_Escrow_$2103_memory_ptr(elementValue0, pos)
            srcPtr := array_nextElement_t_array$_t_struct$_Escrow_$2103_memory_ptr_$dyn_memory_ptr(srcPtr)
        }
        end := pos
    }

    // struct IStaking.Stake[] -> struct IStaking.Stake[]
    function abi_encode_t_array$_t_struct$_Stake_$2096_memory_ptr_$dyn_memory_ptr_to_t_array$_t_struct$_Stake_$2096_memory_ptr_$dyn_memory_ptr_fromStack(value, pos)  -> end  {
        let length := array_length_t_array$_t_struct$_Stake_$2096_memory_ptr_$dyn_memory_ptr(value)
        pos := array_storeLengthForEncoding_t_array$_t_struct$_Stake_$2096_memory_ptr_$dyn_memory_ptr_fromStack(pos, length)
        let baseRef := array_dataslot_t_array$_t_struct$_Stake_$2096_memory_ptr_$dyn_memory_ptr(value)
        let srcPtr := baseRef
        for { let i := 0 } lt(i, length) { i := add(i, 1) }
        {
            let elementValue0 := mload(srcPtr)
            pos := abi_encodeUpdatedPos_t_struct$_Stake_$2096_memory_ptr_to_t_struct$_Stake_$2096_memory_ptr(elementValue0, pos)
            srcPtr := array_nextElement_t_array$_t_struct$_Stake_$2096_memory_ptr_$dyn_memory_ptr(srcPtr)
        }
        end := pos
    }

    function abi_encode_t_bool_to_t_bool_fromStack(value, pos) {
        mstore(pos, cleanup_t_bool(value))
    }

    function abi_encode_t_bytes_memory_ptr_to_t_bytes_memory_ptr_fromStack(value, pos) -> end {
        let length := array_length_t_bytes_memory_ptr(value)
        pos := array_storeLengthForEncoding_t_bytes_memory_ptr_fromStack(pos, length)
        copy_memory_to_memory(add(value, 0x20), pos, length)
        end := add(pos, round_up_to_mul_of_32(length))
    }

    function abi_encode_t_string_memory_ptr_to_t_string_memory_ptr_fromStack(value, pos) -> end {
        let length := array_length_t_string_memory_ptr(value)
        pos := array_storeLengthForEncoding_t_string_memory_ptr_fromStack(pos, length)
        copy_memory_to_memory(add(value, 0x20), pos, length)
        end := add(pos, round_up_to_mul_of_32(length))
    }

    function abi_encode_t_string_memory_ptr_to_t_string_memory_ptr_nonPadded_inplace_fromStack(value, pos) -> end {
        let length := array_length_t_string_memory_ptr(value)
        pos := array_storeLengthForEncoding_t_string_memory_ptr_nonPadded_inplace_fromStack(pos, length)
        copy_memory_to_memory(add(value, 0x20), pos, length)
        end := add(pos, length)
    }

    function abi_encode_t_stringliteral_108243f05f98f8ed7596519bda107c5c19e5faad2a814dc1c755c10eb7a63698_to_t_string_memory_ptr_fromStack(pos) -> end {
        pos := array_storeLengthForEncoding_t_string_memory_ptr_fromStack(pos, 29)
        store_literal_in_memory_108243f05f98f8ed7596519bda107c5c19e5faad2a814dc1c755c10eb7a63698(pos)
        end := add(pos, 32)
    }

    function abi_encode_t_stringliteral_1225017fdc7279b05beb5331e5c3726ccc6f1435fadbdafb11a4b4aa5c37dba6_to_t_string_memory_ptr_fromStack(pos) -> end {
        pos := array_storeLengthForEncoding_t_string_memory_ptr_fromStack(pos, 13)
        store_literal_in_memory_1225017fdc7279b05beb5331e5c3726ccc6f1435fadbdafb11a4b4aa5c37dba6(pos)
        end := add(pos, 32)
    }

    function abi_encode_t_stringliteral_1e766a06da43a53d0f4c380e06e5a342e14d5af1bf8501996c844905530ca84e_to_t_string_memory_ptr_fromStack(pos) -> end {
        pos := array_storeLengthForEncoding_t_string_memory_ptr_fromStack(pos, 50)
        store_literal_in_memory_1e766a06da43a53d0f4c380e06e5a342e14d5af1bf8501996c844905530ca84e(pos)
        end := add(pos, 64)
    }

    function abi_encode_t_stringliteral_245f15ff17f551913a7a18385165551503906a406f905ac1c2437281a7cd0cfe_to_t_string_memory_ptr_fromStack(pos) -> end {
        pos := array_storeLengthForEncoding_t_string_memory_ptr_fromStack(pos, 38)
        store_literal_in_memory_245f15ff17f551913a7a18385165551503906a406f905ac1c2437281a7cd0cfe(pos)
        end := add(pos, 64)
    }

    function abi_encode_t_stringliteral_277f8ee9d5b4fc3c4149386f24de0fc1bbc63a8210e2197bfd1c0376a2ac5f48_to_t_string_memory_ptr_fromStack(pos) -> end {
        pos := array_storeLengthForEncoding_t_string_memory_ptr_fromStack(pos, 37)
        store_literal_in_memory_277f8ee9d5b4fc3c4149386f24de0fc1bbc63a8210e2197bfd1c0376a2ac5f48(pos)
        end := add(pos, 64)
    }

    function abi_encode_t_stringliteral_2a63ce106ef95058ed21fd07c42a10f11dc5c32ac13a4e847923f7759f635d57_to_t_string_memory_ptr_fromStack(pos) -> end {
        pos := array_storeLengthForEncoding_t_string_memory_ptr_fromStack(pos, 28)
        store_literal_in_memory_2a63ce106ef95058ed21fd07c42a10f11dc5c32ac13a4e847923f7759f635d57(pos)
        end := add(pos, 32)
    }

    function abi_encode_t_stringliteral_3f15e51fb138d6720f88f6a2b806f6ff3665198e58ccf2c9167b791866275d6d_to_t_string_memory_ptr_fromStack(pos) -> end {
        pos := array_storeLengthForEncoding_t_string_memory_ptr_fromStack(pos, 25)
        store_literal_in_memory_3f15e51fb138d6720f88f6a2b806f6ff3665198e58ccf2c9167b791866275d6d(pos)
        end := add(pos, 32)
    }

    function abi_encode_t_stringliteral_455fea98ea03c32d7dd1a6f1426917d80529bf47b3ccbde74e7206e889e709f4_to_t_string_memory_ptr_fromStack(pos) -> end {
        pos := array_storeLengthForEncoding_t_string_memory_ptr_fromStack(pos, 36)
        store_literal_in_memory_455fea98ea03c32d7dd1a6f1426917d80529bf47b3ccbde74e7206e889e709f4(pos)
        end := add(pos, 64)
    }

    function abi_encode_t_stringliteral_45fe4329685be5ecd250fd0e6a25aea0ea4d0e30fb6a73c118b95749e6d70d05_to_t_string_memory_ptr_fromStack(pos) -> end {
        pos := array_storeLengthForEncoding_t_string_memory_ptr_fromStack(pos, 25)
        store_literal_in_memory_45fe4329685be5ecd250fd0e6a25aea0ea4d0e30fb6a73c118b95749e6d70d05(pos)
        end := add(pos, 32)
    }

    function abi_encode_t_stringliteral_5e70ebd1d4072d337a7fabaa7bda70fa2633d6e3f89d5cb725a16b10d07e54c6_to_t_string_memory_ptr_fromStack(pos) -> end {
        pos := array_storeLengthForEncoding_t_string_memory_ptr_fromStack(pos, 13)
        store_literal_in_memory_5e70ebd1d4072d337a7fabaa7bda70fa2633d6e3f89d5cb725a16b10d07e54c6(pos)
        end := add(pos, 32)
    }

    function abi_encode_t_stringliteral_6d05c90094f31cfeb8f0eb86f0a513af3f7f8992991fbde41b08aa7960677159_to_t_string_memory_ptr_fromStack(pos) -> end {
        pos := array_storeLengthForEncoding_t_string_memory_ptr_fromStack(pos, 41)
        store_literal_in_memory_6d05c90094f31cfeb8f0eb86f0a513af3f7f8992991fbde41b08aa7960677159(pos)
        end := add(pos, 64)
    }

    function abi_encode_t_stringliteral_6d951e8ac07dde84a43735e497d67ee4c524b854e2264cceeaaa6d903de9357f_to_t_string_memory_ptr_fromStack(pos) -> end {
        pos := array_storeLengthForEncoding_t_string_memory_ptr_fromStack(pos, 12)
        store_literal_in_memory_6d951e8ac07dde84a43735e497d67ee4c524b854e2264cceeaaa6d903de9357f(pos)
        end := add(pos, 32)
    }

    function abi_encode_t_stringliteral_7dc431aa9ef2e5168732d01244e6ca375a00642c62aafc98b88be0d2fc808c18_to_t_string_memory_ptr_fromStack(pos) -> end {
        pos := array_storeLengthForEncoding_t_string_memory_ptr_fromStack(pos, 36)
        store_literal_in_memory_7dc431aa9ef2e5168732d01244e6ca375a00642c62aafc98b88be0d2fc808c18(pos)
        end := add(pos, 64)
    }

    function abi_encode_t_stringliteral_893728d0e71b0800df2adedc4ebc96c8ebb7f6a47f5b7d4635aabadfc4a61040_to_t_string_memory_ptr_fromStack(pos) -> end {
        pos := array_storeLengthForEncoding_t_string_memory_ptr_fromStack(pos, 20)
        store_literal_in_memory_893728d0e71b0800df2adedc4ebc96c8ebb7f6a47f5b7d4635aabadfc4a61040(pos)
        end := add(pos, 32)
    }

    function abi_encode_t_stringliteral_8a333355a81806ed720720a526142c1e97d1086371f6be2b18561203134ef304_to_t_string_memory_ptr_fromStack(pos) -> end {
        pos := array_storeLengthForEncoding_t_string_memory_ptr_fromStack(pos, 62)
        store_literal_in_memory_8a333355a81806ed720720a526142c1e97d1086371f6be2b18561203134ef304(pos)
        end := add(pos, 64)
    }

    function abi_encode_t_stringliteral_8a66f4bb6512ffbfcc3db9b42318eb65f26ac15163eaa9a1e5cfa7bee9d1c7c6_to_t_string_memory_ptr_fromStack(pos) -> end {
        pos := array_storeLengthForEncoding_t_string_memory_ptr_fromStack(pos, 32)
        store_literal_in_memory_8a66f4bb6512ffbfcc3db9b42318eb65f26ac15163eaa9a1e5cfa7bee9d1c7c6(pos)
        end := add(pos, 32)
    }

    function abi_encode_t_stringliteral_960ac9243385dd32742e430ea73c1ba76d62a69cc920ff8d3ef2a0a91f5c52c0_to_t_string_memory_ptr_fromStack(pos) -> end {
        pos := array_storeLengthForEncoding_t_string_memory_ptr_fromStack(pos, 34)
        store_literal_in_memory_960ac9243385dd32742e430ea73c1ba76d62a69cc920ff8d3ef2a0a91f5c52c0(pos)
        end := add(pos, 64)
    }

    function abi_encode_t_stringliteral_9924ebdf1add33d25d4ef888e16131f0a5687b0580a36c21b5c301a6c462effe_to_t_string_memory_ptr_fromStack(pos) -> end {
        pos := array_storeLengthForEncoding_t_string_memory_ptr_fromStack(pos, 32)
        store_literal_in_memory_9924ebdf1add33d25d4ef888e16131f0a5687b0580a36c21b5c301a6c462effe(pos)
        end := add(pos, 32)
    }

    function abi_encode_t_stringliteral_b08d2b0fec7cc108ab049809a8beb42779d969a49299d0c317c907d9db22974f_to_t_string_memory_ptr_fromStack(pos) -> end {
        pos := array_storeLengthForEncoding_t_string_memory_ptr_fromStack(pos, 24)
        store_literal_in_memory_b08d2b0fec7cc108ab049809a8beb42779d969a49299d0c317c907d9db22974f(pos)
        end := add(pos, 32)
    }

    function abi_encode_t_stringliteral_b364625548658238260fc754e02ba9b5633ef890d9f126ca4b99e0da80d5d624_to_t_string_memory_ptr_fromStack(pos) -> end {
        pos := array_storeLengthForEncoding_t_string_memory_ptr_fromStack(pos, 19)
        store_literal_in_memory_b364625548658238260fc754e02ba9b5633ef890d9f126ca4b99e0da80d5d624(pos)
        end := add(pos, 32)
    }

    function abi_encode_t_stringliteral_b51b4875eede07862961e8f9365c6749f5fe55c6ee5d7a9e42b6912ad0b15942_to_t_string_memory_ptr_fromStack(pos) -> end {
        pos := array_storeLengthForEncoding_t_string_memory_ptr_fromStack(pos, 33)
        store_literal_in_memory_b51b4875eede07862961e8f9365c6749f5fe55c6ee5d7a9e42b6912ad0b15942(pos)
        end := add(pos, 64)
    }

    function abi_encode_t_stringliteral_c224ebb31ab85466cf65168a8a37ace88d3c05978c61d9dacd85469e7cae8fa8_to_t_string_memory_ptr_fromStack(pos) -> end {
        pos := array_storeLengthForEncoding_t_string_memory_ptr_fromStack(pos, 28)
        store_literal_in_memory_c224ebb31ab85466cf65168a8a37ace88d3c05978c61d9dacd85469e7cae8fa8(pos)
        end := add(pos, 32)
    }

    function abi_encode_t_stringliteral_ce9f2a6150beddab6025238a53bd68a074555e044f821f52e07e94684bc0717f_to_t_string_memory_ptr_fromStack(pos) -> end {
        pos := array_storeLengthForEncoding_t_string_memory_ptr_fromStack(pos, 32)
        store_literal_in_memory_ce9f2a6150beddab6025238a53bd68a074555e044f821f52e07e94684bc0717f(pos)
        end := add(pos, 32)
    }

    function abi_encode_t_stringliteral_eb80b9f25203511adb7b7660e6222669e088cedd0909cd81ed7470e34dcd010b_to_t_string_memory_ptr_fromStack(pos) -> end {
        pos := array_storeLengthForEncoding_t_string_memory_ptr_fromStack(pos, 46)
        store_literal_in_memory_eb80b9f25203511adb7b7660e6222669e088cedd0909cd81ed7470e34dcd010b(pos)
        end := add(pos, 64)
    }

    function abi_encode_t_stringliteral_ed9692b83170e55eb6a26c718b63a533a2866ff38aaecd6ca69203549eb1383b_to_t_string_memory_ptr_fromStack(pos) -> end {
        pos := array_storeLengthForEncoding_t_string_memory_ptr_fromStack(pos, 24)
        store_literal_in_memory_ed9692b83170e55eb6a26c718b63a533a2866ff38aaecd6ca69203549eb1383b(pos)
        end := add(pos, 32)
    }

    function abi_encode_t_stringliteral_f99853c48c1ddbeea36abcebf54ce6fdb4da9c9253ee4271bf7ddd8fead72dde_to_t_string_memory_ptr_fromStack(pos) -> end {
        pos := array_storeLengthForEncoding_t_string_memory_ptr_fromStack(pos, 22)
        store_literal_in_memory_f99853c48c1ddbeea36abcebf54ce6fdb4da9c9253ee4271bf7ddd8fead72dde(pos)
        end := add(pos, 32)
    }

    // struct IStaking.Escrow -> struct IStaking.Escrow
    function abi_encode_t_struct$_Escrow_$2103_memory_ptr_to_t_struct$_Escrow_$2103_memory_ptr(value, pos)  {
        let tail := add(pos, 0x60)

        {
            // id

            let memberValue0 := mload(add(value, 0x00))
            abi_encode_t_uint256_to_t_uint256(memberValue0, add(pos, 0x00))
        }

        {
            // amount

            let memberValue0 := mload(add(value, 0x20))
            abi_encode_t_uint256_to_t_uint256(memberValue0, add(pos, 0x20))
        }

        {
            // claimAfter

            let memberValue0 := mload(add(value, 0x40))
            abi_encode_t_uint256_to_t_uint256(memberValue0, add(pos, 0x40))
        }

    }

    // struct IStaking.Stake -> struct IStaking.Stake
    function abi_encode_t_struct$_Stake_$2096_memory_ptr_to_t_struct$_Stake_$2096_memory_ptr(value, pos)  {
        let tail := add(pos, 0xe0)

        {
            // id

            let memberValue0 := mload(add(value, 0x00))
            abi_encode_t_uint256_to_t_uint256(memberValue0, add(pos, 0x00))
        }

        {
            // staker

            let memberValue0 := mload(add(value, 0x20))
            abi_encode_t_address_to_t_address(memberValue0, add(pos, 0x20))
        }

        {
            // stakeToken

            let memberValue0 := mload(add(value, 0x40))
            abi_encode_t_address_to_t_address(memberValue0, add(pos, 0x40))
        }

        {
            // deposited

            let memberValue0 := mload(add(value, 0x60))
            abi_encode_t_uint256_to_t_uint256(memberValue0, add(pos, 0x60))
        }

        {
            // timeDeposited

            let memberValue0 := mload(add(value, 0x80))
            abi_encode_t_uint256_to_t_uint256(memberValue0, add(pos, 0x80))
        }

        {
            // unclaimedRewards

            let memberValue0 := mload(add(value, 0xa0))
            abi_encode_t_uint256_to_t_uint256(memberValue0, add(pos, 0xa0))
        }

        {
            // durationId

            let memberValue0 := mload(add(value, 0xc0))
            abi_encode_t_uint8_to_t_uint8(memberValue0, add(pos, 0xc0))
        }

    }

    function abi_encode_t_uint256_to_t_uint256(value, pos) {
        mstore(pos, cleanup_t_uint256(value))
    }

    function abi_encode_t_uint256_to_t_uint256_fromStack(value, pos) {
        mstore(pos, cleanup_t_uint256(value))
    }

    function abi_encode_t_uint8_to_t_uint8(value, pos) {
        mstore(pos, cleanup_t_uint8(value))
    }

    function abi_encode_t_uint8_to_t_uint8_fromStack(value, pos) {
        mstore(pos, cleanup_t_uint8(value))
    }

    function abi_encode_tuple_packed_t_string_memory_ptr_t_string_memory_ptr__to_t_string_memory_ptr_t_string_memory_ptr__nonPadded_inplace_fromStack_reversed(pos , value1, value0) -> end {

        pos := abi_encode_t_string_memory_ptr_to_t_string_memory_ptr_nonPadded_inplace_fromStack(value0,  pos)

        pos := abi_encode_t_string_memory_ptr_to_t_string_memory_ptr_nonPadded_inplace_fromStack(value1,  pos)

        end := pos
    }

    function abi_encode_tuple_t_address__to_t_address__fromStack_reversed(headStart , value0) -> tail {
        tail := add(headStart, 32)

        abi_encode_t_address_to_t_address_fromStack(value0,  add(headStart, 0))

    }

    function abi_encode_tuple_t_address_t_address_t_uint256__to_t_address_t_address_t_uint256__fromStack_reversed(headStart , value2, value1, value0) -> tail {
        tail := add(headStart, 96)

        abi_encode_t_address_to_t_address_fromStack(value0,  add(headStart, 0))

        abi_encode_t_address_to_t_address_fromStack(value1,  add(headStart, 32))

        abi_encode_t_uint256_to_t_uint256_fromStack(value2,  add(headStart, 64))

    }

    function abi_encode_tuple_t_address_t_address_t_uint256_t_bytes_memory_ptr__to_t_address_t_address_t_uint256_t_bytes_memory_ptr__fromStack_reversed(headStart , value3, value2, value1, value0) -> tail {
        tail := add(headStart, 128)

        abi_encode_t_address_to_t_address_fromStack(value0,  add(headStart, 0))

        abi_encode_t_address_to_t_address_fromStack(value1,  add(headStart, 32))

        abi_encode_t_uint256_to_t_uint256_fromStack(value2,  add(headStart, 64))

        mstore(add(headStart, 96), sub(tail, headStart))
        tail := abi_encode_t_bytes_memory_ptr_to_t_bytes_memory_ptr_fromStack(value3,  tail)

    }

    function abi_encode_tuple_t_address_t_uint256__to_t_address_t_uint256__fromStack_reversed(headStart , value1, value0) -> tail {
        tail := add(headStart, 64)

        abi_encode_t_address_to_t_address_fromStack(value0,  add(headStart, 0))

        abi_encode_t_uint256_to_t_uint256_fromStack(value1,  add(headStart, 32))

    }

    function abi_encode_tuple_t_array$_t_struct$_Escrow_$2103_memory_ptr_$dyn_memory_ptr__to_t_array$_t_struct$_Escrow_$2103_memory_ptr_$dyn_memory_ptr__fromStack_reversed(headStart , value0) -> tail {
        tail := add(headStart, 32)

        mstore(add(headStart, 0), sub(tail, headStart))
        tail := abi_encode_t_array$_t_struct$_Escrow_$2103_memory_ptr_$dyn_memory_ptr_to_t_array$_t_struct$_Escrow_$2103_memory_ptr_$dyn_memory_ptr_fromStack(value0,  tail)

    }

    function abi_encode_tuple_t_array$_t_struct$_Stake_$2096_memory_ptr_$dyn_memory_ptr__to_t_array$_t_struct$_Stake_$2096_memory_ptr_$dyn_memory_ptr__fromStack_reversed(headStart , value0) -> tail {
        tail := add(headStart, 32)

        mstore(add(headStart, 0), sub(tail, headStart))
        tail := abi_encode_t_array$_t_struct$_Stake_$2096_memory_ptr_$dyn_memory_ptr_to_t_array$_t_struct$_Stake_$2096_memory_ptr_$dyn_memory_ptr_fromStack(value0,  tail)

    }

    function abi_encode_tuple_t_bool__to_t_bool__fromStack_reversed(headStart , value0) -> tail {
        tail := add(headStart, 32)

        abi_encode_t_bool_to_t_bool_fromStack(value0,  add(headStart, 0))

    }

    function abi_encode_tuple_t_string_memory_ptr__to_t_string_memory_ptr__fromStack_reversed(headStart , value0) -> tail {
        tail := add(headStart, 32)

        mstore(add(headStart, 0), sub(tail, headStart))
        tail := abi_encode_t_string_memory_ptr_to_t_string_memory_ptr_fromStack(value0,  tail)

    }

    function abi_encode_tuple_t_stringliteral_108243f05f98f8ed7596519bda107c5c19e5faad2a814dc1c755c10eb7a63698__to_t_string_memory_ptr__fromStack_reversed(headStart ) -> tail {
        tail := add(headStart, 32)

        mstore(add(headStart, 0), sub(tail, headStart))
        tail := abi_encode_t_stringliteral_108243f05f98f8ed7596519bda107c5c19e5faad2a814dc1c755c10eb7a63698_to_t_string_memory_ptr_fromStack( tail)

    }

    function abi_encode_tuple_t_stringliteral_1225017fdc7279b05beb5331e5c3726ccc6f1435fadbdafb11a4b4aa5c37dba6__to_t_string_memory_ptr__fromStack_reversed(headStart ) -> tail {
        tail := add(headStart, 32)

        mstore(add(headStart, 0), sub(tail, headStart))
        tail := abi_encode_t_stringliteral_1225017fdc7279b05beb5331e5c3726ccc6f1435fadbdafb11a4b4aa5c37dba6_to_t_string_memory_ptr_fromStack( tail)

    }

    function abi_encode_tuple_t_stringliteral_1e766a06da43a53d0f4c380e06e5a342e14d5af1bf8501996c844905530ca84e__to_t_string_memory_ptr__fromStack_reversed(headStart ) -> tail {
        tail := add(headStart, 32)

        mstore(add(headStart, 0), sub(tail, headStart))
        tail := abi_encode_t_stringliteral_1e766a06da43a53d0f4c380e06e5a342e14d5af1bf8501996c844905530ca84e_to_t_string_memory_ptr_fromStack( tail)

    }

    function abi_encode_tuple_t_stringliteral_245f15ff17f551913a7a18385165551503906a406f905ac1c2437281a7cd0cfe__to_t_string_memory_ptr__fromStack_reversed(headStart ) -> tail {
        tail := add(headStart, 32)

        mstore(add(headStart, 0), sub(tail, headStart))
        tail := abi_encode_t_stringliteral_245f15ff17f551913a7a18385165551503906a406f905ac1c2437281a7cd0cfe_to_t_string_memory_ptr_fromStack( tail)

    }

    function abi_encode_tuple_t_stringliteral_277f8ee9d5b4fc3c4149386f24de0fc1bbc63a8210e2197bfd1c0376a2ac5f48__to_t_string_memory_ptr__fromStack_reversed(headStart ) -> tail {
        tail := add(headStart, 32)

        mstore(add(headStart, 0), sub(tail, headStart))
        tail := abi_encode_t_stringliteral_277f8ee9d5b4fc3c4149386f24de0fc1bbc63a8210e2197bfd1c0376a2ac5f48_to_t_string_memory_ptr_fromStack( tail)

    }

    function abi_encode_tuple_t_stringliteral_2a63ce106ef95058ed21fd07c42a10f11dc5c32ac13a4e847923f7759f635d57__to_t_string_memory_ptr__fromStack_reversed(headStart ) -> tail {
        tail := add(headStart, 32)

        mstore(add(headStart, 0), sub(tail, headStart))
        tail := abi_encode_t_stringliteral_2a63ce106ef95058ed21fd07c42a10f11dc5c32ac13a4e847923f7759f635d57_to_t_string_memory_ptr_fromStack( tail)

    }

    function abi_encode_tuple_t_stringliteral_3f15e51fb138d6720f88f6a2b806f6ff3665198e58ccf2c9167b791866275d6d__to_t_string_memory_ptr__fromStack_reversed(headStart ) -> tail {
        tail := add(headStart, 32)

        mstore(add(headStart, 0), sub(tail, headStart))
        tail := abi_encode_t_stringliteral_3f15e51fb138d6720f88f6a2b806f6ff3665198e58ccf2c9167b791866275d6d_to_t_string_memory_ptr_fromStack( tail)

    }

    function abi_encode_tuple_t_stringliteral_455fea98ea03c32d7dd1a6f1426917d80529bf47b3ccbde74e7206e889e709f4__to_t_string_memory_ptr__fromStack_reversed(headStart ) -> tail {
        tail := add(headStart, 32)

        mstore(add(headStart, 0), sub(tail, headStart))
        tail := abi_encode_t_stringliteral_455fea98ea03c32d7dd1a6f1426917d80529bf47b3ccbde74e7206e889e709f4_to_t_string_memory_ptr_fromStack( tail)

    }

    function abi_encode_tuple_t_stringliteral_45fe4329685be5ecd250fd0e6a25aea0ea4d0e30fb6a73c118b95749e6d70d05__to_t_string_memory_ptr__fromStack_reversed(headStart ) -> tail {
        tail := add(headStart, 32)

        mstore(add(headStart, 0), sub(tail, headStart))
        tail := abi_encode_t_stringliteral_45fe4329685be5ecd250fd0e6a25aea0ea4d0e30fb6a73c118b95749e6d70d05_to_t_string_memory_ptr_fromStack( tail)

    }

    function abi_encode_tuple_t_stringliteral_5e70ebd1d4072d337a7fabaa7bda70fa2633d6e3f89d5cb725a16b10d07e54c6__to_t_string_memory_ptr__fromStack_reversed(headStart ) -> tail {
        tail := add(headStart, 32)

        mstore(add(headStart, 0), sub(tail, headStart))
        tail := abi_encode_t_stringliteral_5e70ebd1d4072d337a7fabaa7bda70fa2633d6e3f89d5cb725a16b10d07e54c6_to_t_string_memory_ptr_fromStack( tail)

    }

    function abi_encode_tuple_t_stringliteral_6d05c90094f31cfeb8f0eb86f0a513af3f7f8992991fbde41b08aa7960677159__to_t_string_memory_ptr__fromStack_reversed(headStart ) -> tail {
        tail := add(headStart, 32)

        mstore(add(headStart, 0), sub(tail, headStart))
        tail := abi_encode_t_stringliteral_6d05c90094f31cfeb8f0eb86f0a513af3f7f8992991fbde41b08aa7960677159_to_t_string_memory_ptr_fromStack( tail)

    }

    function abi_encode_tuple_t_stringliteral_6d951e8ac07dde84a43735e497d67ee4c524b854e2264cceeaaa6d903de9357f__to_t_string_memory_ptr__fromStack_reversed(headStart ) -> tail {
        tail := add(headStart, 32)

        mstore(add(headStart, 0), sub(tail, headStart))
        tail := abi_encode_t_stringliteral_6d951e8ac07dde84a43735e497d67ee4c524b854e2264cceeaaa6d903de9357f_to_t_string_memory_ptr_fromStack( tail)

    }

    function abi_encode_tuple_t_stringliteral_7dc431aa9ef2e5168732d01244e6ca375a00642c62aafc98b88be0d2fc808c18__to_t_string_memory_ptr__fromStack_reversed(headStart ) -> tail {
        tail := add(headStart, 32)

        mstore(add(headStart, 0), sub(tail, headStart))
        tail := abi_encode_t_stringliteral_7dc431aa9ef2e5168732d01244e6ca375a00642c62aafc98b88be0d2fc808c18_to_t_string_memory_ptr_fromStack( tail)

    }

    function abi_encode_tuple_t_stringliteral_893728d0e71b0800df2adedc4ebc96c8ebb7f6a47f5b7d4635aabadfc4a61040__to_t_string_memory_ptr__fromStack_reversed(headStart ) -> tail {
        tail := add(headStart, 32)

        mstore(add(headStart, 0), sub(tail, headStart))
        tail := abi_encode_t_stringliteral_893728d0e71b0800df2adedc4ebc96c8ebb7f6a47f5b7d4635aabadfc4a61040_to_t_string_memory_ptr_fromStack( tail)

    }

    function abi_encode_tuple_t_stringliteral_8a333355a81806ed720720a526142c1e97d1086371f6be2b18561203134ef304__to_t_string_memory_ptr__fromStack_reversed(headStart ) -> tail {
        tail := add(headStart, 32)

        mstore(add(headStart, 0), sub(tail, headStart))
        tail := abi_encode_t_stringliteral_8a333355a81806ed720720a526142c1e97d1086371f6be2b18561203134ef304_to_t_string_memory_ptr_fromStack( tail)

    }

    function abi_encode_tuple_t_stringliteral_8a66f4bb6512ffbfcc3db9b42318eb65f26ac15163eaa9a1e5cfa7bee9d1c7c6__to_t_string_memory_ptr__fromStack_reversed(headStart ) -> tail {
        tail := add(headStart, 32)

        mstore(add(headStart, 0), sub(tail, headStart))
        tail := abi_encode_t_stringliteral_8a66f4bb6512ffbfcc3db9b42318eb65f26ac15163eaa9a1e5cfa7bee9d1c7c6_to_t_string_memory_ptr_fromStack( tail)

    }

    function abi_encode_tuple_t_stringliteral_960ac9243385dd32742e430ea73c1ba76d62a69cc920ff8d3ef2a0a91f5c52c0__to_t_string_memory_ptr__fromStack_reversed(headStart ) -> tail {
        tail := add(headStart, 32)

        mstore(add(headStart, 0), sub(tail, headStart))
        tail := abi_encode_t_stringliteral_960ac9243385dd32742e430ea73c1ba76d62a69cc920ff8d3ef2a0a91f5c52c0_to_t_string_memory_ptr_fromStack( tail)

    }

    function abi_encode_tuple_t_stringliteral_9924ebdf1add33d25d4ef888e16131f0a5687b0580a36c21b5c301a6c462effe__to_t_string_memory_ptr__fromStack_reversed(headStart ) -> tail {
        tail := add(headStart, 32)

        mstore(add(headStart, 0), sub(tail, headStart))
        tail := abi_encode_t_stringliteral_9924ebdf1add33d25d4ef888e16131f0a5687b0580a36c21b5c301a6c462effe_to_t_string_memory_ptr_fromStack( tail)

    }

    function abi_encode_tuple_t_stringliteral_b08d2b0fec7cc108ab049809a8beb42779d969a49299d0c317c907d9db22974f__to_t_string_memory_ptr__fromStack_reversed(headStart ) -> tail {
        tail := add(headStart, 32)

        mstore(add(headStart, 0), sub(tail, headStart))
        tail := abi_encode_t_stringliteral_b08d2b0fec7cc108ab049809a8beb42779d969a49299d0c317c907d9db22974f_to_t_string_memory_ptr_fromStack( tail)

    }

    function abi_encode_tuple_t_stringliteral_b364625548658238260fc754e02ba9b5633ef890d9f126ca4b99e0da80d5d624__to_t_string_memory_ptr__fromStack_reversed(headStart ) -> tail {
        tail := add(headStart, 32)

        mstore(add(headStart, 0), sub(tail, headStart))
        tail := abi_encode_t_stringliteral_b364625548658238260fc754e02ba9b5633ef890d9f126ca4b99e0da80d5d624_to_t_string_memory_ptr_fromStack( tail)

    }

    function abi_encode_tuple_t_stringliteral_b51b4875eede07862961e8f9365c6749f5fe55c6ee5d7a9e42b6912ad0b15942__to_t_string_memory_ptr__fromStack_reversed(headStart ) -> tail {
        tail := add(headStart, 32)

        mstore(add(headStart, 0), sub(tail, headStart))
        tail := abi_encode_t_stringliteral_b51b4875eede07862961e8f9365c6749f5fe55c6ee5d7a9e42b6912ad0b15942_to_t_string_memory_ptr_fromStack( tail)

    }

    function abi_encode_tuple_t_stringliteral_c224ebb31ab85466cf65168a8a37ace88d3c05978c61d9dacd85469e7cae8fa8__to_t_string_memory_ptr__fromStack_reversed(headStart ) -> tail {
        tail := add(headStart, 32)

        mstore(add(headStart, 0), sub(tail, headStart))
        tail := abi_encode_t_stringliteral_c224ebb31ab85466cf65168a8a37ace88d3c05978c61d9dacd85469e7cae8fa8_to_t_string_memory_ptr_fromStack( tail)

    }

    function abi_encode_tuple_t_stringliteral_ce9f2a6150beddab6025238a53bd68a074555e044f821f52e07e94684bc0717f__to_t_string_memory_ptr__fromStack_reversed(headStart ) -> tail {
        tail := add(headStart, 32)

        mstore(add(headStart, 0), sub(tail, headStart))
        tail := abi_encode_t_stringliteral_ce9f2a6150beddab6025238a53bd68a074555e044f821f52e07e94684bc0717f_to_t_string_memory_ptr_fromStack( tail)

    }

    function abi_encode_tuple_t_stringliteral_eb80b9f25203511adb7b7660e6222669e088cedd0909cd81ed7470e34dcd010b__to_t_string_memory_ptr__fromStack_reversed(headStart ) -> tail {
        tail := add(headStart, 32)

        mstore(add(headStart, 0), sub(tail, headStart))
        tail := abi_encode_t_stringliteral_eb80b9f25203511adb7b7660e6222669e088cedd0909cd81ed7470e34dcd010b_to_t_string_memory_ptr_fromStack( tail)

    }

    function abi_encode_tuple_t_stringliteral_ed9692b83170e55eb6a26c718b63a533a2866ff38aaecd6ca69203549eb1383b__to_t_string_memory_ptr__fromStack_reversed(headStart ) -> tail {
        tail := add(headStart, 32)

        mstore(add(headStart, 0), sub(tail, headStart))
        tail := abi_encode_t_stringliteral_ed9692b83170e55eb6a26c718b63a533a2866ff38aaecd6ca69203549eb1383b_to_t_string_memory_ptr_fromStack( tail)

    }

    function abi_encode_tuple_t_stringliteral_f99853c48c1ddbeea36abcebf54ce6fdb4da9c9253ee4271bf7ddd8fead72dde__to_t_string_memory_ptr__fromStack_reversed(headStart ) -> tail {
        tail := add(headStart, 32)

        mstore(add(headStart, 0), sub(tail, headStart))
        tail := abi_encode_t_stringliteral_f99853c48c1ddbeea36abcebf54ce6fdb4da9c9253ee4271bf7ddd8fead72dde_to_t_string_memory_ptr_fromStack( tail)

    }

    function abi_encode_tuple_t_uint256__to_t_uint256__fromStack_reversed(headStart , value0) -> tail {
        tail := add(headStart, 32)

        abi_encode_t_uint256_to_t_uint256_fromStack(value0,  add(headStart, 0))

    }

    function abi_encode_tuple_t_uint256_t_address_t_uint256_t_uint256_t_uint8__to_t_uint256_t_address_t_uint256_t_uint256_t_uint8__fromStack_reversed(headStart , value4, value3, value2, value1, value0) -> tail {
        tail := add(headStart, 160)

        abi_encode_t_uint256_to_t_uint256_fromStack(value0,  add(headStart, 0))

        abi_encode_t_address_to_t_address_fromStack(value1,  add(headStart, 32))

        abi_encode_t_uint256_to_t_uint256_fromStack(value2,  add(headStart, 64))

        abi_encode_t_uint256_to_t_uint256_fromStack(value3,  add(headStart, 96))

        abi_encode_t_uint8_to_t_uint8_fromStack(value4,  add(headStart, 128))

    }

    function abi_encode_tuple_t_uint256_t_uint256__to_t_uint256_t_uint256__fromStack_reversed(headStart , value1, value0) -> tail {
        tail := add(headStart, 64)

        abi_encode_t_uint256_to_t_uint256_fromStack(value0,  add(headStart, 0))

        abi_encode_t_uint256_to_t_uint256_fromStack(value1,  add(headStart, 32))

    }

    function allocate_memory(size) -> memPtr {
        memPtr := allocate_unbounded()
        finalize_allocation(memPtr, size)
    }

    function allocate_unbounded() -> memPtr {
        memPtr := mload(64)
    }

    function array_allocation_size_t_bytes_memory_ptr(length) -> size {
        // Make sure we can allocate memory without overflow
        if gt(length, 0xffffffffffffffff) { panic_error_0x41() }

        size := round_up_to_mul_of_32(length)

        // add length slot
        size := add(size, 0x20)

    }

    function array_dataslot_t_array$_t_struct$_Escrow_$2103_memory_ptr_$dyn_memory_ptr(ptr) -> data {
        data := ptr

        data := add(ptr, 0x20)

    }

    function array_dataslot_t_array$_t_struct$_Stake_$2096_memory_ptr_$dyn_memory_ptr(ptr) -> data {
        data := ptr

        data := add(ptr, 0x20)

    }

    function array_length_t_array$_t_struct$_Escrow_$2103_memory_ptr_$dyn_memory_ptr(value) -> length {

        length := mload(value)

    }

    function array_length_t_array$_t_struct$_Stake_$2096_memory_ptr_$dyn_memory_ptr(value) -> length {

        length := mload(value)

    }

    function array_length_t_bytes_memory_ptr(value) -> length {

        length := mload(value)

    }

    function array_length_t_string_memory_ptr(value) -> length {

        length := mload(value)

    }

    function array_nextElement_t_array$_t_struct$_Escrow_$2103_memory_ptr_$dyn_memory_ptr(ptr) -> next {
        next := add(ptr, 0x20)
    }

    function array_nextElement_t_array$_t_struct$_Stake_$2096_memory_ptr_$dyn_memory_ptr(ptr) -> next {
        next := add(ptr, 0x20)
    }

    function array_storeLengthForEncoding_t_array$_t_struct$_Escrow_$2103_memory_ptr_$dyn_memory_ptr_fromStack(pos, length) -> updated_pos {
        mstore(pos, length)
        updated_pos := add(pos, 0x20)
    }

    function array_storeLengthForEncoding_t_array$_t_struct$_Stake_$2096_memory_ptr_$dyn_memory_ptr_fromStack(pos, length) -> updated_pos {
        mstore(pos, length)
        updated_pos := add(pos, 0x20)
    }

    function array_storeLengthForEncoding_t_bytes_memory_ptr_fromStack(pos, length) -> updated_pos {
        mstore(pos, length)
        updated_pos := add(pos, 0x20)
    }

    function array_storeLengthForEncoding_t_string_memory_ptr_fromStack(pos, length) -> updated_pos {
        mstore(pos, length)
        updated_pos := add(pos, 0x20)
    }

    function array_storeLengthForEncoding_t_string_memory_ptr_nonPadded_inplace_fromStack(pos, length) -> updated_pos {
        updated_pos := pos
    }

    function checked_add_t_uint256(x, y) -> sum {
        x := cleanup_t_uint256(x)
        y := cleanup_t_uint256(y)

        // overflow, if x > (maxValue - y)
        if gt(x, sub(0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff, y)) { panic_error_0x11() }

        sum := add(x, y)
    }

    function checked_div_t_uint256(x, y) -> r {
        x := cleanup_t_uint256(x)
        y := cleanup_t_uint256(y)
        if iszero(y) { panic_error_0x12() }

        r := div(x, y)
    }

    function checked_mul_t_uint256(x, y) -> product {
        x := cleanup_t_uint256(x)
        y := cleanup_t_uint256(y)

        // overflow, if x != 0 and y > (maxValue / x)
        if and(iszero(iszero(x)), gt(y, div(0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff, x))) { panic_error_0x11() }

        product := mul(x, y)
    }

    function checked_sub_t_uint256(x, y) -> diff {
        x := cleanup_t_uint256(x)
        y := cleanup_t_uint256(y)

        if lt(x, y) { panic_error_0x11() }

        diff := sub(x, y)
    }

    function cleanup_t_address(value) -> cleaned {
        cleaned := cleanup_t_uint160(value)
    }

    function cleanup_t_bool(value) -> cleaned {
        cleaned := iszero(iszero(value))
    }

    function cleanup_t_bytes4(value) -> cleaned {
        cleaned := and(value, 0xffffffff00000000000000000000000000000000000000000000000000000000)
    }

    function cleanup_t_uint160(value) -> cleaned {
        cleaned := and(value, 0xffffffffffffffffffffffffffffffffffffffff)
    }

    function cleanup_t_uint256(value) -> cleaned {
        cleaned := value
    }

    function cleanup_t_uint8(value) -> cleaned {
        cleaned := and(value, 0xff)
    }

    function copy_calldata_to_memory(src, dst, length) {
        calldatacopy(dst, src, length)
        // clear end
        mstore(add(dst, length), 0)
    }

    function copy_memory_to_memory(src, dst, length) {
        let i := 0
        for { } lt(i, length) { i := add(i, 32) }
        {
            mstore(add(dst, i), mload(add(src, i)))
        }
        if gt(i, length)
        {
            // clear end
            mstore(add(dst, length), 0)
        }
    }

    function decrement_t_uint256(value) -> ret {
        value := cleanup_t_uint256(value)
        if eq(value, 0x00) { panic_error_0x11() }
        ret := sub(value, 1)
    }

    function extract_byte_array_length(data) -> length {
        length := div(data, 2)
        let outOfPlaceEncoding := and(data, 1)
        if iszero(outOfPlaceEncoding) {
            length := and(length, 0x7f)
        }

        if eq(outOfPlaceEncoding, lt(length, 32)) {
            panic_error_0x22()
        }
    }

    function finalize_allocation(memPtr, size) {
        let newFreePtr := add(memPtr, round_up_to_mul_of_32(size))
        // protect against overflow
        if or(gt(newFreePtr, 0xffffffffffffffff), lt(newFreePtr, memPtr)) { panic_error_0x41() }
        mstore(64, newFreePtr)
    }

    function increment_t_uint256(value) -> ret {
        value := cleanup_t_uint256(value)
        if eq(value, 0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff) { panic_error_0x11() }
        ret := add(value, 1)
    }

    function mod_t_uint256(x, y) -> r {
        x := cleanup_t_uint256(x)
        y := cleanup_t_uint256(y)
        if iszero(y) { panic_error_0x12() }
        r := mod(x, y)
    }

    function panic_error_0x11() {
        mstore(0, 35408467139433450592217433187231851964531694900788300625387963629091585785856)
        mstore(4, 0x11)
        revert(0, 0x24)
    }

    function panic_error_0x12() {
        mstore(0, 35408467139433450592217433187231851964531694900788300625387963629091585785856)
        mstore(4, 0x12)
        revert(0, 0x24)
    }

    function panic_error_0x22() {
        mstore(0, 35408467139433450592217433187231851964531694900788300625387963629091585785856)
        mstore(4, 0x22)
        revert(0, 0x24)
    }

    function panic_error_0x32() {
        mstore(0, 35408467139433450592217433187231851964531694900788300625387963629091585785856)
        mstore(4, 0x32)
        revert(0, 0x24)
    }

    function panic_error_0x41() {
        mstore(0, 35408467139433450592217433187231851964531694900788300625387963629091585785856)
        mstore(4, 0x41)
        revert(0, 0x24)
    }

    function revert_error_15abf5612cd996bc235ba1e55a4a30ac60e6bb601ff7ba4ad3f179b6be8d0490() {
        revert(0, 0)
    }

    function revert_error_1b9f4a0a5773e33b91aa01db23bf8c55fce1411167c872835e7fa00a4f17d46d() {
        revert(0, 0)
    }

    function revert_error_81385d8c0b31fffe14be1da910c8bd3a80be4cfa248e04f42ec0faea3132a8ef() {
        revert(0, 0)
    }

    function revert_error_987264b3b1d58a9c7f8255e93e81c77d86d6299019c33110a076957a3e06e2ae() {
        revert(0, 0)
    }

    function revert_error_c1322bf8034eace5e0b5c7295db60986aa89aae5e0ea0873e4689e076861a5db() {
        revert(0, 0)
    }

    function revert_error_dbdddcbe895c83990c08b3492a0e83918d802a52331272ac6fdb6a7c4aea3b1b() {
        revert(0, 0)
    }

    function round_up_to_mul_of_32(value) -> result {
        result := and(add(value, 31), not(31))
    }

    function store_literal_in_memory_108243f05f98f8ed7596519bda107c5c19e5faad2a814dc1c755c10eb7a63698(memPtr) {

        mstore(add(memPtr, 0), "Can't stake more than you own")

    }

    function store_literal_in_memory_1225017fdc7279b05beb5331e5c3726ccc6f1435fadbdafb11a4b4aa5c37dba6(memPtr) {

        mstore(add(memPtr, 0), "Not EAB owner")

    }

    function store_literal_in_memory_1e766a06da43a53d0f4c380e06e5a342e14d5af1bf8501996c844905530ca84e(memPtr) {

        mstore(add(memPtr, 0), "ERC721: transfer to non ERC721Re")

        mstore(add(memPtr, 32), "ceiver implementer")

    }

    function store_literal_in_memory_245f15ff17f551913a7a18385165551503906a406f905ac1c2437281a7cd0cfe(memPtr) {

        mstore(add(memPtr, 0), "Ownable: new owner is the zero a")

        mstore(add(memPtr, 32), "ddress")

    }

    function store_literal_in_memory_277f8ee9d5b4fc3c4149386f24de0fc1bbc63a8210e2197bfd1c0376a2ac5f48(memPtr) {

        mstore(add(memPtr, 0), "ERC721: transfer from incorrect ")

        mstore(add(memPtr, 32), "owner")

    }

    function store_literal_in_memory_2a63ce106ef95058ed21fd07c42a10f11dc5c32ac13a4e847923f7759f635d57(memPtr) {

        mstore(add(memPtr, 0), "ERC721: token already minted")

    }

    function store_literal_in_memory_3f15e51fb138d6720f88f6a2b806f6ff3665198e58ccf2c9167b791866275d6d(memPtr) {

        mstore(add(memPtr, 0), "Insufficient pool balance")

    }

    function store_literal_in_memory_455fea98ea03c32d7dd1a6f1426917d80529bf47b3ccbde74e7206e889e709f4(memPtr) {

        mstore(add(memPtr, 0), "ERC721: transfer to the zero add")

        mstore(add(memPtr, 32), "ress")

    }

    function store_literal_in_memory_45fe4329685be5ecd250fd0e6a25aea0ea4d0e30fb6a73c118b95749e6d70d05(memPtr) {

        mstore(add(memPtr, 0), "ERC721: approve to caller")

    }

    function store_literal_in_memory_5e70ebd1d4072d337a7fabaa7bda70fa2633d6e3f89d5cb725a16b10d07e54c6(memPtr) {

        mstore(add(memPtr, 0), "Invalid token")

    }

    function store_literal_in_memory_6d05c90094f31cfeb8f0eb86f0a513af3f7f8992991fbde41b08aa7960677159(memPtr) {

        mstore(add(memPtr, 0), "ERC721: address zero is not a va")

        mstore(add(memPtr, 32), "lid owner")

    }

    function store_literal_in_memory_6d951e8ac07dde84a43735e497d67ee4c524b854e2264cceeaaa6d903de9357f(memPtr) {

        mstore(add(memPtr, 0), "Zero deposit")

    }

    function store_literal_in_memory_7dc431aa9ef2e5168732d01244e6ca375a00642c62aafc98b88be0d2fc808c18(memPtr) {

        mstore(add(memPtr, 0), "Token and amount length not matc")

        mstore(add(memPtr, 32), "hing")

    }

    function store_literal_in_memory_893728d0e71b0800df2adedc4ebc96c8ebb7f6a47f5b7d4635aabadfc4a61040(memPtr) {

        mstore(add(memPtr, 0), "No rewards available")

    }

    function store_literal_in_memory_8a333355a81806ed720720a526142c1e97d1086371f6be2b18561203134ef304(memPtr) {

        mstore(add(memPtr, 0), "ERC721: approve caller is not to")

        mstore(add(memPtr, 32), "ken owner nor approved for all")

    }

    function store_literal_in_memory_8a66f4bb6512ffbfcc3db9b42318eb65f26ac15163eaa9a1e5cfa7bee9d1c7c6(memPtr) {

        mstore(add(memPtr, 0), "ERC721: mint to the zero address")

    }

    function store_literal_in_memory_960ac9243385dd32742e430ea73c1ba76d62a69cc920ff8d3ef2a0a91f5c52c0(memPtr) {

        mstore(add(memPtr, 0), "Incorrect native coin stake amou")

        mstore(add(memPtr, 32), "nt")

    }

    function store_literal_in_memory_9924ebdf1add33d25d4ef888e16131f0a5687b0580a36c21b5c301a6c462effe(memPtr) {

        mstore(add(memPtr, 0), "Ownable: caller is not the owner")

    }

    function store_literal_in_memory_b08d2b0fec7cc108ab049809a8beb42779d969a49299d0c317c907d9db22974f(memPtr) {

        mstore(add(memPtr, 0), "ERC721: invalid token ID")

    }

    function store_literal_in_memory_b364625548658238260fc754e02ba9b5633ef890d9f126ca4b99e0da80d5d624(memPtr) {

        mstore(add(memPtr, 0), "Invalid stake token")

    }

    function store_literal_in_memory_b51b4875eede07862961e8f9365c6749f5fe55c6ee5d7a9e42b6912ad0b15942(memPtr) {

        mstore(add(memPtr, 0), "ERC721: approval to current owne")

        mstore(add(memPtr, 32), "r")

    }

    function store_literal_in_memory_c224ebb31ab85466cf65168a8a37ace88d3c05978c61d9dacd85469e7cae8fa8(memPtr) {

        mstore(add(memPtr, 0), "Cannot claim another's stake")

    }

    function store_literal_in_memory_ce9f2a6150beddab6025238a53bd68a074555e044f821f52e07e94684bc0717f(memPtr) {

        mstore(add(memPtr, 0), "Cannot withdraw another's stake ")

    }

    function store_literal_in_memory_eb80b9f25203511adb7b7660e6222669e088cedd0909cd81ed7470e34dcd010b(memPtr) {

        mstore(add(memPtr, 0), "ERC721: caller is not token owne")

        mstore(add(memPtr, 32), "r nor approved")

    }

    function store_literal_in_memory_ed9692b83170e55eb6a26c718b63a533a2866ff38aaecd6ca69203549eb1383b(memPtr) {

        mstore(add(memPtr, 0), "Too soon to exchange EAB")

    }

    function store_literal_in_memory_f99853c48c1ddbeea36abcebf54ce6fdb4da9c9253ee4271bf7ddd8fead72dde(memPtr) {

        mstore(add(memPtr, 0), "Invalid stake duration")

    }

    function validator_revert_t_address(value) {
        if iszero(eq(value, cleanup_t_address(value))) { revert(0, 0) }
    }

    function validator_revert_t_bool(value) {
        if iszero(eq(value, cleanup_t_bool(value))) { revert(0, 0) }
    }

    function validator_revert_t_bytes4(value) {
        if iszero(eq(value, cleanup_t_bytes4(value))) { revert(0, 0) }
    }

    function validator_revert_t_uint256(value) {
        if iszero(eq(value, cleanup_t_uint256(value))) { revert(0, 0) }
    }

    function validator_revert_t_uint8(value) {
        if iszero(eq(value, cleanup_t_uint8(value))) { revert(0, 0) }
    }

}
