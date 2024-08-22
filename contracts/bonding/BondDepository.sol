// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.0;

import "./NoteKeeper.sol";

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./IBondDepository.sol";
import "../access/SimpleRoleAccess.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract BondDepository is
    IBondDepository,
    NoteKeeper,
    SimpleRoleAccess,
    UUPSUpgradeable
{
    /* ======== DEPENDENCIES ======== */

    using SafeERC20 for IERC20;

    /* ======== STATE VARIABLES ======== */

    // Storage
    Market[] public markets; // persistent market data
    Terms[] public terms; // deposit construction data
    Metadata[] public metadata; // extraneous market data
    mapping(uint256 => Adjustment) public adjustments; // control variable changes

    // Queries
    mapping(address => uint256[]) public marketsForQuote; // market IDs for quote token

    /* ======== CONSTRUCTOR ======== */

    function initialize(
        address _nend,
        address _insurancePool,
        address _ecosystemPool
    ) public virtual initializer {
        __NoteKeeper_init(_nend, _insurancePool, _ecosystemPool);
        __MWOwnable_init();
        __Testing_init();
    }

    /* ======== DEPOSIT ======== */

    /**
     * @notice             deposit quote tokens in exchange for a bond from a specified market
     * @param _id          the ID of the market
     * @param _amount      the amount of quote token to spend
     * @param _maxPrice    the maxeimum price at which to buy
     * @return payout_     the amount of NEND due
     * @return index_      the user index of the Note (usd to redeem or query information)
     */
    function deposit(
        uint256 _id,
        uint256 _amount,
        uint256 _maxPrice
    ) external virtual override returns (uint256 payout_, uint256 index_) {
        Market storage market = markets[_id];
        Terms memory term = terms[_id];
        uint48 currentTime = uint48(block.timestamp);

        // Markets end at a defined timestamp
        // |-------------------------------------| t
        require(currentTime < term.conclusion, "Depository: market concluded");

        // Debt and the control variable decay over time
        _decay(_id, currentTime);

        // Users input a maximum price, which protects them from price changes after
        // entering the mempool. max price is a slippage mitigation measure
        uint256 price = _marketPrice(_id);
        require(price <= _maxPrice, "Depository: more than max price");

        /**
         * payout for the deposit = amount / price
         *
         * where
         * payout = NEND out
         * amount = quote tokens in
         * price = quote tokens : NEND (i.e. 42069 DAI : NENDs)
         *
         * 1e27 = NEND decimals (18) + price decimals (9)
         */
        payout_ =
            ((_amount * 1e27) / price) /
            (10 ** metadata[_id].quoteDecimals);

        // markets have a max payout amount, capping size because deposits
        // do not experience slippage. max payout is recalculated upon tuning
        require(payout_ <= market.maxPayout, "Depository: max size exceeded");

        /*
         * each market is initialized with a capacity
         *
         * this is either the number of NEND that the market can sell
         * (if capacity in quote is false),
         *
         * or the number of quote tokens that the market can buy
         * (if capacity in quote is true)
         */
        market.capacity -= market.capacityInQuote ? _amount : payout_;

        /**
         * bonds mature with a cliff at a set timestamp
         * prior to the expiry timestamp, no payout tokens are accessible to the user
         * after the expiry timestamp, the entire payout can be redeemed
         *
         * there are two types of bonds: fixed-term and fixed-expiration
         *
         * fixed-term bonds mature in a set amount of time from deposit
         * i.e. term = 1 week. when alice deposits on day 1, her bond
         * expires on day 8. when bob deposits on day 2, his bond expires day 9.
         *
         * fixed-expiration bonds mature at a set timestamp
         * i.e. expiration = day 10. when alice deposits on day 1, her term
         * is 9 days. when bob deposits on day 2, his term is 8 days.
         */

        // markets keep track of how many quote tokens have been
        // purchased, and how much NEND has been sold
        market.purchased += _amount;
        market.sold += uint64(payout_);

        // incrementing total debt raises the price of the next bond
        market.totalDebt += uint64(payout_);

        /**
         * user data is stored as Notes. these are isolated array entries
         * storing the amount due, the time created, the time when payout
         * is redeemable, the time when payout was redeemed, and the ID
         * of the market deposited into
         */
        index_ = addNote(uint48(_id), _amount, price, msg.sender, payout_);

        // transfer payment to treasury
        market.quoteToken.safeTransferFrom(msg.sender, ecosystemPool, _amount);

        // if max debt is breached, the market is closed
        // this a circuit breaker
        if (term.maxDebt < market.totalDebt) {
            market.capacity = 0;
            emit CloseMarket(_id);
        } else {
            // if market will continue, the control variable is tuned to hit targets on time
            _tune(_id, currentTime);
        }
    }

    /**
     * @notice             decay debt, and adjust control variable if there is an active change
     * @param _id          ID of market
     * @param _time        uint48 timestamp (saves gas when passed in)
     */
    function _decay(uint256 _id, uint48 _time) internal virtual {
        // Debt decay

        /*
         * Debt is a time-decayed sum of tokens spent in a market
         * Debt is added when deposits occur and removed over time
         * |
         * |    debt falls with
         * |   / \  inactivity       / \
         * | /     \              /\/    \
         * |         \           /         \
         * |           \      /\/            \
         * |             \  /  and rises       \
         * |                with deposits
         * |
         * |------------------------------------| t
         */
        markets[_id].totalDebt -= _debtDecay(_id);
        metadata[_id].lastDecay = _time;

        // Control variable decay

        // The bond control variable is continually tuned. When it is lowered (which
        // lowers the market price), the change is carried out smoothly over time.
        if (adjustments[_id].active) {
            Adjustment storage adjustment = adjustments[_id];

            (
                uint256 adjustBy,
                uint48 secondsSince,
                bool stillActive
            ) = _controlDecay(_id);
            terms[_id].controlVariable -= adjustBy;

            if (stillActive) {
                adjustment.change -= adjustBy;
                adjustment.timeToAdjusted -= secondsSince;
                adjustment.lastAdjustment = _time;
            } else {
                adjustment.active = false;
            }
        }
    }

    /**
     * @notice             auto-adjust control variable to hit capacity/spend target
     * @param _id          ID of market
     * @param _time        uint48 timestamp (saves gas when passed in)
     */
    function _tune(uint256 _id, uint48 _time) internal virtual {
        Metadata memory meta = metadata[_id];

        if (_time >= meta.lastTune + meta.tuneInterval) {
            Market memory market = markets[_id];

            // compute seconds remaining until market will conclude
            uint256 timeRemaining = terms[_id].conclusion - _time;
            uint256 price = _marketPrice(_id);

            // standardize capacity into an base token amount
            // NEND decimals (9) + price decimals (9)
            uint256 capacity = market.capacityInQuote
                ? ((market.capacity * 1e27) / price) /
                    (10 ** meta.quoteDecimals)
                : market.capacity;

            /**
             * calculate the correct payout to complete on time assuming each bond
             * will be max size in the desired deposit interval for the remaining time
             *
             * i.e. market has 10 days remaining. deposit interval is 1 day. capacity
             * is 10,000 NEND. max payout would be 1,000 NEND (10,000 * 1 / 10).
             */
            markets[_id].maxPayout = uint64(
                (capacity * meta.depositInterval) / timeRemaining
            );

            // calculate the ideal total debt to satisfy capacity in the remaining time
            uint256 targetDebt = (capacity * meta.length) / timeRemaining;

            // derive a new control variable from the target debt and current supply
            uint64 newControlVariable = uint64(
                (price * NEND(nend).timeSlicedCrossChainSupply()) / targetDebt
            );

            if (newControlVariable >= terms[_id].controlVariable) {
                terms[_id].controlVariable = newControlVariable;
            } else {
                // if decrease, control variable change will be carried out over the tune interval
                // this is because price will be lowered
                uint256 change = terms[_id].controlVariable -
                    newControlVariable;
                adjustments[_id] = Adjustment(
                    change,
                    _time,
                    meta.tuneInterval,
                    true
                );
            }
            metadata[_id].lastTune = _time;
        }
    }

    /* ======== CREATE ======== */

    function create(
        IERC20 _quoteToken,
        uint256 _capacity,
        bool _capacityInQuote,
        uint256 _initialPrice,
        uint48 _conclusion,
        uint32 _depositInterval,
        uint32 _tuneInterval
    ) external virtual override onlyRole("admin") returns (uint256 id_) {
        uint256 secondsToConclusion = _conclusion - block.timestamp;

        // the decimal count of the quote token
        uint256 decimals = ERC20(address(_quoteToken)).decimals();

        /*
         * initial target debt is equal to capacity (this is the amount of debt
         * that will decay over in the length of the program if price remains the same).
         * it is converted into base token terms if passed in in quote token terms.
         *
         * 1e27 = NEND decimals (18) + initial price decimals (9)
         */
        uint256 targetDebt = _capacityInQuote
            ? ((_capacity * 1e27) / _initialPrice) / 10 ** decimals
            : _capacity;

        // depositing into, or getting info for, the created market uses this ID
        id_ = markets.length;

        markets.push(
            Market({
                quoteToken: _quoteToken,
                capacityInQuote: _capacityInQuote,
                capacity: _capacity,
                totalDebt: targetDebt,
                maxPayout: (targetDebt * _depositInterval) /
                    secondsToConclusion,
                purchased: 0,
                sold: 0
            })
        );

        terms.push(
            Terms({
                controlVariable: (_initialPrice *
                    NEND(nend).timeSlicedCrossChainSupply()) / targetDebt,
                conclusion: uint48(_conclusion),
                maxDebt: targetDebt + ((targetDebt * 1000000) / 1e5)
            })
        );

        metadata.push(
            Metadata({
                lastTune: uint48(block.timestamp),
                lastDecay: uint48(block.timestamp),
                length: uint48(secondsToConclusion),
                depositInterval: _depositInterval,
                tuneInterval: _tuneInterval,
                quoteDecimals: uint8(decimals)
            })
        );

        marketsForQuote[address(_quoteToken)].push(id_);

        emit CreateMarket(
            id_,
            address(_quoteToken),
            uint48(_conclusion),
            _capacity,
            _capacityInQuote
        );
    }

    /**
     * @notice             disable existing market
     * @param _id          ID of market to close
     */
    function close(uint256 _id) external override onlyRole("admin") {
        terms[_id].conclusion = uint48(block.timestamp);
        markets[_id].capacity = 0;
        emit CloseMarket(_id);
    }

    /* ======== EXTERNAL VIEW ======== */

    function getMarketData(
        uint256 _id
    ) external view virtual override returns (uint256, uint256, uint256) {
        uint256 currentPrice = _marketPrice(_id);

        return (
            currentPrice,
            markets[_id].capacity,
            (markets[_id].maxPayout *
                (10 ** metadata[_id].quoteDecimals) *
                currentPrice) / 1e27
        );
    }

    /* ======== INTERNAL VIEW ======== */

    function _debtDecay(uint256 _id) internal view returns (uint64) {
        Metadata memory meta = metadata[_id];

        uint256 secondsSince = block.timestamp - meta.lastDecay;

        return uint64((markets[_id].totalDebt * secondsSince) / meta.length);
    }

    /**
     * @notice                  calculate current market price of quote token in base token
     * @dev                     see marketPrice() for explanation of price computation
     * @dev                     uses info from storage because data has been updated before call (vs marketPrice())
     * @param _id               market ID
     * @return                  price for market in NEND decimals
     */
    function _marketPrice(uint256 _id) internal view virtual returns (uint256) {
        return
            (terms[_id].controlVariable * _debtRatio(_id)) /
            (10 ** metadata[_id].quoteDecimals);
    }

    /**
     * @notice                  calculate debt factoring in decay
     * @dev                     uses info from storage because data has been updated before call (vs debtRatio())
     * @param _id               market ID
     * @return                  current debt for market in quote decimals
     */
    function _debtRatio(uint256 _id) internal view virtual returns (uint256) {
        return
            (markets[_id].totalDebt * (10 ** metadata[_id].quoteDecimals)) /
            NEND(nend).timeSlicedCrossChainSupply();
    }

    /**
     * @notice                  amount to decay control variable by
     * @param _id               ID of market
     * @return decay_           change in control variable
     * @return secondsSince_    seconds since last change in control variable
     * @return active_          whether or not change remains active
     */
    function _controlDecay(
        uint256 _id
    )
        internal
        view
        virtual
        returns (uint256 decay_, uint48 secondsSince_, bool active_)
    {
        Adjustment memory info = adjustments[_id];
        if (!info.active) return (0, 0, false);

        secondsSince_ = uint48(block.timestamp) - info.lastAdjustment;

        active_ = secondsSince_ < info.timeToAdjusted;
        decay_ = active_
            ? (info.change * secondsSince_) / info.timeToAdjusted
            : info.change;
    }

    function _authorizeUpgrade(address) internal virtual override onlyOwner {}
}
