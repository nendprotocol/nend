const { expect } = require('chai');
const { assert } = require('console');
const { providers, BigNumber } = require('ethers');
const { ethers, waffle } = require('hardhat');

describe('Vault contract', function () {
  const testName = 'Test Token';
  const testSymbol = 'TT';
  let owner, sender, operator, recipient;
  let vaultContract;

  let nendC;

  let perifiNFT;

  before(async () => {
    [owner, sender, operator, recipient] = await ethers.getSigners();

    const factory = await ethers.getContractFactory('Vault');
    vaultContract = await factory.deploy('test vault');

    // mint ERC20 to lender
    const ncsf = await ethers.getContractFactory('NEND');
    const chainId = (await ethers.getDefaultProvider().getNetwork()).chainId;

    nendC = await ncsf.deploy(true, [4, chainId, 31337]);
    await nendC.connect(owner).mint(sender.address, 100);

    // mint ERC721 to borrower
    const e721F = await ethers.getContractFactory('ERC721Factory');
    const hardhatFactory = await e721F.deploy();
    const tx = await hardhatFactory.deploy(testName, testSymbol);
    await tx.wait();
    const addr = await hardhatFactory.addressOf(0);
    const ERC721 = await ethers.getContractFactory('PeriFiNFT');
    perifiNFT = await ERC721.attach(addr);

    const tokenUri = 'https://test.com/testitem';
    await perifiNFT.connect(owner).safeMint(sender.address, tokenUri);
  });
  describe('ETH transfer', function () {
    it('recieve and send by owner', async () => {
      const provider = waffle.provider;
      const originalBalance = await provider.getBalance(recipient.address);
      // Ether amount to send
      const amountInEther = '0.01';
      // Create a transaction object
      const tx = {
        to: vaultContract.address,
        // Convert currency unit from ether to wei
        value: ethers.utils.parseEther(amountInEther)
      };
      await sender.sendTransaction(tx);
      await expect(await provider.getBalance(vaultContract.address)).to.equal(BigNumber.from('10000000000000000'));
      await vaultContract.connect(owner).transferNative(recipient.address, '10000000000000000');
      await expect(await provider.getBalance(vaultContract.address)).to.equal(BigNumber.from(0));
      const finalBalance = await provider.getBalance(recipient.address);
      await expect(finalBalance.sub(originalBalance)).to.equal(BigNumber.from('10000000000000000'));
    });
  });
  describe('ERC20 transfer', function () {
    it('recieve and send by owner', async () => {
      const vaultAddr = vaultContract.address;
      const tx = await nendC.connect(sender).transfer(vaultAddr, 20);
      await tx.wait();

      await expect(await nendC.balanceOf(vaultAddr)).to.equal(20);
      await expect(await nendC.balanceOf(sender.address)).to.equal(80);

      await vaultContract.connect(owner).transferERC20(
        nendC.address,
        recipient.address,
        10
      );
      await expect(await nendC.balanceOf(vaultAddr)).to.equal(10);
      await expect(await nendC.balanceOf(recipient.address)).to.equal(10);
    });
    it('recieve, approve and send by operator', async () => {
      try {
        const vaultAddr = vaultContract.address;
        await vaultContract.connect(owner).approveERC20Transfer(
          nendC.address,
          operator.address,
          10
        );
        await nendC.connect(operator).transferFrom(
          vaultAddr,
          recipient.address,
          10
        );
        await expect(await nendC.balanceOf(vaultAddr)).to.equal(0);
        await expect(await nendC.balanceOf(recipient.address)).to.equal(20);
      } catch (e) {
        console.log(e);
      }
    });
  });
  describe('ERC721 transfer', function () {
    it('recieve and send by owner', async () => {
      const vaultAddr = vaultContract.address;
      const tx = await perifiNFT.connect(sender).transferFrom(sender.address, vaultAddr, 1);
      await tx.wait();

      await expect(await perifiNFT.ownerOf(1)).to.equal(vaultAddr);

      await vaultContract.connect(owner).transferERC721(
        perifiNFT.address,
        recipient.address,
        1
      );
      await perifiNFT.connect(recipient).transferFrom(recipient.address, sender.address, 1);
    });
    it('recieve, approve and send by operator', async () => {
      try {
        const vaultAddr = vaultContract.address;
        try {
          const tx = await perifiNFT.connect(sender).transferFrom(sender.address, vaultAddr, 1);
          await tx.wait();
          await expect(await perifiNFT.ownerOf(1)).to.equal(vaultAddr);
        } catch (e) {
          console.log(1);
          throw e;
        }
        try {
          await vaultContract.connect(owner).setERC721ApprovalForAll(
            perifiNFT.address,
            operator.address,
            true
          );
          await perifiNFT.connect(operator).transferFrom(vaultAddr, recipient.address, 1);
          await expect(await perifiNFT.ownerOf(1)).to.equal(recipient.address);
        } catch (e) {
          console.log(2);
          throw e;
        }
      } catch (e) {
        console.log(e);
        throw e;
      }
    });
  });
});
