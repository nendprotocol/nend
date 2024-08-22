const { expect } = require('chai');
const { Wallet, BigNumber } = require('ethers');
const { ethers } = require('hardhat');

describe('Loan contract', function () {
  const testName = 'Test Token';
  const testSymbol = 'TT';
  const signer = new Wallet(
    'b829e1be2dcb1ac220e27d619b4fc10eedfa14103dddfacd95450b65b6c0e05d',
    ethers.provider
  );
  let owner, borrower, lender, user1, user2;
  let adminContract, loanContract;
  let auctionContract, trustDeedContract;
  let insuranceVaultContract, lendingPoolContract, curationRewardContract;
  let loanRepaymentCalcContract;
  let nendC;

  let perifiNFT;

  beforeEach(async () => {
    [owner, borrower, lender, user1, user2] = await ethers.getSigners();
    await owner.sendTransaction({
      to: signer.address,
      value: ethers.utils.parseEther('1') // 1 ether
    });
    const tdF = await ethers.getContractFactory('TrustDeed');
    trustDeedContract = await tdF.connect(owner).deploy();
    const ivF = await ethers.getContractFactory('Vault');
    insuranceVaultContract = await ivF.deploy('InsuranceVault');
    const lpF = await ethers.getContractFactory('LendingPool');
    lendingPoolContract = await lpF.deploy('LendingPool');
    const crF = await ethers.getContractFactory('Vault');
    curationRewardContract = await crF.deploy('CurationRewardPool');
    const pfadminF = await ethers.getContractFactory('PeriFiAdmin');
    const lrcF = await ethers.getContractFactory('LoanRepaymentCalculator');
    adminContract = await pfadminF.deploy();
    loanRepaymentCalcContract = await lrcF.deploy(
      insuranceVaultContract.address,
      lendingPoolContract.address,
      owner.address,
      adminContract.address,
      curationRewardContract.address
    );
    const laF = await ethers.getContractFactory('LoanAuction');
    auctionContract = await laF.deploy(
      adminContract.address,
      loanRepaymentCalcContract.address
    );

    const factory = await ethers.getContractFactory('PeriFiLoan');
    loanContract = await factory.deploy(
      adminContract.address,
      loanRepaymentCalcContract.address,
      auctionContract.address,
      trustDeedContract.address
    );

    try {
      await trustDeedContract.connect(signer).setLoanAddress(loanContract.address);
      await trustDeedContract.connect(signer).setAdminAddress(adminContract.address);
    } catch (e) {
      console.log(e);
    }
    try {
      await trustDeedContract.connect(signer).authorize(loanContract.address, 'minter', true);
    } catch (e) {
      console.log(e);
    }
    try {
      await insuranceVaultContract.connect(signer).authorize(loanContract.address, 'spender', true);
      await insuranceVaultContract.connect(signer).authorize(auctionContract.address, 'spender', true);
      await lendingPoolContract.connect(signer).authorize(loanContract.address, 'spender', true);
      await lendingPoolContract.connect(signer).authorize(auctionContract.address, 'spender', true);
      // mint NEND to lender
      const ncsf = await ethers.getContractFactory('NEND');
      const chainId = (await ethers.getDefaultProvider().getNetwork()).chainId;

      nendC = await ncsf.deploy(true, [4, chainId, 31337]);

      await nendC.connect(owner).createAirdropBatch([lender.address], 10000);
      await nendC.connect(owner).createAirdropBatch([lendingPoolContract.address], 50000);

      // mint ERC721 to borrower
      const e721F = await ethers.getContractFactory('ERC721Factory');
      const hardhatFactory = await e721F.deploy();
      const tx = await hardhatFactory.deploy(testName, testSymbol);
      await tx.wait();
      const addr = await hardhatFactory.addressOf(0);
      const ERC721 = await ethers.getContractFactory('PeriFiNFT');
      perifiNFT = await ERC721.attach(addr);
      const tokenUri = 'https://test.com/testitem';
      const mintTx = await perifiNFT.connect(owner).safeMint(borrower.address, tokenUri);
      await mintTx.wait();
    } catch (e) {
      console.log(e);
    }
  });

  it('Loan (no leverage) - borrower payback - repayment distribution', async () => {
    const loanAmount = 10000;
    const leveragedAmt = 0;
    const repaymentAmt = 11000;
    const tokenId = 1;
    const loanDuration = 60;
    const adminFee = 500;
    const lenderNonce = 1;
    const borrowerNonce = 2;
    const tokenAddress = perifiNFT.address;
    const paymentToken = nendC.address;
    const lenderAddress = lender.address;
    const liquidateViaAuction = true;
    const chainId = 31337;

    // set up borrower msg, hash and signature
    const borrowerMsg = ethers.utils.solidityPack([
      'uint256',
      'uint256',
      'address',
      'address',
      'uint256'], [
      tokenId,
      borrowerNonce,
      tokenAddress,
      borrower.address,
      chainId
    ]);
    const borrowerHash = ethers.utils.keccak256(borrowerMsg);
    const borrowerHashBin = ethers.utils.arrayify(borrowerHash);
    const borrowerSignature = borrower.signMessage(borrowerHashBin);
    // set up lender msg, hash and signature
    const lenderMsg = ethers.utils.solidityPack([
      'uint256',
      'uint256',
      'uint256',
      'uint256',
      'uint256',
      'uint256',
      'uint256',
      'address',
      'address',
      'address',
      'bool',
      'uint256'], [
      loanAmount,
      leveragedAmt,
      repaymentAmt,
      tokenId,
      loanDuration,
      adminFee,
      lenderNonce,
      tokenAddress,
      paymentToken,
      lenderAddress,
      liquidateViaAuction,
      chainId
    ]);

    const lenderHash = ethers.utils.keccak256(lenderMsg);
    const lenderHashBin = ethers.utils.arrayify(lenderHash);
    const lenderSignature = lender.signMessage(lenderHashBin);

    // set allowance on loan to transfer loan amount
    await nendC.connect(lender).approve(loanContract.address, 10000);
    // set allowance on loan to transfer the collateral
    await perifiNFT.connect(borrower).setApprovalForAll(loanContract.address, true);
    // start the loan
    await loanContract.connect(borrower).beginLoan(
      loanAmount,
      leveragedAmt,
      repaymentAmt,
      tokenId,
      loanDuration,
      adminFee,
      [borrowerNonce, lenderNonce],
      tokenAddress,
      paymentToken,
      lender.address,
      borrowerSignature,
      lenderSignature,
      liquidateViaAuction);

    const lenderApr = await loanContract.getInterestForLender(0);
    console.log(lenderApr.toString() + ' is 950');
    const lenderBalance = await nendC.balanceOf(lender.address);
    const borrowerBalance = await nendC.balanceOf(borrower.address);
    const nftOwner = await perifiNFT.ownerOf(tokenId);
    const debt = await loanContract.connect(borrower).getPayoffAmount(0);
    // check the assets are transferred correctly
    await expect(nftOwner).equal(loanContract.address);
    await expect(lenderBalance).equal(0);
    await expect(borrowerBalance).equal(10000);
    await expect((await loanContract.totalNumLoans()).toNumber()).to.equal(1);
    await expect(debt).equal(11000);

    await nendC.connect(owner).createAirdropBatch([borrower.address], debt - borrowerBalance);
    await nendC.connect(borrower).approve(loanContract.address, debt);
    await loanContract.connect(borrower).payBackLoan(0);
    const lenderBalanceAfter = await nendC.balanceOf(lender.address);
    const borrowerBalanceAfter = await nendC.balanceOf(borrower.address);
    const crBalance = await nendC.balanceOf(curationRewardContract.address);
    // const lpBalance = await nendC.balanceOf(lendingPoolContract.address);
    // const ivBalance = await nendC.balanceOf(insuranceVaultContract.address);
    const mwBalance = await nendC.balanceOf(owner.address);
    const nftOwnerAfter = await perifiNFT.ownerOf(tokenId);

    // check the assets are transferred correctly
    await expect(nftOwnerAfter).equal(borrower.address);
    await expect(lenderBalanceAfter).equal(10950);
    await expect(borrowerBalanceAfter).equal(0);
    await expect(mwBalance).equal(40);
    await expect(crBalance).equal(10);
    await expect((await loanContract.totalNumLoans()).toNumber()).to.equal(1);
  });
  it('Loan (leveraged) - borrower payback - repayment distribution', async () => {
    // using 20% of lending pool
    // pool takes 40% from IFP
    // lender takes 55% from IFP
    const loanAmount = 20000;
    const leveragedAmt = 10000;
    const repaymentAmt = 22000;
    const tokenId = 1;
    const loanDuration = 60;
    const adminFee = 500;
    const lenderNonce = 1;
    const borrowerNonce = 2;
    const tokenAddress = perifiNFT.address;
    const paymentToken = nendC.address;
    const lenderAddress = lender.address;
    const liquidateViaAuction = true;
    const chainId = 31337;

    // set up borrower msg, hash and signature
    const borrowerMsg = ethers.utils.solidityPack([
      'uint256',
      'uint256',
      'address',
      'address',
      'uint256'], [
      tokenId,
      borrowerNonce,
      tokenAddress,
      borrower.address,
      chainId
    ]);
    const borrowerHash = ethers.utils.keccak256(borrowerMsg);
    const borrowerHashBin = ethers.utils.arrayify(borrowerHash);
    const borrowerSignature = borrower.signMessage(borrowerHashBin);
    // set up lender msg, hash and signature
    const lenderMsg = ethers.utils.solidityPack([
      'uint256',
      'uint256',
      'uint256',
      'uint256',
      'uint256',
      'uint256',
      'uint256',
      'address',
      'address',
      'address',
      'bool',
      'uint256'], [
      loanAmount,
      leveragedAmt,
      repaymentAmt,
      tokenId,
      loanDuration,
      adminFee,
      lenderNonce,
      tokenAddress,
      paymentToken,
      lenderAddress,
      liquidateViaAuction,
      chainId
    ]);

    const lenderHash = ethers.utils.keccak256(lenderMsg);
    const lenderHashBin = ethers.utils.arrayify(lenderHash);
    const lenderSignature = lender.signMessage(lenderHashBin);

    // set allowance on loan to transfer loan amount
    await nendC.connect(lender).approve(loanContract.address, 10000);
    // set allowance on loan to transfer the collateral
    await perifiNFT.connect(borrower).setApprovalForAll(loanContract.address, true);
    // start the loan
    await loanContract.connect(borrower).beginLoan(
      loanAmount,
      leveragedAmt,
      repaymentAmt,
      tokenId,
      loanDuration,
      adminFee,
      [borrowerNonce, lenderNonce],
      tokenAddress,
      paymentToken,
      lender.address,
      borrowerSignature,
      lenderSignature,
      liquidateViaAuction);

    const lenderBalance = await nendC.balanceOf(lender.address);
    const borrowerBalance = await nendC.balanceOf(borrower.address);
    const lpBalance = await nendC.balanceOf(lendingPoolContract.address);
    const nftOwner = await perifiNFT.ownerOf(tokenId);
    try {
      const lenderInterest = await loanContract.getInterestForLender(0);
      console.log(lenderInterest.toString() + ' is 1500');

      const lenderPrinciple = BigNumber.from(loanAmount - leveragedAmt);
      const lenderApr = BigNumber.from(lenderInterest).mul(BigNumber.from(36500)).div(lenderPrinciple);
      console.log(lenderApr.toString());
    } catch (e) {
      console.log(e);
    }

    const debt = await loanContract.connect(borrower).getPayoffAmount(0);
    // check the assets are transferred correctly
    const leverageAmount = await lendingPoolContract.loanToLeverage(0);
    const leveraged = await lendingPoolContract.leveragedLoan(0);
    const loanToPoolUsageInBasisPoint = await lendingPoolContract.loanToPoolUsageInBasisPoint(0);
    await expect(leverageAmount).equal(10000);
    await expect(leveraged).equal(true);
    await expect(loanToPoolUsageInBasisPoint).equal(2000); // 20%
    await expect(nftOwner).equal(loanContract.address);
    await expect(lenderBalance).equal(0);
    await expect(borrowerBalance).equal(20000);
    await expect(lpBalance).equal(40000);
    await expect((await loanContract.totalNumLoans()).toNumber()).to.equal(1);
    await expect(debt).equal(22000);
    await nendC.connect(owner).createAirdropBatch([borrower.address], debt - borrowerBalance);
    await nendC.connect(borrower).approve(loanContract.address, debt);
    await loanContract.connect(borrower).payBackLoan(0);
    const lenderBalanceAfter = await nendC.balanceOf(lender.address);
    const borrowerBalanceAfter = await nendC.balanceOf(borrower.address);
    const crBalanceAfter = await nendC.balanceOf(curationRewardContract.address);
    const lpBalanceAfter = await nendC.balanceOf(lendingPoolContract.address);
    const ivBalanceAfter = await nendC.balanceOf(insuranceVaultContract.address);
    const mwBalanceAfter = await nendC.balanceOf(owner.address);
    const nftOwnerAfter = await perifiNFT.ownerOf(tokenId);
    // check the assets are transferred correctly
    await expect(nftOwnerAfter).equal(borrower.address);
    await expect(lpBalanceAfter).equal(50400);
    await expect(ivBalanceAfter).equal(50);
    await expect(lenderBalanceAfter).equal(11500);
    await expect(borrowerBalanceAfter).equal(0);
    await expect(mwBalanceAfter).equal(40);
    await expect(crBalanceAfter).equal(10);
    await expect((await loanContract.totalNumLoans()).toNumber()).to.equal(1);
  });
  it('Loan - promissory note transfer - repayment goes to promissory note owner', async () => {
    const loanAmount = 10000;
    const leveragedAmt = 0;
    const repaymentAmt = 11000;
    const tokenId = 1;
    const loanDuration = 60;
    const adminFee = 500;
    const lenderNonce = 1;
    const borrowerNonce = 2;
    const tokenAddress = perifiNFT.address;
    const paymentToken = nendC.address;
    const lenderAddress = lender.address;
    const liquidateViaAuction = true;
    const chainId = 31337;

    // set up borrower msg, hash and signature
    const borrowerMsg = ethers.utils.solidityPack([
      'uint256',
      'uint256',
      'address',
      'address',
      'uint256'], [
      tokenId,
      borrowerNonce,
      tokenAddress,
      borrower.address,
      chainId
    ]);
    const borrowerHash = ethers.utils.keccak256(borrowerMsg);
    const borrowerHashBin = ethers.utils.arrayify(borrowerHash);
    const borrowerSignature = borrower.signMessage(borrowerHashBin);
    // set up lender msg, hash and signature
    const lenderMsg = ethers.utils.solidityPack([
      'uint256',
      'uint256',
      'uint256',
      'uint256',
      'uint256',
      'uint256',
      'uint256',
      'address',
      'address',
      'address',
      'bool',
      'uint256'], [
      loanAmount,
      leveragedAmt,
      repaymentAmt,
      tokenId,
      loanDuration,
      adminFee,
      lenderNonce,
      tokenAddress,
      paymentToken,
      lenderAddress,
      liquidateViaAuction,
      chainId
    ]);

    const lenderHash = ethers.utils.keccak256(lenderMsg);
    const lenderHashBin = ethers.utils.arrayify(lenderHash);
    const lenderSignature = lender.signMessage(lenderHashBin);

    // set allowance on loan to transfer loan amount
    await nendC.connect(lender).approve(loanContract.address, 10000);
    // set allowance on loan to transfer the collateral
    await perifiNFT.connect(borrower).setApprovalForAll(loanContract.address, true);
    // start the loan
    await loanContract.connect(borrower).beginLoan(
      loanAmount,
      leveragedAmt,
      repaymentAmt,
      tokenId,
      loanDuration,
      adminFee,
      [borrowerNonce, lenderNonce],
      tokenAddress,
      paymentToken,
      lender.address,
      borrowerSignature,
      lenderSignature,
      liquidateViaAuction);

    const lenderBalance = await nendC.balanceOf(lender.address);
    const borrowerBalance = await nendC.balanceOf(borrower.address);
    const nftOwner = await perifiNFT.ownerOf(tokenId);
    const debt = await loanContract.connect(borrower).getPayoffAmount(0);
    // check the assets are transferred correctly
    await expect(nftOwner).equal(loanContract.address);
    await expect(lenderBalance).equal(0);
    await expect(borrowerBalance).equal(10000);
    await expect((await loanContract.totalNumLoans()).toNumber()).to.equal(1);
    await expect(debt).equal(11000);
    await loanContract.connect(lender).transferFrom(lender.address, user1.address, 0);
    await nendC.connect(owner).createAirdropBatch([borrower.address], debt - borrowerBalance);
    await nendC.connect(borrower).approve(loanContract.address, debt);
    await loanContract.connect(borrower).payBackLoan(0);
    const lenderBalanceAfter = await nendC.balanceOf(lender.address);
    const promissoryNoteOwnerBalanceAfter = await nendC.balanceOf(user1.address);
    const borrowerBalanceAfter = await nendC.balanceOf(borrower.address);
    const crBalance = await nendC.balanceOf(curationRewardContract.address);
    // const lpBalance = await nendC.balanceOf(lendingPoolContract.address);
    // const ivBalance = await nendC.balanceOf(insuranceVaultContract.address);
    const mwBalance = await nendC.balanceOf(owner.address);
    const nftOwnerAfter = await perifiNFT.ownerOf(tokenId);
    // check the assets are transferred correctly
    await expect(nftOwnerAfter).equal(borrower.address);
    await expect(promissoryNoteOwnerBalanceAfter).equal(10950);
    await expect(lenderBalanceAfter).equal(0);
    await expect(borrowerBalanceAfter).equal(0);
    await expect(mwBalance).equal(40);
    await expect(crBalance).equal(10);
    await expect((await loanContract.totalNumLoans()).toNumber()).to.equal(1);
  });
  it('Loan - trust deed transfer - collateral transferred to trust deed owner', async () => {
    const loanAmount = 10000;
    const leveragedAmt = 0;
    const repaymentAmt = 11000;
    const tokenId = 1;
    const loanDuration = 60;
    const adminFee = 500;
    const lenderNonce = 1;
    const borrowerNonce = 2;
    const tokenAddress = perifiNFT.address;
    const paymentToken = nendC.address;
    const lenderAddress = lender.address;
    const liquidateViaAuction = true;
    const chainId = 31337;

    // set up borrower msg, hash and signature
    const borrowerMsg = ethers.utils.solidityPack([
      'uint256',
      'uint256',
      'address',
      'address',
      'uint256'], [
      tokenId,
      borrowerNonce,
      tokenAddress,
      borrower.address,
      chainId
    ]);
    const borrowerHash = ethers.utils.keccak256(borrowerMsg);
    const borrowerHashBin = ethers.utils.arrayify(borrowerHash);
    const borrowerSignature = borrower.signMessage(borrowerHashBin);
    // set up lender msg, hash and signature
    const lenderMsg = ethers.utils.solidityPack([
      'uint256',
      'uint256',
      'uint256',
      'uint256',
      'uint256',
      'uint256',
      'uint256',
      'address',
      'address',
      'address',
      'bool',
      'uint256'], [
      loanAmount,
      leveragedAmt,
      repaymentAmt,
      tokenId,
      loanDuration,
      adminFee,
      lenderNonce,
      tokenAddress,
      paymentToken,
      lenderAddress,
      liquidateViaAuction,
      chainId
    ]);

    const lenderHash = ethers.utils.keccak256(lenderMsg);
    const lenderHashBin = ethers.utils.arrayify(lenderHash);
    const lenderSignature = lender.signMessage(lenderHashBin);

    // set allowance on loan to transfer loan amount
    await nendC.connect(lender).approve(loanContract.address, 10000);
    // set allowance on loan to transfer the collateral
    await perifiNFT.connect(borrower).setApprovalForAll(loanContract.address, true);
    // start the loan
    await loanContract.connect(borrower).beginLoan(
      loanAmount,
      leveragedAmt,
      repaymentAmt,
      tokenId,
      loanDuration,
      adminFee,
      [borrowerNonce, lenderNonce],
      tokenAddress,
      paymentToken,
      lender.address,
      borrowerSignature,
      lenderSignature,
      liquidateViaAuction);

    const lenderBalance = await nendC.balanceOf(lender.address);
    const borrowerBalance = await nendC.balanceOf(borrower.address);
    const nftOwner = await perifiNFT.ownerOf(tokenId);
    const debt = await loanContract.connect(borrower).getPayoffAmount(0);
    // check the assets are transferred correctly
    await expect(nftOwner).equal(loanContract.address);
    await expect(lenderBalance).equal(0);
    await expect(borrowerBalance).equal(10000);
    await expect((await loanContract.totalNumLoans()).toNumber()).to.equal(1);
    await expect(debt).equal(11000);
    // issue trust deed
    try {
      await loanContract.connect(borrower).issueTrustDeed(0);
    } catch (e) {
      console.log(e);
    }
    // transfer trust deed
    await trustDeedContract.connect(borrower).transferFrom(borrower.address, user2.address, 0);
    try {
      await nendC.connect(owner).createAirdropBatch([user2.address], debt);
      await nendC.connect(user2).approve(loanContract.address, debt);
      await loanContract.connect(user2).payBackLoan(0);
      const lenderBalanceAfter = await nendC.balanceOf(lender.address);
      const trustDeedOwnerBalanceAfter = await nendC.balanceOf(user2.address);
      const crBalance = await nendC.balanceOf(curationRewardContract.address);
      // const lpBalance = await nendC.balanceOf(lendingPoolContract.address);
      // const ivBalance = await nendC.balanceOf(insuranceVaultContract.address);
      const mwBalance = await nendC.balanceOf(owner.address);
      const nftOwnerAfter = await perifiNFT.ownerOf(tokenId);
      // check the assets are transferred correctly
      await expect(nftOwnerAfter).equal(user2.address);
      await expect(lenderBalanceAfter).equal(10950);
      await expect(trustDeedOwnerBalanceAfter).equal(0);
      await expect(mwBalance).equal(40);
      await expect(crBalance).equal(10);
      await expect((await loanContract.totalNumLoans()).toNumber()).to.equal(1);
    } catch (e) {
      console.log(e);
    }
  });
  it('Loan (no leverage, liquidate by lender to take it) - borrower default - lender claims the collateral', async () => {
    const loanAmount = 10000;
    const leveragedAmt = 0;
    const repaymentAmt = 11000;
    const tokenId = 1;
    const loanDuration = 60;
    const adminFee = 500;
    const lenderNonce = 1;
    const borrowerNonce = 2;
    const tokenAddress = perifiNFT.address;
    const paymentToken = nendC.address;
    const lenderAddress = lender.address;
    const liquidateViaAuction = false;
    const chainId = 31337;

    // set up borrower msg, hash and signature
    const borrowerMsg = ethers.utils.solidityPack([
      'uint256',
      'uint256',
      'address',
      'address',
      'uint256'], [
      tokenId,
      borrowerNonce,
      tokenAddress,
      borrower.address,
      chainId
    ]);
    const borrowerHash = ethers.utils.keccak256(borrowerMsg);
    const borrowerHashBin = ethers.utils.arrayify(borrowerHash);
    const borrowerSignature = borrower.signMessage(borrowerHashBin);
    // set up lender msg, hash and signature
    const lenderMsg = ethers.utils.solidityPack([
      'uint256',
      'uint256',
      'uint256',
      'uint256',
      'uint256',
      'uint256',
      'uint256',
      'address',
      'address',
      'address',
      'bool',
      'uint256'], [
      loanAmount,
      leveragedAmt,
      repaymentAmt,
      tokenId,
      loanDuration,
      adminFee,
      lenderNonce,
      tokenAddress,
      paymentToken,
      lenderAddress,
      liquidateViaAuction,
      chainId
    ]);

    const lenderHash = ethers.utils.keccak256(lenderMsg);
    const lenderHashBin = ethers.utils.arrayify(lenderHash);
    const lenderSignature = lender.signMessage(lenderHashBin);

    // set allowance on loan to transfer loan amount
    await nendC.connect(lender).approve(loanContract.address, 10000);
    // set allowance on loan to transfer the collateral
    await perifiNFT.connect(borrower).setApprovalForAll(loanContract.address, true);
    // start the loan
    await loanContract.connect(borrower).beginLoan(
      loanAmount,
      leveragedAmt,
      repaymentAmt,
      tokenId,
      loanDuration,
      adminFee,
      [borrowerNonce, lenderNonce],
      tokenAddress,
      paymentToken,
      lender.address,
      borrowerSignature,
      lenderSignature,
      liquidateViaAuction);

    const lenderBalance = await nendC.balanceOf(lender.address);
    const borrowerBalance = await nendC.balanceOf(borrower.address);
    const nftOwner = await perifiNFT.ownerOf(tokenId);
    // check the assets are transferred correctly
    await expect(nftOwner).equal(loanContract.address);
    await expect(lenderBalance).equal(0);
    await expect(borrowerBalance).equal(10000);
    await expect((await loanContract.totalNumLoans()).toNumber()).to.equal(1);

    const blockNum = await ethers.provider.getBlockNumber();
    const block = await ethers.provider.getBlock(blockNum);
    let timestamp = block.timestamp;
    timestamp += loanDuration + (60 * 60 * 48);
    await ethers.provider.send('evm_setNextBlockTimestamp', [
      timestamp
    ]);
    await ethers.provider.send('evm_mine', []);
    const debt = await loanContract.connect(borrower).getPayoffAmount(0);
    await expect(debt).equal(11000);
    try {
      const lenderToPay = await loanContract.connect(lender).computePriceOfLenderToPay(0);
      await nendC.connect(owner).createAirdropBatch([lender.address], lenderToPay);
      await nendC.connect(lender).approve(loanContract.address, lenderToPay);
      await loanContract.connect(lender).liquidateOverdueLoan(0);
      const nftOwnerAfter = await perifiNFT.ownerOf(tokenId);
      // check the assets are transferred correctly
      await expect(nftOwnerAfter).equal(lender.address);
      await expect((await loanContract.totalNumLoans()).toNumber()).to.equal(1);
    } catch (e) {
      console.log(e);
    }
  });

  it('TrustDeed and PromissoryNote transfer must fail on expire', async () => {
    const loanAmount = 10000;
    const leveragedAmt = 0;
    const repaymentAmt = 11000;
    const tokenId = 1;
    const loanDuration = 60;
    const adminFee = 500;
    const lenderNonce = 1;
    const borrowerNonce = 2;
    const tokenAddress = perifiNFT.address;
    const paymentToken = nendC.address;
    const lenderAddress = lender.address;
    const liquidateViaAuction = false;
    const chainId = 31337;

    // set up borrower msg, hash and signature
    const borrowerMsg = ethers.utils.solidityPack([
      'uint256',
      'uint256',
      'address',
      'address',
      'uint256'], [
      tokenId,
      borrowerNonce,
      tokenAddress,
      borrower.address,
      chainId
    ]);
    const borrowerHash = ethers.utils.keccak256(borrowerMsg);
    const borrowerHashBin = ethers.utils.arrayify(borrowerHash);
    const borrowerSignature = borrower.signMessage(borrowerHashBin);
    // set up lender msg, hash and signature
    const lenderMsg = ethers.utils.solidityPack([
      'uint256',
      'uint256',
      'uint256',
      'uint256',
      'uint256',
      'uint256',
      'uint256',
      'address',
      'address',
      'address',
      'bool',
      'uint256'], [
      loanAmount,
      leveragedAmt,
      repaymentAmt,
      tokenId,
      loanDuration,
      adminFee,
      lenderNonce,
      tokenAddress,
      paymentToken,
      lenderAddress,
      liquidateViaAuction,
      chainId
    ]);

    const lenderHash = ethers.utils.keccak256(lenderMsg);
    const lenderHashBin = ethers.utils.arrayify(lenderHash);
    const lenderSignature = lender.signMessage(lenderHashBin);

    // set allowance on loan to transfer loan amount
    await nendC.connect(lender).approve(loanContract.address, 10000);
    // set allowance on loan to transfer the collateral
    await perifiNFT.connect(borrower).setApprovalForAll(loanContract.address, true);
    // start the loan
    await loanContract.connect(borrower).beginLoan(
      loanAmount,
      leveragedAmt,
      repaymentAmt,
      tokenId,
      loanDuration,
      adminFee,
      [borrowerNonce, lenderNonce],
      tokenAddress,
      paymentToken,
      lender.address,
      borrowerSignature,
      lenderSignature,
      liquidateViaAuction);

    const lenderBalance = await nendC.balanceOf(lender.address);
    const borrowerBalance = await nendC.balanceOf(borrower.address);
    const nftOwner = await perifiNFT.ownerOf(tokenId);
    // check the assets are transferred correctly
    await expect(nftOwner).equal(loanContract.address);
    await expect(lenderBalance).equal(0);
    await expect(borrowerBalance).equal(10000);
    await expect((await loanContract.totalNumLoans()).toNumber()).to.equal(1);

    try {
      await loanContract.connect(borrower).issueTrustDeed(0);
    } catch (e) {
      console.log(e);
    }
    // transfer trust deed
    await trustDeedContract.connect(borrower).transferFrom(borrower.address, user2.address, 0);

    const blockNum = await ethers.provider.getBlockNumber();
    const block = await ethers.provider.getBlock(blockNum);
    let timestamp = block.timestamp;
    timestamp += loanDuration + (60 * 60 * 48);
    await ethers.provider.send('evm_setNextBlockTimestamp', [
      timestamp
    ]);
    await ethers.provider.send('evm_mine', []);
    await expect(loanContract.connect(lender).approve(user1.address, 0))
      .to.be.revertedWith('Loan is overdue');
    await expect(loanContract.connect(lender).transferFrom(lender.address, user1.address, 0))
      .to.be.revertedWith('Loan is overdue');
    await expect(loanContract.connect(lender)['safeTransferFrom(address,address,uint256)'](lender.address, user1.address, 0))
      .to.be.revertedWith('Loan is overdue');
    await expect(trustDeedContract.connect(borrower).approve(user1.address, 0))
      .to.be.revertedWith('Loan is overdue');
    await expect(trustDeedContract.connect(borrower).transferFrom(lender.address, user1.address, 0))
      .to.be.revertedWith('Loan is overdue');
    await expect(trustDeedContract.connect(borrower)['safeTransferFrom(address,address,uint256)'](lender.address, user1.address, 0))
      .to.be.revertedWith('Loan is overdue');
  });
  it('Loan (leveraged, liquidate by lender to take it) - borrower default - lender claims the collateral by paying the leverage + interest', async () => {
    // using 20% of lending pool
    // pool takes 40% from IFP
    // lender takes 55% from IFP
    const loanAmount = 20000;
    const leveragedAmt = 10000;
    const repaymentAmt = 22000;
    const tokenId = 1;
    const loanDuration = 60;
    const adminFee = 500;
    const lenderNonce = 1;
    const borrowerNonce = 2;
    const tokenAddress = perifiNFT.address;
    const paymentToken = nendC.address;
    const lenderAddress = lender.address;
    const liquidateViaAuction = false;
    const chainId = 31337;

    // set up borrower msg, hash and signature
    const borrowerMsg = ethers.utils.solidityPack([
      'uint256',
      'uint256',
      'address',
      'address',
      'uint256'], [
      tokenId,
      borrowerNonce,
      tokenAddress,
      borrower.address,
      chainId
    ]);
    const borrowerHash = ethers.utils.keccak256(borrowerMsg);
    const borrowerHashBin = ethers.utils.arrayify(borrowerHash);
    const borrowerSignature = borrower.signMessage(borrowerHashBin);
    // set up lender msg, hash and signature
    const lenderMsg = ethers.utils.solidityPack([
      'uint256',
      'uint256',
      'uint256',
      'uint256',
      'uint256',
      'uint256',
      'uint256',
      'address',
      'address',
      'address',
      'bool',
      'uint256'], [
      loanAmount,
      leveragedAmt,
      repaymentAmt,
      tokenId,
      loanDuration,
      adminFee,
      lenderNonce,
      tokenAddress,
      paymentToken,
      lenderAddress,
      liquidateViaAuction,
      chainId
    ]);

    const lenderHash = ethers.utils.keccak256(lenderMsg);
    const lenderHashBin = ethers.utils.arrayify(lenderHash);
    const lenderSignature = lender.signMessage(lenderHashBin);

    // set allowance on loan to transfer loan amount
    await nendC.connect(lender).approve(loanContract.address, 10000);
    // set allowance on loan to transfer the collateral
    await perifiNFT.connect(borrower).setApprovalForAll(loanContract.address, true);
    // start the loan
    await loanContract.connect(borrower).beginLoan(
      loanAmount,
      leveragedAmt,
      repaymentAmt,
      tokenId,
      loanDuration,
      adminFee,
      [borrowerNonce, lenderNonce],
      tokenAddress,
      paymentToken,
      lender.address,
      borrowerSignature,
      lenderSignature,
      liquidateViaAuction);
    const lenderBalance = await nendC.balanceOf(lender.address);
    const borrowerBalance = await nendC.balanceOf(borrower.address);
    const lpBalance = await nendC.balanceOf(lendingPoolContract.address);
    const nftOwner = await perifiNFT.ownerOf(tokenId);
    const debt = await loanContract.connect(borrower).getPayoffAmount(0);
    // check the assets are transferred correctly
    const leverageAmount = await lendingPoolContract.loanToLeverage(0);
    const leveraged = await lendingPoolContract.leveragedLoan(0);
    const loanToPoolUsageInBasisPoint = await lendingPoolContract.loanToPoolUsageInBasisPoint(0);
    await expect(leverageAmount).equal(10000);
    await expect(leveraged).equal(true);
    await expect(loanToPoolUsageInBasisPoint).equal(2000); // 20%
    await expect(nftOwner).equal(loanContract.address);
    await expect(lenderBalance).equal(0);
    await expect(borrowerBalance).equal(20000);
    await expect(lpBalance).equal(40000);
    await expect((await loanContract.totalNumLoans()).toNumber()).to.equal(1);
    await expect(debt).equal(22000);

    const blockNum = await ethers.provider.getBlockNumber();
    const block = await ethers.provider.getBlock(blockNum);
    let timestamp = block.timestamp;
    try {
      const amountToClaim = await loanContract.connect(lender).computePriceOfLenderToPay(0);
      await expect(amountToClaim).equal(10500);
    } catch (e) {
      console.log(e);
    }
    try {
      timestamp += loanDuration + (60 * 60 * 24);
      await ethers.provider.send('evm_setNextBlockTimestamp', [
        timestamp
      ]);
      await ethers.provider.send('evm_mine', []);
      await nendC.connect(owner).createAirdropBatch([lender.address], 10500);
      await nendC.connect(lender).approve(loanContract.address, debt);
      await loanContract.connect(lender).liquidateOverdueLoan(0);
      const lenderBalanceAfter = await nendC.balanceOf(lender.address);
      const crBalanceAfter = await nendC.balanceOf(curationRewardContract.address);
      const lpBalanceAfter = await nendC.balanceOf(lendingPoolContract.address);
      const ivBalanceAfter = await nendC.balanceOf(insuranceVaultContract.address);
      const mwBalanceAfter = await nendC.balanceOf(owner.address);
      const nftOwnerAfter = await perifiNFT.ownerOf(tokenId);
      // check the assets are transferred correctly
      await expect(nftOwnerAfter).equal(lender.address);
      await expect(lpBalanceAfter).equal(50400);
      await expect(ivBalanceAfter).equal(50);
      await expect(lenderBalanceAfter).equal(0);
      await expect(mwBalanceAfter).equal(40);
      await expect(crBalanceAfter).equal(10);
      await expect((await loanContract.totalNumLoans()).toNumber()).to.equal(1);
    } catch (e) {
      console.log(e);
    }
  });
  it('Loan (no leverage) - liquidate via auction - price decrement check', async () => {
    const loanAmount = 10000;
    const leveragedAmt = 0;
    const repaymentAmt = 11000;
    const tokenId = 1;
    const loanDuration = 60;
    const adminFee = 500;
    const lenderNonce = 1;
    const borrowerNonce = 2;
    const tokenAddress = perifiNFT.address;
    const paymentToken = nendC.address;
    const lenderAddress = lender.address;
    const liquidateViaAuction = true;
    const chainId = 31337;
    const expectedPriceDecrement = [
      20000, 19600, 19200, 18800, 18400,
      18000, 17600, 17200, 16800, 16400,
      16000, 15200, 14400, 13600, 12800,
      12000, 11200, 10400, 9600, 8800,
      8000
    ];

    // set up borrower msg, hash and signature
    const borrowerMsg = ethers.utils.solidityPack([
      'uint256',
      'uint256',
      'address',
      'address',
      'uint256'], [
      tokenId,
      borrowerNonce,
      tokenAddress,
      borrower.address,
      chainId
    ]);
    const borrowerHash = ethers.utils.keccak256(borrowerMsg);
    const borrowerHashBin = ethers.utils.arrayify(borrowerHash);
    const borrowerSignature = borrower.signMessage(borrowerHashBin);
    // set up lender msg, hash and signature
    const lenderMsg = ethers.utils.solidityPack([
      'uint256',
      'uint256',
      'uint256',
      'uint256',
      'uint256',
      'uint256',
      'uint256',
      'address',
      'address',
      'address',
      'bool',
      'uint256'], [
      loanAmount,
      leveragedAmt,
      repaymentAmt,
      tokenId,
      loanDuration,
      adminFee,
      lenderNonce,
      tokenAddress,
      paymentToken,
      lenderAddress,
      liquidateViaAuction,
      chainId
    ]);

    await auctionContract.connect(owner).updateDecrementInterval(600);
    const lenderHash = ethers.utils.keccak256(lenderMsg);
    const lenderHashBin = ethers.utils.arrayify(lenderHash);
    const lenderSignature = lender.signMessage(lenderHashBin);
    // set allowance on loan to transfer loan amount
    await nendC.connect(lender).approve(loanContract.address, 10000);
    // set allowance on loan to transfer the collateral
    await perifiNFT.connect(borrower).setApprovalForAll(loanContract.address, true);
    // start the loan
    await loanContract.connect(borrower).beginLoan(
      loanAmount,
      leveragedAmt,
      repaymentAmt,
      tokenId,
      loanDuration,
      adminFee,
      [borrowerNonce, lenderNonce],
      tokenAddress,
      paymentToken,
      lender.address,
      borrowerSignature,
      lenderSignature,
      liquidateViaAuction
    );
    const blockNum = await ethers.provider.getBlockNumber();
    const block = await ethers.provider.getBlock(blockNum);
    let timestamp = block.timestamp;
    timestamp += loanDuration + (60 * 60 * 24);
    await ethers.provider.send('evm_setNextBlockTimestamp', [
      timestamp
    ]);
    await ethers.provider.send('evm_mine', []);
    await loanContract.connect(lender).liquidateOverdueLoanViaAuction(0);

    const nftOwner = await perifiNFT.ownerOf(tokenId);
    // check the assets are transferred correctly
    await expect(nftOwner).equal(auctionContract.address);
    const interval = await auctionContract.decrementInterval();
    const endTime = timestamp + (interval.toNumber() * 21);
    let auctionParams;
    try {
      auctionParams = {
        loanId: 0,
        tokenAddress,
        paymentToken,
        tokenId,
        startAmount: BigNumber.from(20000).toString(), // asset's last traded price or curation result.
        endAmount: BigNumber.from(20000).mul(BigNumber.from(4)).div(BigNumber.from(10)).toString(), // 40% of the start amount (rounding up)
        startTime: timestamp,
        endTime, // 21 days
        stepDownConfig: ethers.utils.hexlify([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 255]),
        loanBorrower: borrower.address,
        loanAmount,
        lender: lender.address,
        loanRepaymentAmount: repaymentAmt,
        isProtected: false
      };
    } catch (e) {
      console.log(e);
    }
    try {
      await auctionContract.connect(signer).beginAuction(auctionParams);
    } catch (e) {
      console.log(e);
    }
    let currentBidPrice;
    try {
      currentBidPrice = await auctionContract.currentBidPrice(0);
      await expect(currentBidPrice).equal(expectedPriceDecrement[0]);
    } catch (e) {
      console.log(e);
    }
    for (let halfDay = 1; halfDay < 42; halfDay++) {
      timestamp += (interval / 2);
      await ethers.provider.send('evm_setNextBlockTimestamp', [
        timestamp
      ]);
      await ethers.provider.send('evm_mine', []);
      currentBidPrice = await auctionContract.currentBidPrice(0);
      const day = Math.floor(halfDay / 2);
      try {
        await expect(currentBidPrice).equal(expectedPriceDecrement[day]);
      } catch (e) {
        console.log(e);
        throw e;
      }
    }
  });
  it('Loan (no leverage) - liquidate via auction - repayment distribution', async () => {
    const loanAmount = 10000;
    const leveragedAmt = 0;
    const repaymentAmt = 11000;
    const tokenId = 1;
    const loanDuration = 60;
    const adminFee = 500;
    const lenderNonce = 1;
    const borrowerNonce = 2;
    const tokenAddress = perifiNFT.address;
    const paymentToken = nendC.address;
    const lenderAddress = lender.address;
    const liquidateViaAuction = true;
    const chainId = 31337;

    // set up borrower msg, hash and signature
    const borrowerMsg = ethers.utils.solidityPack([
      'uint256',
      'uint256',
      'address',
      'address',
      'uint256'], [
      tokenId,
      borrowerNonce,
      tokenAddress,
      borrower.address,
      chainId
    ]);
    const borrowerHash = ethers.utils.keccak256(borrowerMsg);
    const borrowerHashBin = ethers.utils.arrayify(borrowerHash);
    const borrowerSignature = borrower.signMessage(borrowerHashBin);
    // set up lender msg, hash and signature
    const lenderMsg = ethers.utils.solidityPack([
      'uint256',
      'uint256',
      'uint256',
      'uint256',
      'uint256',
      'uint256',
      'uint256',
      'address',
      'address',
      'address',
      'bool',
      'uint256'], [
      loanAmount,
      leveragedAmt,
      repaymentAmt,
      tokenId,
      loanDuration,
      adminFee,
      lenderNonce,
      tokenAddress,
      paymentToken,
      lenderAddress,
      liquidateViaAuction,
      chainId
    ]);

    const lenderHash = ethers.utils.keccak256(lenderMsg);
    const lenderHashBin = ethers.utils.arrayify(lenderHash);
    const lenderSignature = lender.signMessage(lenderHashBin);
    // set allowance on loan to transfer loan amount
    await nendC.connect(lender).approve(loanContract.address, 10000);
    // set allowance on loan to transfer the collateral
    await perifiNFT.connect(borrower).setApprovalForAll(loanContract.address, true);
    // start the loan
    await loanContract.connect(borrower).beginLoan(
      loanAmount,
      leveragedAmt,
      repaymentAmt,
      tokenId,
      loanDuration,
      adminFee,
      [borrowerNonce, lenderNonce],
      tokenAddress,
      paymentToken,
      lender.address,
      borrowerSignature,
      lenderSignature,
      liquidateViaAuction
    );
    const blockNum = await ethers.provider.getBlockNumber();
    const block = await ethers.provider.getBlock(blockNum);
    let timestamp = block.timestamp;
    timestamp += loanDuration + (60 * 60 * 24);
    await ethers.provider.send('evm_setNextBlockTimestamp', [
      timestamp
    ]);
    await ethers.provider.send('evm_mine', []);
    try {
      await loanContract.connect(lender).liquidateOverdueLoanViaAuction(0);
      const nftOwner = await perifiNFT.ownerOf(tokenId);
      // check the assets are transferred correctly
      await expect(nftOwner).equal(auctionContract.address);
    } catch (e) {
      console.log(e);
    }
    let auctionParams;
    try {
      auctionParams = {
        loanId: 0,
        tokenAddress,
        paymentToken,
        tokenId,
        startAmount: BigNumber.from(20000).toString(), // asset's last traded price or curation result.
        endAmount: BigNumber.from(20000).mul(BigNumber.from(4)).div(BigNumber.from(10)).toString(), // 40% of the start amount (rounding up)
        startTime: timestamp,
        endTime: timestamp + (60 * 60 * 24 * 21), // 21 days
        stepDownConfig: ethers.utils.hexlify([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 255]),
        loanBorrower: borrower.address,
        loanAmount,
        lender: lender.address,
        loanRepaymentAmount: repaymentAmt,
        isProtected: false
      };
    } catch (e) {
      console.log(e);
    }
    try {
      await auctionContract.connect(signer).beginAuction(auctionParams);
    } catch (e) {
      console.log(e);
    }
    for (let day = 1; day < 11; day++) {
      timestamp += (60 * 60 * 24);
      await ethers.provider.send('evm_setNextBlockTimestamp', [
        timestamp
      ]);
      await ethers.provider.send('evm_mine', []);
    }
    await nendC.connect(owner).createAirdropBatch([user1.address], 20000);
    await nendC.connect(user1).approve(auctionContract.address, 20000);
    console.log('current bid price: ' + await auctionContract.connect(user1).currentBidPrice(0));
    await auctionContract.connect(user1).makeBid(0);

    const lenderBalanceAfter = await nendC.balanceOf(lender.address);
    // const borrowerBalanceAfter = await nendC.balanceOf(borrower.address);
    const crBalance = await nendC.balanceOf(curationRewardContract.address);
    // const lpBalance = await nendC.balanceOf(lendingPoolContract.address);
    // const ivBalance = await nendC.balanceOf(insuranceVaultContract.address);
    const mwBalance = await nendC.balanceOf(owner.address);
    const nftOwnerAfter = await perifiNFT.ownerOf(tokenId);
    // check the assets are transferred correctly
    await expect(nftOwnerAfter).equal(user1.address);
    await expect(lenderBalanceAfter).equal(10950);
    // await expect(borrowerBalanceAfter).equal(10000);
    await expect(mwBalance).equal(40);
    await expect(crBalance).equal(10);
  });
  it('Loan (no leverage) - liquidate via auction - repayment distribution with insurance', async () => {
    const loanAmount = 10000;
    const leveragedAmt = 0;
    const repaymentAmt = 11000;
    const tokenId = 1;
    const loanDuration = 60;
    const adminFee = 500;
    const lenderNonce = 1;
    const borrowerNonce = 2;
    const tokenAddress = perifiNFT.address;
    const paymentToken = nendC.address;
    const lenderAddress = lender.address;
    const liquidateViaAuction = true;
    const chainId = 31337;

    // set up borrower msg, hash and signature
    const borrowerMsg = ethers.utils.solidityPack([
      'uint256',
      'uint256',
      'address',
      'address',
      'uint256'], [
      tokenId,
      borrowerNonce,
      tokenAddress,
      borrower.address,
      chainId
    ]);
    const borrowerHash = ethers.utils.keccak256(borrowerMsg);
    const borrowerHashBin = ethers.utils.arrayify(borrowerHash);
    const borrowerSignature = borrower.signMessage(borrowerHashBin);
    // set up lender msg, hash and signature
    const lenderMsg = ethers.utils.solidityPack([
      'uint256',
      'uint256',
      'uint256',
      'uint256',
      'uint256',
      'uint256',
      'uint256',
      'address',
      'address',
      'address',
      'bool',
      'uint256'], [
      loanAmount,
      leveragedAmt,
      repaymentAmt,
      tokenId,
      loanDuration,
      adminFee,
      lenderNonce,
      tokenAddress,
      paymentToken,
      lenderAddress,
      liquidateViaAuction,
      chainId
    ]);

    const lenderHash = ethers.utils.keccak256(lenderMsg);
    const lenderHashBin = ethers.utils.arrayify(lenderHash);
    const lenderSignature = lender.signMessage(lenderHashBin);
    // set allowance on loan to transfer loan amount
    await nendC.connect(lender).approve(loanContract.address, 10000);
    // set allowance on loan to transfer the collateral
    await perifiNFT.connect(borrower).setApprovalForAll(loanContract.address, true);
    // start the loan
    await loanContract.connect(borrower).beginLoan(
      loanAmount,
      leveragedAmt,
      repaymentAmt,
      tokenId,
      loanDuration,
      adminFee,
      [borrowerNonce, lenderNonce],
      tokenAddress,
      paymentToken,
      lender.address,
      borrowerSignature,
      lenderSignature,
      liquidateViaAuction
    );
    const blockNum = await ethers.provider.getBlockNumber();
    const block = await ethers.provider.getBlock(blockNum);
    let timestamp = block.timestamp;
    timestamp += loanDuration + (60 * 60 * 24);
    await ethers.provider.send('evm_setNextBlockTimestamp', [
      timestamp
    ]);
    await ethers.provider.send('evm_mine', []);
    await loanContract.connect(lender).liquidateOverdueLoanViaAuction(0);

    const nftOwner = await perifiNFT.ownerOf(tokenId);
    // check the assets are transferred correctly
    await expect(nftOwner).equal(auctionContract.address);
    let auctionParams;
    try {
      auctionParams = {
        loanId: 0,
        tokenAddress,
        paymentToken,
        tokenId,
        startAmount: BigNumber.from(20000).toString(), // asset's last traded price or curation result.
        endAmount: BigNumber.from(20000).mul(BigNumber.from(4)).div(BigNumber.from(10)).toString(), // 40% of the start amount (rounding up)
        startTime: timestamp,
        endTime: timestamp + (60 * 60 * 24 * 21), // 21 days
        stepDownConfig: ethers.utils.hexlify([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 255]),
        loanBorrower: borrower.address,
        loanAmount,
        lender: lender.address,
        loanRepaymentAmount: repaymentAmt,
        isProtected: false
      };
    } catch (e) {
      console.log(e);
    }
    try {
      await auctionContract.connect(signer).beginAuction(auctionParams);
    } catch (e) {
      console.log(e);
    }
    for (let day = 1; day < 21; day++) {
      timestamp += (60 * 60 * 24);
      await ethers.provider.send('evm_setNextBlockTimestamp', [
        timestamp
      ]);
      await ethers.provider.send('evm_mine', []);
    }

    try {
      await nendC.connect(owner).createAirdropBatch([user1.address], 8000);
      await nendC.connect(owner).createAirdropBatch([insuranceVaultContract.address], 4000);
      await nendC.connect(user1).approve(auctionContract.address, 8000);
      await auctionContract.connect(user1).makeBid(0);

      const lenderBalanceAfter = await nendC.balanceOf(lender.address);
      const borrowerBalanceAfter = await nendC.balanceOf(borrower.address);
      const crBalance = await nendC.balanceOf(curationRewardContract.address);
      // const lpBalance = await nendC.balanceOf(lendingPoolContract.address);
      // const ivBalanceAfter = await nendC.balanceOf(insuranceVaultContract.address);
      const mwBalance = await nendC.balanceOf(owner.address);
      const nftOwnerAfter = await perifiNFT.ownerOf(tokenId);
      // check the assets are transferred correctly
      await expect(nftOwnerAfter).equal(user1.address);
      await expect(lenderBalanceAfter).equal(8000);
      await expect(borrowerBalanceAfter).equal(10000);
      // await expect(ivBalanceAfter).equal(1000);
      await expect(mwBalance).equal(0);
      await expect(crBalance).equal(10);
    } catch (e) {
      console.log(e);
    }
  });
  it('Loan (leveraged) - liquidate via auction - repayment distribution', async () => {
    // using 20% of lending pool
    // pool takes 40% from IFP
    // lender takes 55% from IFP
    const loanAmount = 20000;
    const leveragedAmt = 10000;
    const repaymentAmt = 22000;
    const tokenId = 1;
    const loanDuration = 60;
    const adminFee = 500;
    const lenderNonce = 1;
    const borrowerNonce = 2;
    const tokenAddress = perifiNFT.address;
    const paymentToken = nendC.address;
    const lenderAddress = lender.address;
    const liquidateViaAuction = true;
    const chainId = 31337;

    // set up borrower msg, hash and signature
    const borrowerMsg = ethers.utils.solidityPack([
      'uint256',
      'uint256',
      'address',
      'address',
      'uint256'], [
      tokenId,
      borrowerNonce,
      tokenAddress,
      borrower.address,
      chainId
    ]);
    const borrowerHash = ethers.utils.keccak256(borrowerMsg);
    const borrowerHashBin = ethers.utils.arrayify(borrowerHash);
    const borrowerSignature = borrower.signMessage(borrowerHashBin);
    // set up lender msg, hash and signature
    const lenderMsg = ethers.utils.solidityPack([
      'uint256',
      'uint256',
      'uint256',
      'uint256',
      'uint256',
      'uint256',
      'uint256',
      'address',
      'address',
      'address',
      'bool',
      'uint256'], [
      loanAmount,
      leveragedAmt,
      repaymentAmt,
      tokenId,
      loanDuration,
      adminFee,
      lenderNonce,
      tokenAddress,
      paymentToken,
      lenderAddress,
      liquidateViaAuction,
      chainId
    ]);

    const lenderHash = ethers.utils.keccak256(lenderMsg);
    const lenderHashBin = ethers.utils.arrayify(lenderHash);
    const lenderSignature = lender.signMessage(lenderHashBin);

    // set allowance on loan to transfer loan amount
    await nendC.connect(lender).approve(loanContract.address, 10000);
    // set allowance on loan to transfer the collateral
    await perifiNFT.connect(borrower).setApprovalForAll(loanContract.address, true);
    // start the loan
    await loanContract.connect(borrower).beginLoan(
      loanAmount,
      leveragedAmt,
      repaymentAmt,
      tokenId,
      loanDuration,
      adminFee,
      [borrowerNonce, lenderNonce],
      tokenAddress,
      paymentToken,
      lender.address,
      borrowerSignature,
      lenderSignature,
      liquidateViaAuction
    );
    const blockNum = await ethers.provider.getBlockNumber();
    const block = await ethers.provider.getBlock(blockNum);
    let timestamp = block.timestamp;
    timestamp += loanDuration + (60 * 60 * 24);
    await ethers.provider.send('evm_setNextBlockTimestamp', [
      timestamp
    ]);
    await ethers.provider.send('evm_mine', []);
    await loanContract.connect(lender).liquidateOverdueLoanViaAuction(0);

    const nftOwner = await perifiNFT.ownerOf(tokenId);
    // check the assets are transferred correctly
    await expect(nftOwner).equal(auctionContract.address);

    let auctionParams;
    try {
      auctionParams = {
        loanId: 0,
        tokenAddress,
        paymentToken,
        tokenId,
        startAmount: BigNumber.from(40000).toString(), // asset's last traded price or curation result.
        endAmount: BigNumber.from(40000).mul(BigNumber.from(4)).div(BigNumber.from(10)).toString(), // 40% of the start amount (rounding up)
        startTime: timestamp,
        endTime: timestamp + (60 * 60 * 24 * 21), // 21 days
        stepDownConfig: ethers.utils.hexlify([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 255]),
        loanBorrower: borrower.address,
        loanAmount,
        lender: lender.address,
        loanRepaymentAmount: repaymentAmt,
        isProtected: false
      };
    } catch (e) {
      console.log(e);
    }
    try {
      await auctionContract.connect(signer).beginAuction(auctionParams);
    } catch (e) {
      console.log(e);
    }
    for (let day = 1; day < 11; day++) {
      timestamp += (60 * 60 * 24);
      await ethers.provider.send('evm_setNextBlockTimestamp', [
        timestamp
      ]);
      await ethers.provider.send('evm_mine', []);
    }

    try {
      await nendC.connect(owner).createAirdropBatch([user1.address], 32000);
      await nendC.connect(user1).approve(auctionContract.address, 32000);
      await auctionContract.connect(user1).makeBid(0);

      const lenderBalanceAfter = await nendC.balanceOf(lender.address);
      const borrowerBalanceAfter = await nendC.balanceOf(borrower.address);
      const crBalanceAfter = await nendC.balanceOf(curationRewardContract.address);
      const lpBalanceAfter = await nendC.balanceOf(lendingPoolContract.address);
      const ivBalanceAfter = await nendC.balanceOf(insuranceVaultContract.address);
      const mwBalanceAfter = await nendC.balanceOf(owner.address);
      const nftOwnerAfter = await perifiNFT.ownerOf(tokenId);
      // check the assets are transferred correctly
      await expect(nftOwnerAfter).equal(user1.address);
      await expect(lpBalanceAfter).equal(50400);
      await expect(ivBalanceAfter).equal(50);
      await expect(lenderBalanceAfter).equal(11500);
      await expect(borrowerBalanceAfter).equal(30000);
      await expect(mwBalanceAfter).equal(40);
      await expect(crBalanceAfter).equal(10);
      await expect((await loanContract.totalNumLoans()).toNumber()).to.equal(1);
    } catch (e) {
      console.log(e);
    }
  });
  it('Loan (leveraged) - liquidate via auction - repayment distribution with insurance', async () => {
    // using 20% of lending pool
    // pool takes 40% from IFP
    // lender takes 55% from IFP
    const loanAmount = 20000;
    const leveragedAmt = 10000;
    const repaymentAmt = 22000;
    const tokenId = 1;
    const loanDuration = 60;
    const adminFee = 500;
    const lenderNonce = 1;
    const borrowerNonce = 2;
    const tokenAddress = perifiNFT.address;
    const paymentToken = nendC.address;
    const lenderAddress = lender.address;
    const liquidateViaAuction = true;
    const chainId = 31337;

    // set up borrower msg, hash and signature
    const borrowerMsg = ethers.utils.solidityPack([
      'uint256',
      'uint256',
      'address',
      'address',
      'uint256'], [
      tokenId,
      borrowerNonce,
      tokenAddress,
      borrower.address,
      chainId
    ]);
    const borrowerHash = ethers.utils.keccak256(borrowerMsg);
    const borrowerHashBin = ethers.utils.arrayify(borrowerHash);
    const borrowerSignature = borrower.signMessage(borrowerHashBin);
    // set up lender msg, hash and signature
    const lenderMsg = ethers.utils.solidityPack([
      'uint256',
      'uint256',
      'uint256',
      'uint256',
      'uint256',
      'uint256',
      'uint256',
      'address',
      'address',
      'address',
      'bool',
      'uint256'], [
      loanAmount,
      leveragedAmt,
      repaymentAmt,
      tokenId,
      loanDuration,
      adminFee,
      lenderNonce,
      tokenAddress,
      paymentToken,
      lenderAddress,
      liquidateViaAuction,
      chainId
    ]);

    const lenderHash = ethers.utils.keccak256(lenderMsg);
    const lenderHashBin = ethers.utils.arrayify(lenderHash);
    const lenderSignature = lender.signMessage(lenderHashBin);

    // set allowance on loan to transfer loan amount
    await nendC.connect(lender).approve(loanContract.address, 10000);
    // set allowance on loan to transfer the collateral
    await perifiNFT.connect(borrower).setApprovalForAll(loanContract.address, true);
    // start the loan
    await loanContract.connect(borrower).beginLoan(
      loanAmount,
      leveragedAmt,
      repaymentAmt,
      tokenId,
      loanDuration,
      adminFee,
      [borrowerNonce, lenderNonce],
      tokenAddress,
      paymentToken,
      lender.address,
      borrowerSignature,
      lenderSignature,
      liquidateViaAuction
    );
    const blockNum = await ethers.provider.getBlockNumber();
    const block = await ethers.provider.getBlock(blockNum);
    let timestamp = block.timestamp;
    timestamp += loanDuration + (60 * 60 * 24);
    await ethers.provider.send('evm_setNextBlockTimestamp', [
      timestamp
    ]);
    await ethers.provider.send('evm_mine', []);
    await loanContract.connect(lender).liquidateOverdueLoanViaAuction(0);

    const nftOwner = await perifiNFT.ownerOf(tokenId);
    // check the assets are transferred correctly
    await expect(nftOwner).equal(auctionContract.address);

    let auctionParams;
    try {
      auctionParams = {
        loanId: 0,
        tokenAddress,
        paymentToken,
        tokenId,
        startAmount: BigNumber.from(40000).toString(), // asset's last traded price or curation result.
        endAmount: BigNumber.from(40000).mul(BigNumber.from(4)).div(BigNumber.from(10)).toString(), // 40% of the start amount (rounding up)
        startTime: timestamp,
        endTime: timestamp + (60 * 60 * 24 * 21), // 21 days
        stepDownConfig: ethers.utils.hexlify([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 255]),
        loanBorrower: borrower.address,
        loanAmount,
        lender: lender.address,
        loanRepaymentAmount: repaymentAmt,
        isProtected: false
      };
    } catch (e) {
      console.log(e);
    }
    try {
      await auctionContract.connect(signer).beginAuction(auctionParams);
    } catch (e) {
      console.log(e);
    }
    for (let day = 1; day < 21; day++) {
      timestamp += (60 * 60 * 24);
      await ethers.provider.send('evm_setNextBlockTimestamp', [
        timestamp
      ]);
      await ethers.provider.send('evm_mine', []);
    }

    await nendC.connect(owner).createAirdropBatch([user1.address], 16000);
    await nendC.connect(owner).createAirdropBatch([insuranceVaultContract.address], 10000);
    await nendC.connect(user1).approve(auctionContract.address, 16000);
    await auctionContract.connect(user1).makeBid(0);

    const lenderBalanceAfter = await nendC.balanceOf(lender.address);
    const borrowerBalanceAfter = await nendC.balanceOf(borrower.address);
    const crBalanceAfter = await nendC.balanceOf(curationRewardContract.address);
    const lpBalanceAfter = await nendC.balanceOf(lendingPoolContract.address);
    // const ivBalanceAfter = await nendC.balanceOf(insuranceVaultContract.address);
    const mwBalanceAfter = await nendC.balanceOf(owner.address);
    const nftOwnerAfter = await perifiNFT.ownerOf(tokenId);
    // check the assets are transferred correctly
    await expect(nftOwnerAfter).equal(user1.address);
    await expect(lpBalanceAfter).equal(50000);
    // await expect(ivBalanceAfter).equal(4050);
    await expect(lenderBalanceAfter).equal(6000);
    await expect(borrowerBalanceAfter).equal(20000);
    await expect(mwBalanceAfter).equal(0);
    await expect(crBalanceAfter).equal(10);
    await expect((await loanContract.totalNumLoans()).toNumber()).to.equal(1);
  });
  it('Loan (leveraged) - liquidate via low health factor auction - repayment distribution with protection + claim', async () => {
    // using 20% of lending pool
    // pool takes 40% from IFP
    // lender takes 55% from IFP
    const loanAmount = 20000;
    const leveragedAmt = 10000;
    const repaymentAmt = 22000;
    const tokenId = 1;
    const loanDuration = 60;
    const adminFee = 500;
    const lenderNonce = 1;
    const borrowerNonce = 2;
    const tokenAddress = perifiNFT.address;
    const paymentToken = nendC.address;
    const lenderAddress = lender.address;
    const liquidateViaAuction = true;
    const chainId = 31337;

    // set up borrower msg, hash and signature
    const borrowerMsg = ethers.utils.solidityPack([
      'uint256',
      'uint256',
      'address',
      'address',
      'uint256'], [
      tokenId,
      borrowerNonce,
      tokenAddress,
      borrower.address,
      chainId
    ]);
    const borrowerHash = ethers.utils.keccak256(borrowerMsg);
    const borrowerHashBin = ethers.utils.arrayify(borrowerHash);
    const borrowerSignature = borrower.signMessage(borrowerHashBin);
    // set up lender msg, hash and signature
    const lenderMsg = ethers.utils.solidityPack([
      'uint256',
      'uint256',
      'uint256',
      'uint256',
      'uint256',
      'uint256',
      'uint256',
      'address',
      'address',
      'address',
      'bool',
      'uint256'], [
      loanAmount,
      leveragedAmt,
      repaymentAmt,
      tokenId,
      loanDuration,
      adminFee,
      lenderNonce,
      tokenAddress,
      paymentToken,
      lenderAddress,
      liquidateViaAuction,
      chainId
    ]);

    const lenderHash = ethers.utils.keccak256(lenderMsg);
    const lenderHashBin = ethers.utils.arrayify(lenderHash);
    const lenderSignature = lender.signMessage(lenderHashBin);

    // set allowance on loan to transfer loan amount
    await nendC.connect(lender).approve(loanContract.address, 10000);
    // set allowance on loan to transfer the collateral
    await perifiNFT.connect(borrower).setApprovalForAll(loanContract.address, true);
    // start the loan
    await loanContract.connect(borrower).beginLoan(
      loanAmount,
      leveragedAmt,
      repaymentAmt,
      tokenId,
      loanDuration,
      adminFee,
      [borrowerNonce, lenderNonce],
      tokenAddress,
      paymentToken,
      lender.address,
      borrowerSignature,
      lenderSignature,
      liquidateViaAuction
    );
    await loanContract.connect(signer).liquidateLowHealthFactorLoanViaAuction(0);

    const nftOwner = await perifiNFT.ownerOf(tokenId);
    // check the assets are transferred correctly
    await expect(nftOwner).equal(auctionContract.address);

    const blockNum = await ethers.provider.getBlockNumber();
    const block = await ethers.provider.getBlock(blockNum);
    let timestamp = block.timestamp;
    let auctionParams;
    try {
      auctionParams = {
        loanId: 0,
        tokenAddress,
        paymentToken,
        tokenId,
        startAmount: BigNumber.from(40000).toString(), // asset's last traded price or curation result.
        endAmount: BigNumber.from(40000).mul(BigNumber.from(8)).div(BigNumber.from(10)).toString(), // 40% of the start amount (rounding up)
        startTime: timestamp,
        endTime: timestamp + (60 * 60 * 24 * 20), // 21 days
        stepDownConfig: ethers.utils.hexlify([]),
        loanBorrower: borrower.address,
        loanAmount,
        lender: lender.address,
        loanRepaymentAmount: repaymentAmt,
        isProtected: true
      };
    } catch (e) {
      console.log(e);
    }
    try {
      await auctionContract.connect(signer).beginAuction(auctionParams);
    } catch (e) {
      console.log(e);
    }
    try {
      await nendC.connect(owner).createAirdropBatch([user1.address], 40000);
      await nendC.connect(user1).approve(auctionContract.address, 40000);
      await auctionContract.connect(user1).makeBid(0);

      timestamp += (60 * 60 * 24 * 2);
      await ethers.provider.send('evm_setNextBlockTimestamp', [
        timestamp
      ]);
      await ethers.provider.send('evm_mine', []);

      const auctionBalance = await nendC.balanceOf(auctionContract.address);
      await expect(auctionBalance).equal(40000);
      await auctionContract.connect(user1).claim(0);
      const lenderBalanceAfter = await nendC.balanceOf(lender.address);
      const borrowerBalanceAfter = await nendC.balanceOf(borrower.address);
      const crBalanceAfter = await nendC.balanceOf(curationRewardContract.address);
      const lpBalanceAfter = await nendC.balanceOf(lendingPoolContract.address);
      const ivBalanceAfter = await nendC.balanceOf(insuranceVaultContract.address);
      const mwBalanceAfter = await nendC.balanceOf(owner.address);
      const nftOwnerAfter = await perifiNFT.ownerOf(tokenId);
      // check the assets are transferred correctly
      await expect(nftOwnerAfter).equal(user1.address);
      await expect(lpBalanceAfter).equal(50400);
      await expect(ivBalanceAfter).equal(50);
      await expect(lenderBalanceAfter).equal(11500);
      await expect(borrowerBalanceAfter).equal(38000);
      await expect(mwBalanceAfter).equal(40);
      await expect(crBalanceAfter).equal(10);
      await expect((await loanContract.totalNumLoans()).toNumber()).to.equal(1);
    } catch (e) {
      console.log(e);
    }
  });
  it('Loan (leveraged) - liquidate via low health factor auction - repayment distribution with protection + payout', async () => {
    // using 20% of lending pool
    // pool takes 40% from IFP
    // lender takes 55% from IFP
    const loanAmount = 20000;
    const leveragedAmt = 10000;
    const repaymentAmt = 22000;
    const tokenId = 1;
    const loanDuration = 60;
    const adminFee = 500;
    const lenderNonce = 1;
    const borrowerNonce = 2;
    const tokenAddress = perifiNFT.address;
    const paymentToken = nendC.address;
    const lenderAddress = lender.address;
    const liquidateViaAuction = true;
    const chainId = 31337;

    // set up borrower msg, hash and signature
    const borrowerMsg = ethers.utils.solidityPack([
      'uint256',
      'uint256',
      'address',
      'address',
      'uint256'], [
      tokenId,
      borrowerNonce,
      tokenAddress,
      borrower.address,
      chainId
    ]);
    const borrowerHash = ethers.utils.keccak256(borrowerMsg);
    const borrowerHashBin = ethers.utils.arrayify(borrowerHash);
    const borrowerSignature = borrower.signMessage(borrowerHashBin);
    // set up lender msg, hash and signature
    const lenderMsg = ethers.utils.solidityPack([
      'uint256',
      'uint256',
      'uint256',
      'uint256',
      'uint256',
      'uint256',
      'uint256',
      'address',
      'address',
      'address',
      'bool',
      'uint256'], [
      loanAmount,
      leveragedAmt,
      repaymentAmt,
      tokenId,
      loanDuration,
      adminFee,
      lenderNonce,
      tokenAddress,
      paymentToken,
      lenderAddress,
      liquidateViaAuction,
      chainId
    ]);

    const lenderHash = ethers.utils.keccak256(lenderMsg);
    const lenderHashBin = ethers.utils.arrayify(lenderHash);
    const lenderSignature = lender.signMessage(lenderHashBin);

    // set allowance on loan to transfer loan amount
    await nendC.connect(lender).approve(loanContract.address, 10000);
    // set allowance on loan to transfer the collateral
    await perifiNFT.connect(borrower).setApprovalForAll(loanContract.address, true);
    // start the loan
    await loanContract.connect(borrower).beginLoan(
      loanAmount,
      leveragedAmt,
      repaymentAmt,
      tokenId,
      loanDuration,
      adminFee,
      [borrowerNonce, lenderNonce],
      tokenAddress,
      paymentToken,
      lender.address,
      borrowerSignature,
      lenderSignature,
      liquidateViaAuction
    );
    await loanContract.connect(signer).liquidateLowHealthFactorLoanViaAuction(0);

    const nftOwner = await perifiNFT.ownerOf(tokenId);
    // check the assets are transferred correctly
    await expect(nftOwner).equal(auctionContract.address);

    const blockNum = await ethers.provider.getBlockNumber();
    const block = await ethers.provider.getBlock(blockNum);
    const timestamp = block.timestamp;
    let auctionParams;
    try {
      auctionParams = {
        loanId: 0,
        tokenAddress,
        paymentToken,
        tokenId,
        startAmount: BigNumber.from(40000).toString(), // asset's last traded price or curation result.
        endAmount: BigNumber.from(40000).mul(BigNumber.from(8)).div(BigNumber.from(10)).toString(), // 40% of the start amount (rounding up)
        startTime: timestamp,
        endTime: timestamp + (60 * 60 * 24 * 20), // 21 days
        stepDownConfig: ethers.utils.hexlify([]),
        loanBorrower: borrower.address,
        loanAmount,
        lender: lender.address,
        loanRepaymentAmount: repaymentAmt,
        isProtected: true
      };
    } catch (e) {
      console.log(e);
    }
    try {
      await auctionContract.connect(signer).beginAuction(auctionParams);
    } catch (e) {
      console.log(e);
    }
    try {
      await nendC.connect(owner).createAirdropBatch([user1.address], 40000);
      await nendC.connect(user1).approve(auctionContract.address, 40000);
      await auctionContract.connect(user1).makeBid(0);

      const auctionBalance = await nendC.balanceOf(auctionContract.address);
      await expect(auctionBalance).equal(40000);
      console.log(`auction contract: ${auctionContract.address}`);

      await nendC.connect(owner).createAirdropBatch([borrower.address], 4000);
      await nendC.connect(borrower).approve(auctionContract.address, 24000);
      await auctionContract.connect(borrower).payout(0);
      const lenderBalanceAfter = await nendC.balanceOf(lender.address);
      const borrowerBalanceAfter = await nendC.balanceOf(borrower.address);
      const bidderBalanceAfter = await nendC.balanceOf(user1.address);
      const crBalanceAfter = await nendC.balanceOf(curationRewardContract.address);
      const lpBalanceAfter = await nendC.balanceOf(lendingPoolContract.address);
      const ivBalanceAfter = await nendC.balanceOf(insuranceVaultContract.address);
      const mwBalanceAfter = await nendC.balanceOf(owner.address);
      const nftOwnerAfter = await perifiNFT.ownerOf(tokenId);
      // check the assets are transferred correctly
      await expect(nftOwnerAfter).equal(borrower.address);
      await expect(lpBalanceAfter).equal(50400);
      await expect(bidderBalanceAfter).equal(42000);
      await expect(ivBalanceAfter).equal(50);
      await expect(lenderBalanceAfter).equal(11500);
      await expect(borrowerBalanceAfter).equal(0);
      await expect(mwBalanceAfter).equal(40);
      await expect(crBalanceAfter).equal(10);
      await expect((await loanContract.totalNumLoans()).toNumber()).to.equal(1);
    } catch (e) {
      console.log(e);
    }
  });
  it('Loan (leveraged) - liquidate via low health factor auction - price decrement check', async () => {
    // using 20% of lending pool
    // pool takes 40% from IFP
    // lender takes 55% from IFP
    const loanAmount = 20000;
    const leveragedAmt = 10000;
    const repaymentAmt = 22000;
    const tokenId = 1;
    const loanDuration = 60;
    const adminFee = 500;
    const lenderNonce = 1;
    const borrowerNonce = 2;
    const tokenAddress = perifiNFT.address;
    const paymentToken = nendC.address;
    const lenderAddress = lender.address;
    const liquidateViaAuction = true;
    const chainId = 31337;

    // set up borrower msg, hash and signature
    const borrowerMsg = ethers.utils.solidityPack([
      'uint256',
      'uint256',
      'address',
      'address',
      'uint256'], [
      tokenId,
      borrowerNonce,
      tokenAddress,
      borrower.address,
      chainId
    ]);
    const borrowerHash = ethers.utils.keccak256(borrowerMsg);
    const borrowerHashBin = ethers.utils.arrayify(borrowerHash);
    const borrowerSignature = borrower.signMessage(borrowerHashBin);
    // set up lender msg, hash and signature
    const lenderMsg = ethers.utils.solidityPack([
      'uint256',
      'uint256',
      'uint256',
      'uint256',
      'uint256',
      'uint256',
      'uint256',
      'address',
      'address',
      'address',
      'bool',
      'uint256'], [
      loanAmount,
      leveragedAmt,
      repaymentAmt,
      tokenId,
      loanDuration,
      adminFee,
      lenderNonce,
      tokenAddress,
      paymentToken,
      lenderAddress,
      liquidateViaAuction,
      chainId
    ]);

    const lenderHash = ethers.utils.keccak256(lenderMsg);
    const lenderHashBin = ethers.utils.arrayify(lenderHash);
    const lenderSignature = lender.signMessage(lenderHashBin);

    // set allowance on loan to transfer loan amount
    await nendC.connect(lender).approve(loanContract.address, 10000);
    // set allowance on loan to transfer the collateral
    await perifiNFT.connect(borrower).setApprovalForAll(loanContract.address, true);
    // start the loan
    await loanContract.connect(borrower).beginLoan(
      loanAmount,
      leveragedAmt,
      repaymentAmt,
      tokenId,
      loanDuration,
      adminFee,
      [borrowerNonce, lenderNonce],
      tokenAddress,
      paymentToken,
      lender.address,
      borrowerSignature,
      lenderSignature,
      liquidateViaAuction
    );
    await loanContract.connect(signer).liquidateLowHealthFactorLoanViaAuction(0);

    const nftOwner = await perifiNFT.ownerOf(tokenId);
    // check the assets are transferred correctly
    await expect(nftOwner).equal(auctionContract.address);

    const blockNum = await ethers.provider.getBlockNumber();
    const block = await ethers.provider.getBlock(blockNum);
    let timestamp = block.timestamp;
    let auctionParams;
    try {
      auctionParams = {
        loanId: 0,
        tokenAddress,
        paymentToken,
        tokenId,
        startAmount: BigNumber.from(40000).toString(), // asset's last traded price or curation result.
        endAmount: BigNumber.from(40000).mul(BigNumber.from(8)).div(BigNumber.from(10)).toString(), // 40% of the start amount (rounding up)
        startTime: timestamp,
        endTime: timestamp + (60 * 60 * 24 * 20), // 21 days
        stepDownConfig: ethers.utils.hexlify([]),
        loanBorrower: borrower.address,
        loanAmount,
        lender: lender.address,
        loanRepaymentAmount: repaymentAmt,
        isProtected: true
      };
    } catch (e) {
      console.log(e);
    }
    try {
      await auctionContract.connect(signer).beginAuction(auctionParams);
    } catch (e) {
      console.log(e);
    }
    let currentBidPrice;
    for (let day = 1; day <= 20; day++) {
      timestamp += (60 * 60 * 24);
      await ethers.provider.send('evm_setNextBlockTimestamp', [
        timestamp
      ]);
      await ethers.provider.send('evm_mine', []);
      currentBidPrice = await auctionContract.currentBidPrice(0);
      await expect(currentBidPrice).equal(40000 - (day * 400));
    }
  });
});
