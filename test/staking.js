const { ethers, network } = require('hardhat');
const { expect } = require('chai');
const { BigNumber } = require('ethers');

describe('Staking', function () {
    let stakeTokenC;
    let rewardTokenC;
    let stakingC;
    let tokenCounter = 0;

    after(async () => {
        await network.provider.request({
            method: 'hardhat_reset'
        });
    });

    before(async () => {
        [owner, wallet1, wallet2] = await ethers.getSigners();        

        const testTokenF = await ethers.getContractFactory('TestERC20');
        stakeTokenC = await testTokenF.deploy();
        rewardTokenC = await testTokenF.deploy();

        const stakingF = await ethers.getContractFactory('Staking');
        stakingC = await stakingF.deploy(stakeTokenC.address, rewardTokenC.address);
    });
    describe("Deposit", function () {
        it("Should fail when staker balance is insufficient", async () => {
            const stakeAmount = 1000;
            await stakeTokenC.mint(wallet1.address, stakeAmount - 100);
            await expect(await stakeTokenC.balanceOf(wallet1.address)).to.eq(stakeAmount - 100);
            await stakeTokenC.connect(wallet1).approve(stakingC.address, stakeAmount);
            await expect(stakingC.connect(wallet1).deposit(stakeAmount, 0)).to.be.revertedWith("Can't stake more than you own");
        });

        it("Should fail when minimum deposit not met", async () => {
            let stakeAmount = 0;
            await expect(stakingC.connect(wallet1).deposit(stakeAmount, 0)).to.be.revertedWith("Amount smaller than minimimum deposit");

            const poolBalance = 100000;
            stakeTokenC.mint(stakingC.address, poolBalance);

            // Less than 0.01%
            stakeAmount = poolBalance / 10000 - 1;
            await stakeTokenC.mint(wallet1.address, stakeAmount);
            await stakeTokenC.connect(wallet1).approve(stakingC.address, stakeAmount);
            await expect(stakingC.connect(wallet1).deposit(stakeAmount, 0)).to.be.revertedWith("Amount smaller than minimimum deposit");
        });

        it("Should transfer stake tokens correctly", async () => {
            let stakeAmount = BigNumber.from(1000);
            await stakeTokenC.mint(wallet1.address, stakeAmount);

            const stakerBalanceBefore = await stakeTokenC.balanceOf(wallet1.address);
            const stakingBalanceBefore = await stakeTokenC.balanceOf(stakingC.address);

            await stakeTokenC.connect(wallet1).approve(stakingC.address, stakeAmount);
            await stakingC.connect(wallet1).deposit(stakeAmount, 0);

            await expect(await stakeTokenC.balanceOf(wallet1.address)).to.eq(stakerBalanceBefore.sub(stakeAmount));
            await expect(await stakeTokenC.balanceOf(stakingC.address)).to.eq(stakingBalanceBefore.add(stakeAmount));
        });

        it("Should emit staked event", async () => {
            const stakeAmount = BigNumber.from(1000);
            await stakeTokenC.mint(wallet1.address, stakeAmount);
            await stakeTokenC.connect(wallet1).approve(stakingC.address, stakeAmount);
            await expect(stakingC.connect(wallet1).deposit(stakeAmount, 0)).emit(stakingC, "Staked");
        });
    });

    describe("Escrow Verification Note", function () {
        it("Should fail when staker attempt to create escrow note too early", async () => {
            await _deposit(wallet1, 1000000);
            await fastFowardTime(60 * 60 * 24 * 4); // Fast forward 4 days

            const stakes = await stakingC.getStakes(wallet1.address);
            stakeId = stakes.length - 1;

            await expect(stakingC.connect(wallet1).createEscrow(stakeId)).to.be.revertedWith("Too soon to create escrow");
        });

        it("Should emit EscrowCreated event and mint escrow when escrow is created", async () => {
            await _deposit(wallet1, 1000000);

            await fastFowardTime(60 * 60 * 24 * 7); // Fast forward 1 week

            const stakes = await stakingC.getStakes(wallet1.address);
            stakeId = stakes.length - 1;
            
            await expect(stakingC.connect(wallet1).createEscrow(stakeId)).emit(stakingC, "EscrowCreated");
            await expect(await stakingC.ownerOf(++tokenCounter)).to.eq(wallet1.address);
        });

        it("Should fail when trying to exchange escrow too early", async () => {
            await _deposit(wallet1, 1000000);

            await fastFowardTime(60 * 60 * 24 * 7); // Fast forward 1 week

            const stakes = await stakingC.getStakes(wallet1.address);
            stakeId = stakes.length - 1;
            
            await stakingC.connect(wallet1).createEscrow(stakeId);
            
            await expect(stakingC.connect(wallet1).exchangeEscrow(++tokenCounter)).to.be.revertedWith("Too soon to exchange escrow");
        });

        it("Should emit EscrowExchanged event, burn escrow and transfer reward to staker when escrow is exchanged", async () => {
            await _deposit(wallet1, 1000000);

            await fastFowardTime(60 * 60 * 24 * 7); // Fast forward 1 week

            const stakes = await stakingC.getStakes(wallet1.address);
            stakeId = stakes.length - 1;
            
            await stakingC.connect(wallet1).createEscrow(stakeId);
            tokenCounter++;

            await fastFowardTime(60 * 60 * 24 * 7 * 30); // Fast forward 30 week

            const reward = (await stakingC.getEscrowInfo(tokenCounter)).amount;
            await rewardTokenC.mint(stakingC.address, reward);
            const stakerBalanceBefore = await rewardTokenC.balanceOf(wallet1.address);
            const stakingBalanceBefore = await rewardTokenC.balanceOf(stakingC.address);
            
            await expect(stakingC.connect(wallet1).exchangeEscrow(tokenCounter)).emit(stakingC, "EscrowExchanged");
            await expect(stakingC.ownerOf(tokenCounter)).to.be.revertedWith("ERC721: owner query for nonexistent token");
            await expect(await rewardTokenC.balanceOf(wallet1.address)).to.eq(stakerBalanceBefore.add(reward));
            await expect(await rewardTokenC.balanceOf(stakingC.address)).to.eq(stakingBalanceBefore.sub(reward));
        });
    });

    describe("Withdraw", function() {
        it("Should fail when attempting to withdraw within staking duration", async () => {
            await _deposit(wallet1, 1000000);
            
            const stakes = await stakingC.getStakes(wallet1.address);
            stakeId = stakes.length - 1;

            await expect(stakingC.connect(wallet1).withdraw(stakeId)).to.be.revertedWith("Too soon to withdraw");
        });

        it("Should emit Withdrawed and transfer deposit after successful withdrawal", async () => {
            await _deposit(wallet1, 1000000);

            await fastFowardTime(60 * 60 * 24 * 7); // Fast forward 1 week (stake duration)
            
            const stakes = await stakingC.getStakes(wallet1.address);
            stakeId = stakes.length - 1;

            const deposit = stakes[stakeId].deposited;
            const stakerBalanceBefore = await stakeTokenC.balanceOf(wallet1.address);
            const stakingBalanceBefore = await stakeTokenC.balanceOf(stakingC.address);

            await expect(stakingC.connect(wallet1).withdraw(stakeId)).emit(stakingC, "Withdrawed");
            await expect(await stakeTokenC.balanceOf(wallet1.address)).to.eq(stakerBalanceBefore.add(deposit));
            await expect(await stakeTokenC.balanceOf(stakingC.address)).to.eq(stakingBalanceBefore.sub(deposit));
        });

        it("Should mint escrow after successful withdrawal if there is unclaimed rewards", async () => {
            await _deposit(wallet1, 1000000);

            await fastFowardTime(60 * 60 * 24 * 7); // Fast forward 1 week (stake duration)
            
            const stakes = await stakingC.getStakes(wallet1.address);
            stakeId = stakes.length - 1;

            await expect(stakes[stakeId].unclaimedRewards.toNumber()).to.greaterThan(0);
            await stakingC.connect(wallet1).withdraw(stakeId);
            await expect(await stakingC.ownerOf(++tokenCounter)).to.eq(wallet1.address);
        });

        it("Should fail when attempting to withraw a stake twice", async () => {
            await _deposit(wallet1, 1000000);

            await fastFowardTime(60 * 60 * 24 * 7); // Fast forward 1 week (stake duration)
            
            const stakes = await stakingC.getStakes(wallet1.address);
            stakeId = stakes.length - 1;

            await stakingC.connect(wallet1).withdraw(stakeId);

            await expect(stakingC.connect(wallet1).withdraw(stakeId)).to.be.revertedWith("You have no deposit");
        });
    });

    async function _deposit(wallet, amount, duration=0) {
        await stakeTokenC.mint(wallet.address, amount);
        await stakeTokenC.connect(wallet1).approve(stakingC.address, amount);
        await stakingC.connect(wallet1).deposit(amount, duration);
    }

    async function fastFowardTime(seconds) {
        await network.provider.send("evm_increaseTime", [seconds]);
        await network.provider.send("evm_mine");
    }
});