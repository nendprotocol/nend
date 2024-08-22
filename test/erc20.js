const { ethers, network } = require('hardhat');
const { expect } = require('chai');

describe('NEND token contracts', function () {
  let owner, wallet1, wallet2;
  // let powercardC;
  let nendC;
  let bridgeC;
  after(async () => {
    await network.provider.request({
      method: 'hardhat_reset'
    });
  });
  before(async () => {
    [owner, wallet1, wallet2] = await ethers.getSigners();
    // const pcf = await ethers.getContractFactory('PowerCard');
    const ncsf = await ethers.getContractFactory('NENDCrowdSale');
    const bridgeF = await ethers.getContractFactory('NENDBridge');
    nendC = await ncsf.deploy(true);
    // powercardC = await pcf.deploy(nendC.address);
    bridgeC = await bridgeF.deploy(nendC.address, [0]);
  });
  describe('NEND Core', function () {
    it('main chain distribution', async () => {
      await expect(await nendC.ecosystemFund()).equal('25000000000000000000000000');
      await expect(await nendC.liquidity()).equal('10000000000000000000000000');
      await expect(await nendC.airdrop()).equal('5000000000000000000000000');
      await expect(await nendC.marketing()).equal('5000000000000000000000000');
      await expect(await nendC.team()).equal('10000000000000000000000000');
      await expect(await nendC.advisor()).equal('5000000000000000000000000');
      await expect(await nendC.sale()).equal('10000000000000000000000000');
    });
    it('bridged minting', async () => {
      await nendC.setBridge(bridgeC.address);
      await expect(nendC.connect(owner).mint(owner.address, 10)).to.be.reverted;
      await expect(bridgeC.connect(owner).leaveBridge(0, network.config.chainId, owner.address, 10, 1)).emit(bridgeC, 'LeaveBridge');
    });
    it('bridged minting (simulated)', async () => {
      await nendC.setBridge(owner.address);
      await nendC.connect(owner).mint(owner.address, 10);
    });
    it('bridged burning', async () => {
      await nendC.connect(owner).mint(owner.address, 10);
      await expect(await nendC.balanceOf(owner.address)).equal(30);
      await nendC.setBridge(bridgeC.address);
      await nendC.connect(owner).approve(bridgeC.address, 10);
      await expect(bridgeC.connect(owner)
        .enterBridge(0, 10))
        .emit(bridgeC, 'EnterBridge');
    });
  });
  describe('Airdrop', function () {
    it('create airdrop', async () => {
      await nendC.setBridge(owner.address);
      await nendC.connect(owner).mint(owner.address, 100);
      await expect(nendC.createAirdrop(wallet1.address, 10))
        .emit(nendC, 'AirdropCreated');
    });
    it('create airdrop batch', async () => {
      await nendC.setBridge(owner.address);
      await nendC.connect(owner).mint(owner.address, 100);
      await expect(nendC.createAirdropBatch([
        wallet1.address,
        wallet2.address
      ], 10))
        .emit(nendC, 'AirdropCreated');
    });
  });
  describe('CrowdSale', function () {
    it('buyNEND', async () => {
      await nendC.setBridge(owner.address);
      await nendC.connect(owner).mint(owner.address, 100);
      await expect(nendC.connect(owner).buyNEND()).to.be.reverted;
      await nendC.connect(owner).startSale();
      await expect(nendC.connect(wallet1).buyNEND({ value: 1 }))
        .emit(nendC, 'SaleCreated');
      await nendC.connect(owner).endSale();
      await expect(nendC.connect(owner).buyNEND()).to.be.reverted;
    });
  });
});
