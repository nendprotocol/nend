const { ethers, network } = require('hardhat');
const { expect } = require('chai');

const testName = 'Test Token';
const testSymbol = 'TT';

describe('ERC721Factory contract', function () {
  let owner;
  after(async () => {
    await network.provider.request({
      method: 'hardhat_reset'
    });
  });
  before(async () => {
    [owner] = await ethers.getSigners();
  });

  it('Deployed ERC721 should should have given name and symbol', async function () {
    const factory = await ethers.getContractFactory('ERC721Factory');
    const hardhatFactory = await factory.deploy();
    await expect(await hardhatFactory.addressOf(0)).equal('0x0000000000000000000000000000000000000000');
    await expect(await hardhatFactory.totalOf()).equal(0);
    const tx = await hardhatFactory.deploy(testName, testSymbol);
    await tx.wait();
    const addr = await hardhatFactory.addressOf(0);
    const ERC721 = await ethers.getContractFactory('PeriFiNFT');
    const erc721 = await ERC721.attach(addr);
    const actualName = await erc721.name();
    const actualSymbol = await erc721.symbol();
    await expect(actualName).equal(actualName);
    await expect(actualSymbol).equal(actualSymbol);
    await expect(await hardhatFactory.totalOf()).equal(1);
  });

  it('ERC721 deployment should emit the deployment event', async function () {
    // const [owner] = await ethers.getSigners();

    const factory = await ethers.getContractFactory('ERC721Factory');

    const hardhatFactory = await factory.deploy();

    await expect(await hardhatFactory.deploy('Test Token', 'TT'))
      .to.emit(hardhatFactory, 'ERC721Deployed');
  });

  it('Deployed ERC721 contract should have message sender as owner', async function () {
    const factory = await ethers.getContractFactory('ERC721Factory');
    const hardhatFactory = await factory.deploy();

    const tx = await hardhatFactory.deploy(testName, testSymbol);
    await tx.wait();

    const addr = await hardhatFactory.addressOf(0);

    const ERC721 = await ethers.getContractFactory('PeriFiNFT');

    const erc721 = await ERC721.attach(addr);
    const actualName = await erc721.name();
    const actualSymbol = await erc721.symbol();
    await expect(actualName).equal(actualName);
    await expect(actualSymbol).equal(actualSymbol);
    const actualOwner = await erc721.owner();
    await expect(actualOwner).equal(owner.address);
  });
});
