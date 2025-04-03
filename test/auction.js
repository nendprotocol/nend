const {
  BigNumber
} = require('ethers');
const { ethers, network } = require('hardhat');
const { faucet } = require('./utils/impersonate');
const {
  randomHex,
  toKey,
  toBN
} = require('./utils/encoding');
const {
  seaportFixture
} = require('./utils/fixtures');
const { expect } = require('chai');

const getCurrentAuctionPrice = (startAmount, endAmount, startTime, endTime, current) => {
  // Declare variables to derive in the subsequent unchecked scope.

  // Derive the duration for the order and place it on the stack.
  const duration = endTime - startTime;

  // Derive time elapsed since the order started & place on stack.
  const elapsed = current - startTime;

  // Derive time remaining until order expires and place on stack.
  const remaining = duration - elapsed;

  // Aggregate new amounts weighted by time with rounding factor.
  const totalBeforeDivision = ((startAmount * remaining) +
      (endAmount * elapsed));

  if (totalBeforeDivision === 0) {
    return 0;
  }
  return Math.ceil((totalBeforeDivision - 1) / duration) + 1;
};

describe('Auction via Seaport', function () {
  const provider = ethers.provider;
  let zone;
  let marketplaceContract;
  let owner;
  let withBalanceChecks;
  let EIP1271WalletFactory;
  let mintAndApproveERC20;
  let getTestItem20;
  let getBalanceERC20;
  let mintAndApprove721;
  let getTestItem721;
  let createAuction;
  let checkExpectedEvents;

  after(async () => {
    await network.provider.request({
      method: 'hardhat_reset'
    });
  });

  before(async () => {
    owner = new ethers.Wallet(randomHex(32), provider);

    await Promise.all(
      [owner].map((wallet) => faucet(wallet.address, provider))
    );

    ({
      EIP1271WalletFactory,
      mintAndApproveERC20,
      getTestItem20,
      getBalanceERC20,
      mintAndApprove721,
      getTestItem721,
      marketplaceContract,
      createAuction,
      withBalanceChecks,
      checkExpectedEvents
    } = await seaportFixture(owner));
  });

  // Buy now or accept offer for a single ERC721 or ERC1155 in exchange for
  // ETH, WETH or ERC20
  describe('Basic Auction flows', async () => {
    let seller;
    let sellerContract;
    let buyerContract;
    let buyer;

    beforeEach(async () => {
      // Setup basic buyer/seller wallets with ETH
      seller = new ethers.Wallet(randomHex(32), provider);
      buyer = new ethers.Wallet(randomHex(32), provider);
      zone = new ethers.Wallet(randomHex(32), provider);

      sellerContract = await EIP1271WalletFactory.deploy(seller.address);
      buyerContract = await EIP1271WalletFactory.deploy(buyer.address);

      await Promise.all(
        [seller, buyer, zone, sellerContract, buyerContract].map((wallet) =>
          faucet(wallet.address, provider)
        )
      );
    });

    describe('Dutch descending Auction', async () => {
      it('ERC721 <=> ERC20 (standard by auction)', async () => {
        const startTime = await (
          await ethers.provider.getBlock('latest')
        ).timestamp;

        // Ends one week from the start date
        const endTime = BigNumber.from(startTime).add(604800);

        const nftId = await mintAndApprove721(
          seller,
          marketplaceContract.address
        );

        // Buyer mints ERC20
        const tokenAmount = BigNumber.from(1000);
        await mintAndApproveERC20(
          buyer,
          marketplaceContract.address,
          tokenAmount
        );
        const offer = [getTestItem721(nftId)];

        const consideration = [
          getTestItem20(
            BigNumber.from(950),
            BigNumber.from(475),
            seller.address
          ),
          getTestItem20(50, 25, zone.address)
        ];
        const { order, orderHash } = await createAuction(
          seller,
          zone,
          offer,
          consideration,
          0, // FULL_OPEN
          toBN(startTime),
          toBN(endTime)
        );
        await marketplaceContract
          .connect(seller)
          .validate([order]);
        const nextBlockTimestamp = BigNumber.from(startTime)
          .add(endTime)
          .div(2)
          .toNumber();
        await ethers.provider.send('evm_setNextBlockTimestamp', [
          nextBlockTimestamp
        ]);
        await ethers.provider.send('evm_mine', []);

        const expectedPrice = getCurrentAuctionPrice(1000, 500, startTime, endTime, nextBlockTimestamp);

        await withBalanceChecks([order], 0, null, async () => {
          const tx = marketplaceContract
            .connect(buyer)
            .fulfillOrder(order, toKey(false));
          const receipt = await (await tx).wait();
          await checkExpectedEvents(tx, receipt, [
            {
              order,
              orderHash,
              fulfiller: buyer.address,
              fulfillerConduitKey: toKey(false)
            }
          ]);
          return receipt;
        });

        const sellerBalance = await getBalanceERC20(seller);
        const commissionBalance = await getBalanceERC20(zone);
        await expect(sellerBalance.toNumber() + commissionBalance.toNumber()).equal(expectedPrice);
        const { isValidated, isCancelled, totalFilled, totalSize } =
          await marketplaceContract.getOrderStatus(orderHash);
        await expect(isCancelled).equal(false);
        await expect(isValidated).equal(true);
        await expect(totalFilled).equal(1);
        await expect(totalSize).equal(1);
      });

      it('expired auction case 1', async () => {
        const startTime = await (
          await ethers.provider.getBlock('latest')
        ).timestamp;

        // Ends one week from the start date
        const endTime = BigNumber.from(startTime).add(604800);

        const nftId = await mintAndApprove721(
          seller,
          marketplaceContract.address
        );

        // Buyer mints ERC20
        const tokenAmount = BigNumber.from(1000);
        await mintAndApproveERC20(
          buyer,
          marketplaceContract.address,
          tokenAmount
        );
        const offer = [getTestItem721(nftId)];

        const consideration = [
          getTestItem20(
            BigNumber.from(950),
            BigNumber.from(475),
            seller.address
          ),
          getTestItem20(50, 25, zone.address)
        ];
        const { order } = await createAuction(
          seller,
          zone,
          offer,
          consideration,
          0, // FULL_OPEN
          toBN(startTime),
          toBN(endTime)
        );
        await marketplaceContract
          .connect(seller)
          .validate([order]);

        const expiredTimestamp = BigNumber.from(startTime)
          .add(endTime)
          .toNumber();
        await ethers.provider.send('evm_setNextBlockTimestamp', [
          expiredTimestamp
        ]);
        await ethers.provider.send('evm_mine', []);

        await expect(marketplaceContract
          .connect(buyer)
          .fulfillOrder(order, toKey(false)))
          .to.be.revertedWith('reverted with custom error \'InvalidTime()\'');
      });
      it('expired auction case 2', async () => {
        const startTime = await (
          await ethers.provider.getBlock('latest')
        ).timestamp;

        // Ends one week from the start date
        const endTime = BigNumber.from(startTime).add(604800);

        const nftId = await mintAndApprove721(
          seller,
          marketplaceContract.address
        );

        // Buyer mints ERC20
        const tokenAmount = BigNumber.from(1000);
        await mintAndApproveERC20(
          buyer,
          marketplaceContract.address,
          tokenAmount
        );
        const offer = [getTestItem721(nftId)];

        const consideration = [
          getTestItem20(
            BigNumber.from(950),
            BigNumber.from(475),
            seller.address
          ),
          getTestItem20(50, 25, zone.address)
        ];
        const { order } = await createAuction(
          seller,
          zone,
          offer,
          consideration,
          0, // FULL_OPEN
          toBN(startTime),
          toBN(endTime)
        );

        const expiredTimestamp = BigNumber.from(startTime)
          .add(endTime)
          .toNumber();

        await ethers.provider.send('evm_setNextBlockTimestamp', [
          expiredTimestamp
        ]);
        await ethers.provider.send('evm_mine', []);
        await expect(marketplaceContract
          .connect(buyer)
          .fulfillOrder(order, toKey(false)))
          .to.be.revertedWith('reverted with custom error \'InvalidTime()\'');
      });
    });
  });
});
