// SPDX-License-Identifier: MIT
pragma solidity >=0.8.7;

// import "./PeriFiLoanAdmin.sol";
import "../PeriFiAdmin.sol";
import "./TrustDeed.sol";
import "../PeriFiAdmin.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721URIStorageUpgradeable.sol";
import "../interfaces/INonStandardERC721Transfer.sol";
import "./LoanAuction.sol";
import "./LoanRepaymentCalculator.sol";
import "../vault/LendingPool.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

enum LiquidationTrigger {
    OverDue,
    LowHealthFactor
}

enum LiquidationMethod {
    Auction,
    TransferredToLender
}

// contract PeriFiLoan is PeriFiLoanAdmin, ERC721, ERC721URIStorage {
contract PeriFiLoan is
    ERC721URIStorageUpgradeable,
    ReentrancyGuard,
    UUPSUpgradeable,
    PausableUpgradeable,
    MWOwnable
{
    using SafeMath for uint256;
    using ECDSA for bytes32;

    struct Loan {
        // A unique identifier for this particular loan, sourced from the
        // continuously increasing parameter totalNumLoans.
        uint256 index;
        // The original sum of money transferred from lender to borrower at the
        // beginning of the loan, measured in paymentToken's smallest
        // units.
        uint256 loanAmount;
        // The original sum of money transferred from leverage pool to borrower
        // at the beginnig of the loan, measured in paymentToken's
        // smallest units.
        uint256 loanLeveragedAmount;
        // The maximum amount of money that the borrower would be required to
        // repay retrieve their collateral, measured in paymentToken's
        // smallest units. If interestIsProRated is set to false, then the
        // borrower will always have to pay this amount to retrieve their
        // collateral, regardless of whether they repay early.
        uint256 repaymentAmount;
        // The ID within the tokenAddress for the NFT being used as
        // collateral for this loan. The NFT is stored within this contract
        // during the duration of the loan.
        uint256 tokenId;
        // The block.timestamp when the loan first began (measured in seconds).
        uint64 loanStartTime;
        // The amount of time (measured in seconds) that can elapse before the
        // lender can liquidate the loan and seize the underlying collateral.
        uint32 loanDuration;
        uint32 commissionBasisPoints;
        // The ERC721 contract of the NFT collateral
        address tokenAddress;
        // The ERC20 contract of the currency being used as principal/interest
        // for this loan.
        address paymentToken;
        // The address of the borrower.
        address borrower;
        bool liquidateViaAuction;
    }

    event LoanStarted(
        uint256 loanIndex,
        address borrower,
        address lender,
        uint256 loanAmount,
        uint256 loanLeveragedAmount,
        uint256 repaymentAmount,
        uint256 tokenId,
        uint256 loanStartTime,
        uint256 loanDuration,
        address tokenAddress,
        address paymentToken,
        bool liquidateViaAuction
    );

    event LoanTrustDeedIssued(uint256 loanIndex);

    event LoanRepaid(
        uint256 loanIndex,
        address borrower,
        address lender,
        uint256 loanAmount,
        uint256 tokenId,
        uint256 amountPaidToLender,
        uint256 interestForIV,
        address tokenAddress,
        address paymentToken
    );

    event LoanLiquidated(
        uint256 loanIndex,
        address borrower,
        address lender,
        uint256 loanAmount,
        uint256 tokenId,
        uint256 loanMaturityDate,
        uint256 loanLiquidationDate,
        address tokenAddress,
        LiquidationTrigger trigger,
        LiquidationMethod method
    );

    address public periFiAdminAddr;

    address public loanRepaymentAddr;

    address public trustDeedAddr;

    address public auctionAddr;

    uint256 public totalNumLoans;

    uint256 public totalActiveLoans;

    mapping(uint256 => Loan) public indexToLoan;

    mapping(uint256 => uint256) public indexToMaturityDate;

    mapping(uint256 => bool) public loanRepaidOrLiquidated;

    mapping(address => mapping(uint256 => bool))
        private _nonceHasBeenUsedForUser;

    function initialize(
        address _periFiAdminAddr,
        address _loanRepaymentAddr,
        address _auctionAddr,
        address _trustDeedAddr
    ) public virtual initializer {
        periFiAdminAddr = _periFiAdminAddr;
        auctionAddr = _auctionAddr;
        trustDeedAddr = _trustDeedAddr;
        loanRepaymentAddr = _loanRepaymentAddr;

        __ERC721_init("PeriFi Loan Promissory Note", "PPN");
        __Pausable_init();
        __MWOwnable_init();
    }

    function _burn(
        uint256 tokenId
    ) internal virtual override(ERC721URIStorageUpgradeable) {
        super._burn(tokenId);
    }

    function setTokenURI(uint256 tokenId, string memory uri) external virtual {
        super._setTokenURI(tokenId, uri);
    }

    function tokenURI(
        uint256 tokenId
    )
        public
        view
        virtual
        override(ERC721URIStorageUpgradeable)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function beginLoan(
        uint256 _loanAmount,
        uint256 _loanLeveragedAmount,
        uint256 _repaymentAmount,
        uint256 _tokenId,
        uint256 _loanDuration,
        uint256 _commissionBasisPoints,
        uint256[2] memory _borrowerAndLenderNonces,
        address _tokenAddress,
        address _paymentToken,
        address _lender,
        bytes memory _borrowerSignature,
        bytes memory _lenderSignature,
        bool _liquidateViaAuction
    ) public virtual whenNotPaused nonReentrant {
        // Save loan details to a struct in memory first, to save on gas if any
        // of the below checks fail, and to avoid the "Stack Too Deep" error by
        // clumping the parameters together into one struct held in memory.
        Loan memory loan = Loan({
            index: totalNumLoans, //currentloanIndex,
            loanAmount: _loanAmount,
            loanLeveragedAmount: _loanLeveragedAmount,
            repaymentAmount: _repaymentAmount,
            tokenId: _tokenId,
            loanStartTime: uint64(block.timestamp), //_loanStartTime
            loanDuration: uint32(_loanDuration),
            // loanInterestRateForDurationInBasisPoints: uint32(_loanInterestRateForDurationInBasisPoints),
            commissionBasisPoints: uint32(_commissionBasisPoints),
            tokenAddress: _tokenAddress,
            paymentToken: _paymentToken,
            borrower: msg.sender, //borrower
            // interestIsProRated: (_loanInterestRateForDurationInBasisPoints != ~(uint32(0))),
            liquidateViaAuction: _liquidateViaAuction
        });

        PeriFiAdmin periFiAdmin = PeriFiAdmin(periFiAdminAddr);
        // Sanity check loan values.
        require(
            loan.repaymentAmount >= loan.loanAmount,
            "Negative interest rate loans are not allowed."
        );
        require(
            uint256(loan.loanDuration) <= periFiAdmin.maximumLoanDuration(),
            "Loan duration exceeds maximum loan duration"
        );
        require(
            uint256(loan.loanDuration) != 0,
            "Loan duration cannot be zero"
        );
        // require(uint256(loan.commissionBasisPoints) == periFiAdmin.commissionForIFL(), 'The admin fee has changed since this order was signed.');

        require(
            loan.loanAmount > loan.loanLeveragedAmount,
            "Leveraged value exceeds total loan amount"
        );
        // Check that both the collateral and the principal come from supported
        // contracts.

        // require(periFiAdmin.erc20CurrencyIsWhitelisted(loan.paymentToken), 'Currency denomination is not whitelisted to be used by this contract');
        // require(PeriFiAdmin(perifiAdmin).nftContractIsWhitelisted(loan.tokenAddress), 'NFT collateral contract is not whitelisted to be used by this contract');

        // Check loan nonces. These are different from Ethereum account nonces.
        // Here, these are uint256 numbers that should uniquely identify
        // each signature for each user (i.e. each user should only create one
        // off-chain signature for each nonce, with a nonce being any arbitrary
        // uint256 value that they have not used yet for an off-chain
        // signature).
        require(
            !_nonceHasBeenUsedForUser[msg.sender][_borrowerAndLenderNonces[0]],
            "Borrower nonce invalid, borrower has either cancelled/begun this loan, or reused this nonce when signing"
        );
        _nonceHasBeenUsedForUser[msg.sender][
            _borrowerAndLenderNonces[0]
        ] = true;
        require(
            !_nonceHasBeenUsedForUser[_lender][_borrowerAndLenderNonces[1]],
            "Lender nonce invalid, lender has either cancelled/begun this loan, or reused this nonce when signing"
        );
        _nonceHasBeenUsedForUser[_lender][_borrowerAndLenderNonces[1]] = true;

        // Check that both signatures are valid.
        require(
            isValidBorrowerSignature(
                loan.tokenId,
                _borrowerAndLenderNonces[0], //_borrowerNonce,
                loan.tokenAddress,
                msg.sender, //borrower,
                _borrowerSignature
            ),
            "Borrower signature is invalid"
        );

        require(
            isValidLenderSignature(
                loan.loanAmount,
                loan.loanLeveragedAmount,
                loan.repaymentAmount,
                loan.tokenId,
                loan.loanDuration,
                // loan.loanInterestRateForDurationInBasisPoints,
                loan.commissionBasisPoints,
                _borrowerAndLenderNonces[1], //_lenderNonce,
                loan.tokenAddress,
                loan.paymentToken,
                _lender,
                loan.liquidateViaAuction,
                // loan.interestIsProRated,
                _lenderSignature
            ),
            "Lender signature is invalid"
        );

        // Add the loan to storage before moving collateral/principal to follow
        // the Checks-Effects-Interactions pattern.
        indexToLoan[totalNumLoans] = loan;

        uint256 loanMaturityDate = (uint256(loan.loanStartTime)).add(
            uint256(loan.loanDuration)
        );
        indexToMaturityDate[totalNumLoans] = loanMaturityDate;

        totalNumLoans = totalNumLoans.add(1);

        // Update number of active loans.
        totalActiveLoans = totalActiveLoans.add(1);
        require(
            totalActiveLoans <= periFiAdmin.maximumNumberOfActiveLoans(),
            "Contract has reached the maximum number of active loans allowed by admins"
        );

        // Transfer collateral from borrower to this contract to be held until
        // loan completion.liquidateOverdueLoan
        IERC721(loan.tokenAddress).transferFrom(
            msg.sender,
            address(this),
            loan.tokenId
        );

        uint256 lenderAllowance = IERC20(loan.paymentToken).allowance(
            _lender,
            address(this)
        );
        if (loan.loanLeveragedAmount > 0) {
            uint256 loanFromLender = loan.loanAmount - loan.loanLeveragedAmount;
            // Transfer principal from lender to borrower.
            // uint256 poolAllowance = IERC20(loan.paymentToken).allowance(lendingPoolAddr, address(this));
            require(
                lenderAllowance >= loanFromLender,
                "ERC20 allowance is not set by lender or not enough balance"
            );
            // require(poolAllowance >= loan.loanLeveragedAmount, 'ERC20 allowance is not set by lender or not enough balance');
            IERC20(loan.paymentToken).transferFrom(
                _lender,
                msg.sender,
                loanFromLender
            );
            LoanRepaymentCalculator calculator = LoanRepaymentCalculator(
                loanRepaymentAddr
            );
            address lendingPoolAddr = calculator.lendingPoolAddress();
            LendingPool(payable(lendingPoolAddr)).leverageLoan(
                loan.index,
                loan.paymentToken,
                loan.loanLeveragedAmount,
                msg.sender
            );
            // IERC20(loan.paymentToken).transferFrom(lendingPoolAddr, msg.sender, loan.loanLeveragedAmount);
        } else {
            require(
                lenderAllowance >= loan.loanAmount,
                "ERC20 allowance is not set by lender or not enough balance"
            );
            IERC20(loan.paymentToken).transferFrom(
                _lender,
                msg.sender,
                loan.loanAmount
            );
        }

        // Issue an ERC721 promissory note to the lender that gives them the
        // right to either the principal-plus-interest or the collateral.
        _mint(_lender, loan.index);

        // Emit an event with all relevant details from this transaction.
        emit LoanStarted(
            loan.index,
            msg.sender, //borrower,
            _lender,
            loan.loanAmount,
            loan.loanLeveragedAmount,
            loan.repaymentAmount,
            loan.tokenId,
            block.timestamp, //_loanStartTime
            loan.loanDuration,
            // loan.loanInterestRateForDurationInBasisPoints,
            loan.tokenAddress,
            loan.paymentToken,
            loan.liquidateViaAuction
            // loan.interestIsProRated
        );
    }

    function issueTrustDeed(uint256 _loanIndex) external virtual nonReentrant {
        // Sanity check that payBackLoan() and liquidateOverdueLoan() have
        // never been called on this loanIndex. Depending on how the rest of the
        // code turns out, this check may be unnecessary.
        require(
            !loanRepaidOrLiquidated[_loanIndex],
            "Loan has already been repaid or liquidated"
        );

        require(
            trustDeedAddr != address(0),
            "Trust Deed contract hasn't bee set up"
        );

        // Fetch loan details from storage, but store them in memory for the
        // sake of saving gas.
        Loan memory loan = indexToLoan[_loanIndex];

        // Check that the borrower is the caller, only the borrower is entitled
        // to the collateral.
        require(
            msg.sender == loan.borrower,
            "Only the borrower can pay back a loan and reclaim the underlying NFT"
        );

        TrustDeed trustDeedContract = TrustDeed(trustDeedAddr);
        trustDeedContract.safeMint(msg.sender, _loanIndex);
        emit LoanTrustDeedIssued(_loanIndex);
    }

    function payBackLoan(uint256 _loanIndex) external virtual nonReentrant {
        // Sanity check that payBackLoan() and liquidateOverdueLoan() have
        // never been called on this loanIndex. Depending on how the rest of the
        // code turns out, this check may be unnecessary.
        require(
            !loanRepaidOrLiquidated[_loanIndex],
            "Loan has already been repaid or liquidated"
        );

        // Fetch loan details from storage, but store them in memory for the
        // sake of saving gas.
        Loan memory loan = indexToLoan[_loanIndex];

        // Check that the borrower is the caller, only the borrower is entitled
        // to the collateral.
        address currentBorrower = borrower(_loanIndex);
        require(
            msg.sender == currentBorrower,
            "Only the borrower can pay back a loan and reclaim the underlying NFT"
        );

        // Fetch current owner of loan promissory note.
        address lender = ownerOf(_loanIndex);

        LoanRepaymentCalculator calculator = LoanRepaymentCalculator(
            loanRepaymentAddr
        );
        Repayment[] memory repayments = calculator.getDestinations(
            _loanIndex,
            loan.repaymentAmount,
            loan.loanAmount,
            lender
        );
        IERC20 erc20 = IERC20(loan.paymentToken);
        uint repaymentLength = repayments.length;
        for (uint idx = 0; idx < repaymentLength; idx++) {
            Repayment memory repayment = repayments[idx];
            erc20.transferFrom(
                currentBorrower,
                repayment.targetAddress,
                repayment.value
            );
        }

        // Record the ifp amount in lending pool
        Vault(payable(calculator.lendingPoolAddress())).namedBalanceReceive(
            "ifp",
            loan.paymentToken,
            repayments[1].value
        );

        // // Calculate amounts to send to lender and admins
        // uint256 interestDue = (loan.repaymentAmount).sub(loan.loanAmount);
        // if(loan.interestIsProRated == true){
        //     interestDue = _computeInterestDue(
        //         loan.loanAmount,
        //         loan.repaymentAmount,
        //         block.timestamp.sub(uint256(loan.loanStartTime)),
        //         uint256(loan.loanDuration),
        //         uint256(loan.loanInterestRateForDurationInBasisPoints)
        //     );
        // }
        // uint256 iv = _computeInterestForIV(interestDue, uint256(loan.interestForIVInBasisPoints));
        // uint256 interestForLender = computeInterestDistributionForLender(loan.loanAmount, loan.loanLeveragedAmount, interestDue);

        // uint256 payoffAmount = (loan.loanAmount.sub(loan.loanLeveragedAmount)).add(interestForLender);
        // uint256 poolPayoffAmount = (loan.loanLeveragedAmount).add(interestDue.sub(iv).sub(interestForLender));
        // uint256 payoffAmount = ((loan.loanAmount).add(interestDue)).sub(iv);

        // Mark loan as repaid before doing any external transfers to follow
        // the Checks-Effects-Interactions design pattern.
        loanRepaidOrLiquidated[_loanIndex] = true;

        // Update number of active loans.
        totalActiveLoans = totalActiveLoans.sub(1);

        // use suggested calculation for leverage
        // Transfer principal-plus-interest from borrower to lender
        // IERC20(loan.paymentToken).transferFrom(currentBorrower, lender, payoffAmount);

        // Transfer principal-plus-interest from borrower to leverage pool

        // IERC20(loan.paymentToken).transferFrom(currentBorrower, lendingPoolAddr, poolPayoffAmount);

        // Transfer fees from borrower to insurance vault
        // IERC20(loan.paymentToken).transferFrom(currentBorrower, insuranceVaultAddr, iv);

        // Transfer collateral from this contract to borrower.
        require(
            _transferNftToAddress(
                loan.tokenAddress,
                loan.tokenId,
                currentBorrower
            ),
            "NFT was not successfully transferred"
        );

        // Destroy the lender's promissory note.
        _burn(_loanIndex);
        _burnTrustDeed(_loanIndex);
        // Emit an event with all relevant details from this transaction.
        emit LoanRepaid(
            _loanIndex,
            currentBorrower,
            lender,
            loan.loanAmount,
            loan.tokenId,
            loan.repaymentAmount,
            loan.commissionBasisPoints,
            loan.tokenAddress,
            loan.paymentToken
        );

        // Delete the loan from storage in order to achieve a substantial gas
        // savings and to lessen the burden of storage on Ethereum nodes, since
        // we will never access this loan's details again, and the details are
        // still available through event data.
        delete indexToLoan[_loanIndex];
    }

    function liquidateLowHealthFactorLoanViaAuction(
        uint256 _loanIndex
    ) external virtual onlyOwner nonReentrant {
        // Sanity check that payBackLoan() and liquidateOverdueLoan() have
        // never been called on this loanIndex. Depending on how the rest of the
        // code turns out, this check may be unnecessary.
        require(
            !loanRepaidOrLiquidated[_loanIndex],
            "Loan has already been repaid or liquidated"
        );

        require(!isOverdue(_loanIndex, 0), "Loan is overdue");
        // Fetch loan details from storage, but store them in memory for the
        // sake of saving gas.
        Loan memory loan = indexToLoan[_loanIndex];

        // uint256 loanMaturityDate = (uint256(loan.loanStartTime))
        //         .add(uint256(loan.loanDuration));

        // require(block.timestamp < loanMaturityDate, 'Loan is overdue');

        address lender = ownerOf(_loanIndex);

        // Mark loan as liquidated before doing any external transfers to
        // follow the Checks-Effects-Interactions design pattern.
        loanRepaidOrLiquidated[_loanIndex] = true;

        // Update number of active loans.
        totalActiveLoans = totalActiveLoans.sub(1);

        require(
            _transferNftToAddress(loan.tokenAddress, loan.tokenId, auctionAddr),
            "NFT was not successfully transferred"
        );

        address currentBorrower = borrower(_loanIndex);
        _burn(_loanIndex);
        _burnTrustDeed(_loanIndex);
        // Emit an event with all relevant details from this transaction.
        emit LoanLiquidated(
            _loanIndex,
            currentBorrower,
            lender,
            loan.loanAmount,
            loan.tokenId,
            indexToMaturityDate[_loanIndex],
            // loanMaturityDate,
            block.timestamp,
            loan.tokenAddress,
            LiquidationTrigger.LowHealthFactor,
            LiquidationMethod.Auction
        );

        // Delete the loan from storage in order to achieve a substantial gas
        // savings and to lessen the burden of storage on Ethereum nodes, since
        // we will never access this loan's details again, and the details are
        // still available through event data.
        delete indexToLoan[_loanIndex];
    }

    function liquidateOverdueLoanViaAuction(
        uint256 _loanIndex
    ) external virtual nonReentrant {
        // Sanity check that payBackLoan() and liquidateOverdueLoan() have
        // never been called on this loanIndex. Depending on how the rest of the
        // code turns out, this check may be unnecessary.
        require(
            !loanRepaidOrLiquidated[_loanIndex],
            "Loan has already been repaid or liquidated"
        );

        // Fetch loan details from storage, but store them in memory for the
        // sake of saving gas.
        Loan memory loan = indexToLoan[_loanIndex];
        PeriFiAdmin periFiAdmin = PeriFiAdmin(periFiAdminAddr);

        uint256 extraDuration = periFiAdmin.preLiquidationDuration();
        if (!loan.liquidateViaAuction) {
            extraDuration += periFiAdmin.claimCollateralDuration();
        }

        require(
            isOverdue(_loanIndex, extraDuration),
            "Loan is not overdue yet"
        );

        // uint256 loanMaturityDate;
        // if (loan.liquidateViaAuction){
        //     loanMaturityDate = (uint256(loan.loanStartTime))
        //         .add(uint256(loan.loanDuration))
        //         .add(periFiAdmin.preLiquidationDuration());
        // } else {
        //     // check extra 24 hours for the lender to claim
        //     loanMaturityDate = (uint256(loan.loanStartTime))
        //         .add(uint256(loan.loanDuration))
        //         .add(periFiAdmin.preLiquidationDuration())
        //         .add(periFiAdmin.claimCollateralDuration());
        // }
        // require(block.timestamp > loanMaturityDate, 'Loan is not overdue yet');

        address lender = ownerOf(_loanIndex);

        // Mark loan as liquidated before doing any external transfers to
        // follow the Checks-Effects-Interactions design pattern.
        loanRepaidOrLiquidated[_loanIndex] = true;

        // Update number of active loans.
        totalActiveLoans = totalActiveLoans.sub(1);

        require(
            _transferNftToAddress(loan.tokenAddress, loan.tokenId, auctionAddr),
            "NFT was not successfully transferred"
        );

        address currentBorrower = borrower(_loanIndex);
        _burn(_loanIndex);
        _burnTrustDeed(_loanIndex);
        // Emit an event with all relevant details from this transaction.
        emit LoanLiquidated(
            _loanIndex,
            currentBorrower,
            lender,
            loan.loanAmount,
            loan.tokenId,
            indexToMaturityDate[_loanIndex],
            // loanMaturityDate,
            block.timestamp,
            loan.tokenAddress,
            LiquidationTrigger.OverDue,
            LiquidationMethod.Auction
        );

        // Delete the loan from storage in order to achieve a substantial gas
        // savings and to lessen the burden of storage on Ethereum nodes, since
        // we will never access this loan's details again, and the details are
        // still available through event data.
        delete indexToLoan[_loanIndex];
    }

    function liquidateOverdueLoan(
        uint256 _loanIndex
    ) external virtual nonReentrant {
        // Sanity check that payBackLoan() and liquidateOverdueLoan() have
        // never been called on this loanIndex. Depending on how the rest of the
        // code turns out, this check may be unnecessary.
        require(
            !loanRepaidOrLiquidated[_loanIndex],
            "Loan has already been repaid or liquidated"
        );

        PeriFiAdmin periFiAdmin = PeriFiAdmin(periFiAdminAddr);
        require(
            isOverdue(_loanIndex, periFiAdmin.preLiquidationDuration()),
            "Loan is not overdue yet"
        );
        // Fetch loan details from storage, but store them in memory for the
        // sake of saving gas.
        Loan memory loan = indexToLoan[_loanIndex];

        require(
            !loan.liquidateViaAuction,
            "Loan is configured to be liquidated only via auction"
        );
        // Ensure that the loan is indeed overdue, since we can only liquidate
        // overdue loans.

        // uint256 loanMaturityDate = (uint256(loan.loanStartTime))
        //     .add(uint256(loan.loanDuration))
        //     .add(periFiAdmin.preLiquidationDuration());
        // require(block.timestamp > loanMaturityDate, 'Loan is not overdue yet');

        // Fetch the current lender of the promissory note corresponding to
        // this overdue loan.

        address lender = ownerOf(_loanIndex);
        // If the loan is leveraged, the lender must pay for the leverage and its interest.
        // if (loan.loanLeveragedAmount > 0)
        // {
        //     require(msg.sender == lender, 'Only the lender can pay for the leverage and liquidate the underlying NFT');
        //     LoanRepaymentCalculator calculator = LoanRepaymentCalculator(loanRepaymentAddr);
        //     Repayment[] memory repayments = calculator.getDestinations(
        //         _loanIndex,
        //         loan.repaymentAmount,
        //         loan.loanAmount,
        //         lender);
        //     IERC20 erc20 = IERC20(loan.paymentToken);
        //     uint repaymentLength = repayments.length;
        //     for (uint idx = 0; idx < repaymentLength; idx++) {
        //         Repayment memory repayment = repayments[idx];
        //         if (msg.sender == repayment.targetAddress) {
        //             continue;
        //         }
        //         erc20.transferFrom(msg.sender, repayment.targetAddress, repayment.value);
        //     }

        //     // uint256 interestDue = (loan.repaymentAmount).sub(loan.loanAmount);
        //     // uint256 iv = _computeInterestForIV(interestDue, uint256(loan.interestForIVInBasisPoints));
        //     // uint256 lenderToPay = _computePriceOfLenderToPay(
        //     //     loan.loanAmount,
        //     //     loan.loanLeveragedAmount,
        //     //     loan.repaymentAmount);
        //     // uint256 poolAmount = lenderToPay.sub(iv);

        //     // IERC20(loan.paymentToken).transferFrom(lender, lendingPoolAddr, poolAmount);
        //     // IERC20(loan.paymentToken).transferFrom(lender, insuranceVaultAddr, iv);
        // }

        require(
            msg.sender == lender,
            "Only the lender can pay for the leverage and liquidate the underlying NFT"
        );
        LoanRepaymentCalculator calculator = LoanRepaymentCalculator(
            loanRepaymentAddr
        );
        Repayment[] memory repayments = calculator.getDestinations(
            _loanIndex,
            loan.repaymentAmount,
            loan.loanAmount,
            lender
        );
        IERC20 erc20 = IERC20(loan.paymentToken);
        uint repaymentLength = repayments.length;
        for (uint idx = 0; idx < repaymentLength; idx++) {
            Repayment memory repayment = repayments[idx];
            if (msg.sender == repayment.targetAddress) {
                continue;
            }
            erc20.transferFrom(
                msg.sender,
                repayment.targetAddress,
                repayment.value
            );
        }

        // Mark loan as liquidated before doing any external transfers to
        // follow the Checks-Effects-Interactions design pattern.
        loanRepaidOrLiquidated[_loanIndex] = true;

        // Update number of active loans.
        totalActiveLoans = totalActiveLoans.sub(1);

        // Transfer collateral from this contract to the lender, since the
        // lender is seizing collateral for an overdue loan.
        require(
            _transferNftToAddress(loan.tokenAddress, loan.tokenId, lender),
            "NFT was not successfully transferred"
        );

        address currentBorrower = borrower(_loanIndex);
        // Destroy the lender's promissory note for this loan, since by seizing
        // the collateral, the lender has forfeit the rights to the loan
        // principal-plus-interest.
        _burn(_loanIndex);
        _burnTrustDeed(_loanIndex);
        // Emit an event with all relevant details from this transaction.
        emit LoanLiquidated(
            _loanIndex,
            currentBorrower,
            lender,
            loan.loanAmount,
            loan.tokenId,
            indexToMaturityDate[_loanIndex],
            // loanMaturityDate,
            block.timestamp,
            loan.tokenAddress,
            LiquidationTrigger.OverDue,
            LiquidationMethod.TransferredToLender
        );

        // Delete the loan from storage in order to achieve a substantial gas
        // savings and to lessen the burden of storage on Ethereum nodes, since
        // we will never access this loan's details again, and the details are
        // still available through event data.
        delete indexToLoan[_loanIndex];
    }

    function cancelLoanCommitmentBeforeLoanHasBegun(
        uint256 _nonce
    ) external virtual {
        require(
            !_nonceHasBeenUsedForUser[msg.sender][_nonce],
            "Nonce invalid, user has either cancelled/begun this loan, or reused a nonce when signing"
        );
        _nonceHasBeenUsedForUser[msg.sender][_nonce] = true;
    }

    /* ******************* */
    /* READ-ONLY FUNCTIONS */
    /* ******************* */

    function getPayoffAmount(
        uint256 _loanIndex
    ) public view virtual returns (uint256) {
        Loan storage loan = indexToLoan[_loanIndex];
        // if(loan.interestIsProRated == false){
        //     return loan.repaymentAmount;
        // } else {
        //     uint256 loanDurationSoFarInSeconds = block.timestamp.sub(uint256(loan.loanStartTime));
        //     uint256 interestDue = _computeInterestDue(loan.loanAmount, loan.repaymentAmount, loanDurationSoFarInSeconds, uint256(loan.loanDuration), uint256(loan.loanInterestRateForDurationInBasisPoints));
        //     return (loan.loanAmount).add(interestDue);
        // }

        return loan.repaymentAmount;
    }

    function getInterestForLender(
        uint256 _loanIndex
    ) public view virtual returns (uint256) {
        // Sanity check that payBackLoan() and liquidateOverdueLoan() have
        // never been called on this loanIndex. Depending on how the rest of the
        // code turns out, this check may be unnecessary.
        require(
            !loanRepaidOrLiquidated[_loanIndex],
            "Loan has already been repaid or liquidated"
        );

        // Fetch loan details from storage, but store them in memory for the
        // sake of saving gas.
        Loan memory loan = indexToLoan[_loanIndex];

        // Fetch current owner of loan promissory note.
        address lender = ownerOf(_loanIndex);

        LoanRepaymentCalculator calculator = LoanRepaymentCalculator(
            loanRepaymentAddr
        );
        Repayment[] memory repayments = calculator.getDestinations(
            _loanIndex,
            loan.repaymentAmount,
            loan.loanAmount,
            lender
        );

        uint repaymentLength = repayments.length;
        uint256 lenderPayment;

        for (uint idx = 0; idx < repaymentLength; idx++) {
            Repayment memory repayment = repayments[idx];
            if (repayment.targetAddress == lender) {
                lenderPayment += repayment.value;
            }
        }
        return lenderPayment - (loan.loanAmount - loan.loanLeveragedAmount);
    }

    function getWhetherNonceHasBeenUsedForUser(
        address _user,
        uint256 _nonce
    ) public view virtual returns (bool) {
        return _nonceHasBeenUsedForUser[_user][_nonce];
    }

    function isOverdue(
        uint256 _loanIndex,
        uint256 extraTime
    ) public view virtual returns (bool) {
        uint256 loanMaturityDate = indexToMaturityDate[_loanIndex] + extraTime;
        return block.timestamp > loanMaturityDate;
    }

    function isPreliquidationOverdue(
        uint256 _loanIndex
    ) external view virtual returns (bool) {
        PeriFiAdmin periFiAdmin = PeriFiAdmin(periFiAdminAddr);

        uint256 extraDuration = periFiAdmin.preLiquidationDuration();
        return
            block.timestamp > indexToMaturityDate[_loanIndex] + extraDuration;
    }

    function approve(address to, uint256 tokenId) public virtual override(ERC721Upgradeable, IERC721Upgradeable) {
        PeriFiAdmin periFiAdmin = PeriFiAdmin(periFiAdminAddr);
        uint256 extraDuration = periFiAdmin.preLiquidationDuration();

        require(!isOverdue(tokenId, extraDuration), "Loan is overdue");
        super.approve(to, tokenId);
    }

    function transferFrom(
        address from,
        address to,
        uint256 tokenId
    ) public virtual override(ERC721Upgradeable, IERC721Upgradeable) {
        PeriFiAdmin periFiAdmin = PeriFiAdmin(periFiAdminAddr);
        uint256 extraDuration = periFiAdmin.preLiquidationDuration();

        require(!isOverdue(tokenId, extraDuration), "Loan is overdue");
        super.transferFrom(from, to, tokenId);
    }

    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId
    ) public virtual override(ERC721Upgradeable, IERC721Upgradeable) {
        PeriFiAdmin periFiAdmin = PeriFiAdmin(periFiAdminAddr);
        uint256 extraDuration = periFiAdmin.preLiquidationDuration();

        require(!isOverdue(tokenId, extraDuration), "Loan is overdue");
        super.safeTransferFrom(from, to, tokenId);
    }

    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId,
        bytes memory _data
    ) public virtual override(ERC721Upgradeable, IERC721Upgradeable) {
        PeriFiAdmin periFiAdmin = PeriFiAdmin(periFiAdminAddr);
        uint256 extraDuration = periFiAdmin.preLiquidationDuration();

        require(!isOverdue(tokenId, extraDuration), "Loan is overdue");
        super.safeTransferFrom(from, to, tokenId, _data);
    }

    // function _computeInterestDue(uint256 _loanAmount, uint256 _repaymentAmount, uint256 _loanDurationSoFarInSeconds, uint256 _loanTotalDurationAgreedTo, uint256 _loanInterestRateForDurationInBasisPoints) internal pure returns (uint256) {
    //     uint256 interestDueAfterEntireDuration = (_loanAmount.mul(_loanInterestRateForDurationInBasisPoints)).div(uint256(10000));
    //     uint256 interestDueAfterElapsedDuration = (interestDueAfterEntireDuration.mul(_loanDurationSoFarInSeconds)).div(_loanTotalDurationAgreedTo);
    //     if(_loanAmount.add(interestDueAfterElapsedDuration) > _repaymentAmount){
    //         return _repaymentAmount.sub(_loanAmount);
    //     } else {
    //         return interestDueAfterElapsedDuration;
    //     }
    // }
    // function _computeInterestForIV(uint256 _interestDue, uint256 _interestForIVInBasisPoints) internal pure returns (uint256) {
    // 	return (_interestDue.mul(_interestForIVInBasisPoints)).div(10000);
    // }

    function _transferNftToAddress(
        address _nftContract,
        uint256 _nftId,
        address _recipient
    ) internal virtual returns (bool) {
        // Try to call transferFrom()
        bool transferFromSucceeded = _attemptTransferFrom(
            _nftContract,
            _nftId,
            _recipient
        );
        if (transferFromSucceeded) {
            return true;
        } else {
            // Try to call transfer()
            bool transferSucceeded = _attemptTransfer(
                _nftContract,
                _nftId,
                _recipient
            );
            return transferSucceeded;
        }
    }

    function _attemptTransferFrom(
        address _nftContract,
        uint256 _nftId,
        address _recipient
    ) internal virtual returns (bool) {
        // @notice Some NFT contracts will not allow you to approve an NFT that
        //         you own, so we cannot simply call approve() here, we have to
        //         try to call it in a manner that allows the call to fail.
        (bool success, ) = _nftContract.call(
            abi.encodeWithSelector(
                IERC721(_nftContract).approve.selector,
                address(this),
                _nftId
            )
        );

        // @notice Some NFT contracts will not allow you to call transferFrom()
        //         for an NFT that you own but that is not approved, so we
        //         cannot simply call transferFrom() here, we have to try to
        //         call it in a manner that allows the call to fail.
        (success, ) = _nftContract.call(
            abi.encodeWithSelector(
                IERC721(_nftContract).transferFrom.selector,
                address(this),
                _recipient,
                _nftId
            )
        );
        return success;
    }

    function _attemptTransfer(
        address _nftContract,
        uint256 _nftId,
        address _recipient
    ) internal virtual returns (bool) {
        // @notice Some NFT contracts do not implement transfer(), since it is
        //         not a part of the official ERC721 standard, but many
        //         prominent NFT projects do implement it (such as
        //         Cryptokitties), so we cannot simply call transfer() here, we
        //         have to try to call it in a manner that allows the call to
        //         fail.
        (bool success, ) = _nftContract.call(
            abi.encodeWithSelector(
                INonStandardERC721Transfer(_nftContract).transfer.selector,
                _recipient,
                _nftId
            )
        );
        return success;
    }

    /* ***************** */
    /* FALLBACK FUNCTION */
    /* ***************** */

    // @notice By calling 'revert' in the fallback function, we prevent anyone
    //         from accidentally sending funds directly to this contract.
    fallback() external payable virtual {
        revert();
    }

    receive() external payable virtual {
        revert();
    }

    // @notice This function gets the current chain ID.
    function getChainID() public view virtual returns (uint256) {
        uint256 id;
        assembly {
            id := chainid()
        }
        return id;
    }

    function isValidBorrowerSignature(
        uint256 _tokenId,
        uint256 _borrowerNonce,
        address _tokenAddress,
        address _borrower,
        bytes memory _borrowerSignature
    ) public view virtual returns (bool) {
        if (_borrower == address(0)) {
            return false;
        } else {
            uint256 chainId;
            chainId = getChainID();
            bytes32 message = keccak256(
                abi.encodePacked(
                    _tokenId,
                    _borrowerNonce,
                    _tokenAddress,
                    _borrower,
                    chainId
                )
            );

            bytes32 messageWithEthSignPrefix = message.toEthSignedMessageHash();

            return (messageWithEthSignPrefix.recover(_borrowerSignature) ==
                _borrower);
        }
    }

    function isValidLenderSignature(
        uint256 _loanAmount,
        uint256 _loanLeveragedAmount,
        uint256 _repaymentAmount,
        uint256 _tokenId,
        uint256 _loanDuration,
        // uint256 _loanInterestRateForDurationInBasisPoints,
        uint256 _commissionBasisPoints,
        uint256 _lenderNonce,
        address _tokenAddress,
        address _paymentToken,
        address _lender,
        bool _liquidateViaAuction,
        // bool _interestIsProRated,
        bytes memory _lenderSignature
    ) public view virtual returns (bool) {
        if (_lender == address(0)) {
            return false;
        } else {
            uint256 chainId;
            chainId = getChainID();
            bytes32 message = keccak256(
                abi.encodePacked(
                    _loanAmount,
                    _loanLeveragedAmount,
                    _repaymentAmount,
                    _tokenId,
                    _loanDuration,
                    _commissionBasisPoints,
                    _lenderNonce,
                    _tokenAddress,
                    _paymentToken,
                    _lender,
                    _liquidateViaAuction,
                    chainId
                )
            );

            bytes32 messageWithEthSignPrefix = message.toEthSignedMessageHash();

            return (messageWithEthSignPrefix.recover(_lenderSignature) ==
                _lender);
        }
    }

    // function computeInterestDistributionForLender(
    //     uint256 _loanAmount,
    //     uint256 _loanLeveragedAmount,
    //     uint256 _interestDue
    //     ) public pure virtual returns(uint256) {
    //         uint256 rate = 55;
    //         if (_loanLeveragedAmount != 0) {
    //             uint256 leveraged = (_loanAmount).div(_loanLeveragedAmount);
    //             if (leveraged <= 30) {
    //                 rate = 50;
    //             }
    //             else if (leveraged <= 50) {
    //                 rate = 45;
    //             }
    //             else if (leveraged <= 60) {
    //                 rate = 40;
    //             }
    //             else if (leveraged <= 70) {
    //                 rate = 35;
    //             }
    //             else if (leveraged <= 80) {
    //                 rate = 25;
    //             }
    //             else if (leveraged <= 90) {
    //                 rate = 15;
    //             }
    //             else {
    //                 rate = 5;
    //             }
    //         }
    //         return (_interestDue).mul(rate).div(10000);
    // }

    // function _computePriceOfLenderToPay(uint256 loanAmount, uint256 leveragedAmount, uint256 repaymentAmount) internal pure virtual returns(uint256) {
    //     uint256 interestDue = (repaymentAmount).sub(loanAmount);
    //         uint256 interestForLender = computeInterestDistributionForLender(
    //             loanAmount,
    //             leveragedAmount,
    //             interestDue
    //         );
    //         return leveragedAmount.add(interestDue).sub(interestForLender);
    // }

    function computePriceOfLenderToPay(
        uint256 _loanIndex
    ) external view virtual returns (uint256) {
        require(
            !loanRepaidOrLiquidated[_loanIndex],
            "Loan has already been repaid or liquidated"
        );
        Loan memory loan = indexToLoan[_loanIndex];

        address lender = ownerOf(_loanIndex);

        LoanRepaymentCalculator calculator = LoanRepaymentCalculator(
            loanRepaymentAddr
        );
        Repayment[] memory repayments = calculator.getDestinations(
            _loanIndex,
            loan.repaymentAmount,
            loan.loanAmount,
            lender
        );
        // IERC20 erc20 = IERC20(loan.paymentToken);
        uint repaymentLength = repayments.length;
        uint256 lenderToPay = 0;
        for (uint idx = 0; idx < repaymentLength; idx++) {
            Repayment memory repayment = repayments[idx];
            if (msg.sender == repayment.targetAddress) {
                continue;
            }
            lenderToPay += repayment.value;
        }
        return lenderToPay;
        // // Fetch loan details from storage, but store them in memory for the
        // // sake of saving gas.
        // return _computePriceOfLenderToPay(loan.loanAmount, loan.loanLeveragedAmount, loan.repaymentAmount);
    }

    function _burnTrustDeed(uint256 loanIndex) internal virtual {
        // check trust deed contract address is set
        if (trustDeedAddr == address(0)) {
            return;
        }
        TrustDeed trustDeedContract = TrustDeed(trustDeedAddr);
        trustDeedContract.safeBurn(loanIndex);
    }

    function borrower(uint256 loanIndex) public view virtual returns (address) {
        if (loanRepaidOrLiquidated[loanIndex]) {
            return address(0);
        }

        // check trust deed contract address is set
        if (trustDeedAddr != address(0)) {
            TrustDeed trustDeedContract = TrustDeed(trustDeedAddr);
            // check whether the trust deed has been issued
            try trustDeedContract.ownerOf(loanIndex) returns (
                address potentionBorrower
            ) {
                if (potentionBorrower != address(0)) {
                    return potentionBorrower;
                }
            } catch {}
        }

        // if no trust deed has been issued, return original borrower
        Loan memory loan = indexToLoan[loanIndex];

        return loan.borrower;
    }

    function _authorizeUpgrade(address) internal virtual override onlyOwner {}
}
