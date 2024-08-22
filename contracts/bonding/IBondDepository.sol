// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IBondDepository {
    event CreateMarket(
        uint256 indexed id,
        address indexed quoteToken,
        uint48 conclusion,
        uint256 capacity,
        bool capacityInQuote
    );
    event CloseMarket(uint256 indexed id);

    // Info about each type of market
    struct Market {
        uint256 capacity; // capacity remaining
        IERC20 quoteToken; // token to accept as payment
        bool capacityInQuote; // capacity limit is in payment token (true) or in OHM (false, default)
        uint256 totalDebt; // total debt from market
        uint256 maxPayout; // max tokens in/out (determined by capacityInQuote false/true, respectively)
        uint256 sold; // base tokens out
        uint256 purchased; // quote tokens in
    }

    // Info for creating new markets
    struct Terms {
        uint256 controlVariable; // scaling variable for price
        uint48 conclusion; // timestamp when market no longer offered (doubles as time when market matures if fixed-expiry)
        uint256 maxDebt; // 9 decimal debt maximum in OHM
    }

    // Additional info about market.
    struct Metadata {
        uint48 lastTune; // last timestamp when control variable was tuned
        uint48 lastDecay; // last timestamp when market was created and debt was decayed
        uint48 length; // time from creation to conclusion. used as speed to decay debt.
        uint48 depositInterval; // target frequency of deposits
        uint48 tuneInterval; // frequency of tuning
        uint8 quoteDecimals; // decimals of quote token
    }

    // Control variable adjustment data
    struct Adjustment {
        uint256 change;
        uint48 lastAdjustment;
        uint48 timeToAdjusted;
        bool active;
    }

    /**
     * @notice deposit market
     * @param _bid uint256
     * @param _amount uint256
     * @param _maxPrice uint256
     * @return payout_ uint256
     * @return index_ uint256
     */
    function deposit(
        uint256 _bid,
        uint256 _amount,
        uint256 _maxPrice
    ) external returns (uint256 payout_, uint256 index_);

    function create(
        IERC20 _quoteToken,
        uint256 _capacity,
        bool _capacityInQuote,
        uint256 _initialPrice,
        uint48 _conclusion,
        uint32 _depositInterval,
        uint32 _tuneInterval
    ) external returns (uint256 id_);

    function close(uint256 _id) external;

    function getMarketData(uint256 _id)
        external
        returns (
            uint256,
            uint256,
            uint256
        );
}
