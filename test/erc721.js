
const { ethers, network } = require('hardhat');
const { expect } = require('chai');

const testName = 'Test Token';
const testSymbol = 'TT';

describe('PeriFiNFT contract', function () {
  let owner, wallet1;
  let perifiNFT;
  after(async () => {
    await network.provider.request({
      method: 'hardhat_reset'
    });
  });
  before(async () => {
    [owner, wallet1] = await ethers.getSigners();
    const factory = await ethers.getContractFactory('ERC721Factory');
    const hardhatFactory = await factory.deploy();
    const tx = await hardhatFactory.deploy(testName, testSymbol);
    await tx.wait();
    const addr = await hardhatFactory.addressOf(0);
    const ERC721 = await ethers.getContractFactory('NendNFTs1');
    perifiNFT = await ERC721.attach(addr);
  });
  it('mint and check uri', async () => {
    const tokenUri = 'https://test.com/testitem';
    await expect(await perifiNFT.balanceOf(owner.address)).equal(0);
    await perifiNFT.connect(owner).safeMint(wallet1.address, tokenUri);
    await expect(await perifiNFT.balanceOf(wallet1.address)).equal(1);
    await expect(await perifiNFT.ownerOf(1)).equal(wallet1.address);
    await expect(await perifiNFT.tokenURI(1)).equal(tokenUri);
  });
});
