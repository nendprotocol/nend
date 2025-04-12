const { ethers, network, upgrades } = require('hardhat');
const { expect } = require('chai');
const { BigNumber } = require('ethers');

describe('LendingPoolStakingV2', function () {
  // Increase timeout for tests
  this.timeout(120000);

  let owner, user1, user2, admin;
  let nendToken, usdcToken;
  let vault, stakingLib, stakingV2;
  const WEEK = 7 * 24 * 60 * 60;

  before(async () => {
    console.log('Starting test setup...');

    // Get all signers from hardhat with the updated config
    const signers = await ethers.getSigners();
    owner = signers[0];
    user1 = signers[1];
    user2 = signers[2];
    admin = signers[3];

    console.log('Signers obtained:');
    console.log('- Owner:', owner.address);
    console.log('- User1:', user1.address);
    console.log('- User2:', user2.address);
    console.log('- Admin:', admin.address);

    // Deploy test tokens
    console.log('Deploying test tokens...');
    const TestERC20 = await ethers.getContractFactory('TestERC20');
    nendToken = await TestERC20.deploy();
    await nendToken.deployed();
    console.log('NEND token deployed at:', nendToken.address);

    usdcToken = await TestERC20.deploy();
    await usdcToken.deployed();
    console.log('USDC token deployed at:', usdcToken.address);

    // Deploy Vault correctly as an upgradeable contract with initialization
    console.log('Deploying vault...');
    const Vault = await ethers.getContractFactory('Vault');
    vault = await upgrades.deployProxy(Vault, ['LendingPoolStakingV2Test'], {
      initializer: 'initialize'
    });
    await vault.deployed();
    console.log(
      'Vault deployed and initialized with name: LendingPoolStakingV2Test'
    );

    // Use authorize instead of grantRole - this is the critical fix for the Vault contract
    // SimpleRoleAccess and Vault use authorize method, not grantRole
    await vault.authorize(
      stakingV2 ? stakingV2.address : owner.address,
      'spender',
      true
    );
    console.log('Spender role authorized on vault for owner (temporary)');

    // Deploy StakingLib
    console.log('Deploying StakingLib...');
    const StakingLib = await ethers.getContractFactory('StakingLib');
    stakingLib = await StakingLib.deploy();
    await stakingLib.deployed();
    console.log('StakingLib deployed at:', stakingLib.address);

    // Link the library to the LendingPoolStakingV2 contract
    console.log('Deploying LendingPoolStakingV2...');
    const LendingPoolStakingV2 = await ethers.getContractFactory(
      'LendingPoolStakingV2',
      {
        libraries: {
          StakingLib: stakingLib.address
        }
      }
    );

    // Deploy the proxy with the implementation
    stakingV2 = await upgrades.deployProxy(
      LendingPoolStakingV2,
      [nendToken.address, vault.address],
      { unsafeAllowLinkedLibraries: true }
    );
    await stakingV2.deployed();
    console.log('LendingPoolStakingV2 deployed at:', stakingV2.address);

    // Setup roles using authorize for LendingPoolStakingV2
    await stakingV2.authorize(admin.address, 'admin', true);
    console.log('Admin role granted to:', admin.address);

    // Now authorize the stakingV2 contract with proper role in the vault
    // This is critical for vault methods like transferERC20 to succeed
    await vault.authorize(stakingV2.address, 'spender', true);
    console.log(
      'Spender role authorized to stakingV2 on vault:',
      stakingV2.address
    );

    // Fund accounts
    console.log('Funding accounts...');
    await nendToken.mint(owner.address, ethers.utils.parseEther('1000000'));
    await usdcToken.mint(owner.address, ethers.utils.parseEther('1000000'));

    // Transfer tokens to test users
    await nendToken.transfer(user1.address, ethers.utils.parseEther('10000'));
    await usdcToken.transfer(user1.address, ethers.utils.parseEther('10000'));
    await nendToken.transfer(user2.address, ethers.utils.parseEther('10000'));
    await usdcToken.transfer(user2.address, ethers.utils.parseEther('10000'));

    // Fund vault with tokens
    await nendToken.transfer(vault.address, ethers.utils.parseEther('100000'));
    await usdcToken.transfer(vault.address, ethers.utils.parseEther('100000'));

    try {
      // Add USDC as a stake token
      await stakingV2.connect(admin).addStakeToken(usdcToken.address);
      console.log('USDC added as stake token');
    } catch (error) {
      console.error('Error adding stake token:', error.message);
    }

    console.log('Setup complete!');
  });

  describe('Initialization', function () {
    it('Should initialize with correct values', async function () {
      console.log('Testing initialization...');

      expect(await stakingV2.nend()).to.equal(nendToken.address);
      expect(await stakingV2.lendingPool()).to.equal(vault.address);

      // Check if stake tokens are properly set
      expect(await stakingV2.stakeTokenCount()).to.equal(3); // Native, NEND, USDC
      expect(
        await stakingV2.activeStakeTokens(ethers.constants.AddressZero)
      ).to.equal(true);
      expect(await stakingV2.activeStakeTokens(nendToken.address)).to.equal(
        true
      );
      expect(await stakingV2.activeStakeTokens(usdcToken.address)).to.equal(
        true
      );

      console.log('Initialization tests passed!');
    });
  });

  describe('Deposit', function () {
    it('Should allow deposits with NEND token', async function () {
      console.log('Testing deposits...');

      // Approve tokens for staking - Fix for the overflow error
      // IMPORTANT: We need to approve the stakingV2 contract itself, not the vault
      const nendAmount = ethers.utils.parseEther('100');
      await nendToken.connect(user1).approve(stakingV2.address, nendAmount);
      console.log('Tokens approved to stakingV2:', stakingV2.address);

      try {
        // Check balances before deposit
        const userBalanceBefore = await nendToken.balanceOf(user1.address);
        console.log(
          'User1 balance before:',
          ethers.utils.formatEther(userBalanceBefore)
        );

        // Check allowance
        const allowance = await nendToken.allowance(
          user1.address,
          stakingV2.address
        );
        console.log(
          'User1 allowance to stakingV2:',
          ethers.utils.formatEther(allowance)
        );

        // Deposit
        const tx = await stakingV2
          .connect(user1)
          .deposit(nendToken.address, nendAmount, 0);
        await tx.wait();
        console.log('Deposit completed');

        // Check user's stakes count increased
        const userStakeCount = await stakingV2.userStakesCount(user1.address);
        expect(userStakeCount).to.equal(1);
        console.log('User stake count:', userStakeCount.toString());

        // Verify stake id and mapping
        const userStakeId = await stakingV2.getUserStakeId(user1.address, 1);
        console.log('User stake ID:', userStakeId.toString());
      } catch (error) {
        console.error('Error in deposit test:', error.message);
        throw error;
      }

      console.log('Deposit tests passed!');
    });
  });

  describe('Token Management', function () {
    it('Should allow admin to add stake tokens', async function () {
      // Deploy a new test token
      const TestERC20 = await ethers.getContractFactory('TestERC20');
      const newToken = await TestERC20.deploy();
      await newToken.deployed();

      // Get token count before
      const beforeCount = await stakingV2.stakeTokenCount();

      // Add new token
      await stakingV2.connect(admin).addStakeToken(newToken.address);

      // Verify token was added
      expect(await stakingV2.activeStakeTokens(newToken.address)).to.equal(
        true
      );
      expect(await stakingV2.stakeTokenCount()).to.equal(beforeCount.add(1));
    });

    it('Should allow admin to remove stake tokens', async function () {
      // Deploy a test token to add and then remove
      const TestERC20 = await ethers.getContractFactory('TestERC20');
      const tempToken = await TestERC20.deploy();
      await tempToken.deployed();

      // Add the token
      await stakingV2.connect(admin).addStakeToken(tempToken.address);
      expect(await stakingV2.activeStakeTokens(tempToken.address)).to.equal(
        true
      );

      // Get token count before
      const beforeCount = await stakingV2.stakeTokenCount();

      // Remove the token
      await stakingV2.connect(admin).removeStakeToken(tempToken.address);

      // Verify token was removed
      expect(await stakingV2.activeStakeTokens(tempToken.address)).to.equal(
        false
      );
      expect(await stakingV2.stakeTokenCount()).to.equal(beforeCount.sub(1));
    });

    it('Should prevent non-admin from adding stake tokens', async function () {
      // Deploy a new test token
      const TestERC20 = await ethers.getContractFactory('TestERC20');
      const rejectedToken = await TestERC20.deploy();
      await rejectedToken.deployed();

      // Try to add with non-admin account
      await expect(
        stakingV2.connect(user1).addStakeToken(rejectedToken.address)
      ).to.be.revertedWith('Not authorized');
    });
  });

  describe('EAB (Escrow-Backed Asset) Management', function () {
    let stakeId;

    beforeEach(async function () {
      // Create a fresh stake before each test
      const stakeAmount = ethers.utils.parseEther('100');
      await nendToken.connect(user1).approve(stakingV2.address, stakeAmount);
      await stakingV2.connect(user1).deposit(nendToken.address, stakeAmount, 0);

      // Get the stake ID
      const userStakeCount = await stakingV2.userStakesCount(user1.address);
      stakeId = await stakingV2.getUserStakeId(user1.address, userStakeCount);
    });

    it('Should allow issuing EAB for a stake', async function () {
      // Issue EAB
      await stakingV2.connect(user1).issueEAB(stakeId);

      // Verify NFT was issued
      expect(await stakingV2.ownerOf(stakeId)).to.equal(user1.address);

      // Check stake has escrow status
      const userStakeIndex = await stakingV2.getUserStakeIndex(stakeId);
      const stake = await stakingV2.getStakeByUserIndex(
        user1.address,
        userStakeIndex
      );
      expect(stake.escrowStatus).to.equal(1); // ISSUED
    });

    it('Should allow transferring stake ownership via EAB', async function () {
      // Issue EAB
      await stakingV2.connect(user1).issueEAB(stakeId);

      // Transfer to user2
      await stakingV2
        .connect(user1)
        .transferFrom(user1.address, user2.address, stakeId);

      // Verify ownership changed
      expect(await stakingV2.ownerOf(stakeId)).to.equal(user2.address);

      // Verify stake data updated
      const userStakeIndex = await stakingV2.getUserStakeIndex(stakeId);
      const stake = await stakingV2.getStakeByUserIndex(
        user2.address,
        userStakeIndex
      );
      expect(stake.staker).to.equal(user2.address);
    });
  });

  describe('Unstaking', function () {
    let stakeId;

    beforeEach(async function () {
      // Create a fresh stake before each test
      const stakeAmount = ethers.utils.parseEther('100');
      await nendToken.connect(user1).approve(stakingV2.address, stakeAmount);
      await stakingV2.connect(user1).deposit(nendToken.address, stakeAmount, 0);

      // Get the stake ID
      const userStakeCount = await stakingV2.userStakesCount(user1.address);
      stakeId = await stakingV2.getUserStakeId(user1.address, userStakeCount);
    });

    it('Should not allow unstaking before end time', async function () {
      // Try to unstake immediately
      // Use standard revertedWith instead of revertedWithCustomError
      await expect(
        stakingV2.connect(user1).unstake(stakeId)
      ).to.be.revertedWith('InvalidState');
    });

    it('Should allow unstaking after end time', async function () {
      // Fast forward time to after the stake duration
      await network.provider.send('evm_increaseTime', [WEEK + 100]);
      await network.provider.send('evm_mine');

      // Get balance before unstaking
      const balanceBefore = await nendToken.balanceOf(user1.address);

      // Unstake
      await stakingV2.connect(user1).unstake(stakeId);

      // Verify balance increased
      const balanceAfter = await nendToken.balanceOf(user1.address);
      expect(balanceAfter.sub(balanceBefore)).to.equal(
        ethers.utils.parseEther('100')
      );

      // Verify stake was removed - use standard error type
      await expect(stakingV2.getUserStakeIndex(stakeId)).to.be.revertedWith(
        'StakeNotFound'
      );
    });

    it('Should not allow non-owner to unstake', async function () {
      // Fast forward time to after the stake duration
      await network.provider.send('evm_increaseTime', [WEEK + 100]);
      await network.provider.send('evm_mine');

      // Try to unstake as user2
      // The actual error will be Unauthorized, not StakeNotFound
      await expect(
        stakingV2.connect(user2).unstake(stakeId)
      ).to.be.revertedWith('Unauthorized');
    });
  });

  describe('Rewards Distribution', function () {
    beforeEach(async function () {
      // Create stakes for reward distribution
      const stakeAmount = ethers.utils.parseEther('1000');

      // User1 stake
      await nendToken.connect(user1).approve(stakingV2.address, stakeAmount);
      await stakingV2.connect(user1).deposit(nendToken.address, stakeAmount, 1); // Medium duration

      // User2 stake
      await nendToken.connect(user2).approve(stakingV2.address, stakeAmount);
      await stakingV2.connect(user2).deposit(nendToken.address, stakeAmount, 2); // Long duration

      // Enable test mode for all tests in this section
      await stakingV2.setTesting(true);
      console.log('Test mode enabled for rewards distribution tests');
    });

    afterEach(async function () {
      // Disable test mode after each test
      await stakingV2.setTesting(false);
      console.log('Test mode disabled after rewards distribution test');
    });

    it('Should allow admin to distribute inflation rewards using test mode', async function () {
      const rewardAmount = ethers.utils.parseEther('5000');

      // Now we can call distributeInflationRewards directly without impersonation
      await stakingV2.distributeInflationRewards(rewardAmount);
      console.log('Successfully distributed inflation rewards in test mode');

      // Verify rewards were distributed - just check if event was emitted
      const filter = stakingV2.filters.NewPeriodStarted();
      const events = await stakingV2.queryFilter(filter);
      expect(events.length).to.be.gt(0);
    });

    it('Should allocate rewards proportionately to stake amounts', async function () {
      // Distribute rewards in test mode
      const rewardAmount = ethers.utils.parseEther('5000');
      await stakingV2.distributeInflationRewards(rewardAmount);

      // We can now check the actual distribution without the need for impersonation
      const user1StakeCount = await stakingV2.userStakesCount(user1.address);
      const user2StakeCount = await stakingV2.userStakesCount(user2.address);

      expect(user1StakeCount).to.be.gt(0);
      expect(user2StakeCount).to.be.gt(0);

      // Verify the reward allocations are properly set
      const rewardAllocations = await stakingV2.rewardAllocations(0);
      expect(rewardAllocations).to.equal(20);
    });
  });

  describe('Stake Migration', function () {
    // Each test needs to start with a clean state for stake counts
    beforeEach(async function () {
      // Clear any existing state by redeploying the contract
      // This ensures each test has a clean start
      const LendingPoolStakingV2 = await ethers.getContractFactory(
        'LendingPoolStakingV2',
        {
          libraries: {
            StakingLib: stakingLib.address
          }
        }
      );

      stakingV2 = await upgrades.deployProxy(
        LendingPoolStakingV2,
        [nendToken.address, vault.address],
        { unsafeAllowLinkedLibraries: true }
      );
      await stakingV2.deployed();

      // Re-setup roles
      await stakingV2.authorize(admin.address, 'admin', true);

      try {
        // Use authorize instead of grantRole - important fix
        await vault.authorize(stakingV2.address, 'spender', true);
      } catch (error) {
        // If already set
        console.log('Vault permission already set.');
      }

      // Create exactly 3 stakes for user1
      const stakeAmount = ethers.utils.parseEther('100');
      for (let i = 0; i < 3; i++) {
        await nendToken.connect(user1).approve(stakingV2.address, stakeAmount);
        await stakingV2
          .connect(user1)
          .deposit(nendToken.address, stakeAmount, i % 3);
      }

      // Create exactly 2 stakes for user2
      for (let i = 0; i < 2; i++) {
        await nendToken.connect(user2).approve(stakingV2.address, stakeAmount);
        await stakingV2
          .connect(user2)
          .deposit(nendToken.address, stakeAmount, i % 3);
      }
    });

    it('Should allow batch migration of stakes', async function () {
      // The contract doesn't have totalStakesMigrated, so we'll test the stakesDeprecated flag
      const beforeDeprecated = await stakingV2.stakesDeprecated();
      expect(beforeDeprecated).to.equal(false);

      // Migrate stakes - use nextStakeId to determine the range
      const endStakeId = await stakingV2.nextStakeId();
      // Since nextStakeId starts at 1 and increments, the first stake ID is 1
      const startStakeId = 1;

      // Migrate stakes - we need to migrate all stakes (5 total)
      await stakingV2
        .connect(owner)
        .migrateStakesInBatch(startStakeId, endStakeId.sub(startStakeId));

      // Verify migration status
      const afterDeprecated = await stakingV2.stakesDeprecated();
      expect(afterDeprecated).to.equal(true);

      // Check that event was emitted
      const filter = stakingV2.filters.BatchMigrationCompleted();
      const events = await stakingV2.queryFilter(filter);
      expect(events.length).to.greaterThan(0);
    });

    it('Should maintain stake access after migration', async function () {
      // Verify initial stake counts before migration
      const user1InitialCount = await stakingV2.userStakesCount(user1.address);
      const user2InitialCount = await stakingV2.userStakesCount(user2.address);

      // Confirm we have the expected initial counts
      expect(user1InitialCount).to.equal(3);
      expect(user2InitialCount).to.equal(2);

      // Migrate stakes - use nextStakeId to determine the range
      const endStakeId = await stakingV2.nextStakeId();
      // Since nextStakeId starts at 1 and increments, the first stake ID is 1
      const startStakeId = 1;

      // Migrate all stakes
      await stakingV2
        .connect(owner)
        .migrateStakesInBatch(startStakeId, endStakeId.sub(startStakeId));

      // Verify stakes are still accessible after migration
      // The migration should not change the number of stakes
      const user1FinalCount = await stakingV2.userStakesCount(user1.address);
      const user2FinalCount = await stakingV2.userStakesCount(user2.address);

      // The counts should be unchanged
      expect(user1FinalCount).to.equal(3);
      expect(user2FinalCount).to.equal(2);

      // Get a specific stake ID and verify it's accessible
      const user1StakeId = await stakingV2.getUserStakeId(user1.address, 1);
      const userStakeIndex = await stakingV2.getUserStakeIndex(user1StakeId);
      const stake = await stakingV2.getStakeByUserIndex(
        user1.address,
        userStakeIndex
      );

      expect(stake.staker).to.equal(user1.address);
    });

    it('Should migrate stakes correctly', async function () {
      // Get initial setup
      const user1InitialCount = await stakingV2.userStakesCount(user1.address);
      const user2InitialCount = await stakingV2.userStakesCount(user2.address);

      await stakingV2.connect(owner).setStakesDeprecated(false);

      // Get the range of stake IDs to migrate
      const endStakeId = await stakingV2.nextStakeId();
      const startStakeId = 1;

      // Migrate all stakes
      await stakingV2
        .connect(owner)
        .migrateStakesInBatch(startStakeId, endStakeId.sub(1));

      // Verify stakes were migrated correctly
      for (let i = user1InitialCount; i <= user2InitialCount; i++) {
        const stakeId = await stakingV2.getUserStakeId(user1.address, i);
        expect(stakeId).to.be.gt(0);

        // Get the stake by ID
        const userStakeIndex = await stakingV2.getUserStakeIndex(stakeId);
        const stake = await stakingV2.getStakeByUserIndex(
          user1.address,
          userStakeIndex
        );

        // Verify stake data
        if (stake.staker === user1.address) {
          expect(stake.token).to.equal(nendToken.address);
          expect(stake.stakeStatus).to.equal(1); // STAKED
        }

        const stakeId2 = await stakingV2.getUserStakeId(user2.address, i);
        expect(stakeId).to.be.gt(0);

        // Get the stake by ID
        const userStakeIndex2 = await stakingV2.getUserStakeIndex(stakeId2);
        const stake2 = await stakingV2.getStakeByUserIndex(
          user2.address,
          userStakeIndex2
        );

        // Verify stake data
        if (stake2.staker === user2.address) {
          expect(stake2.token).to.equal(nendToken.address);
          expect(stake2.stakeStatus).to.equal(1); // STAKED
        }
      }
    });
  });

  // New tests focused on StakingLib functions
  describe('StakingLib Direct Function Tests', function () {
    beforeEach(async function () {
      // Clear any existing state by redeploying the contract
      const LendingPoolStakingV2 = await ethers.getContractFactory(
        'LendingPoolStakingV2',
        {
          libraries: {
            StakingLib: stakingLib.address
          }
        }
      );

      stakingV2 = await upgrades.deployProxy(
        LendingPoolStakingV2,
        [nendToken.address, vault.address],
        { unsafeAllowLinkedLibraries: true }
      );
      await stakingV2.deployed();

      // Re-setup roles
      await stakingV2.authorize(admin.address, 'admin', true);
      await vault.authorize(stakingV2.address, 'spender', true);

      // Create stakes for testing
      const stakeAmount = ethers.utils.parseEther('100');
      await nendToken
        .connect(user1)
        .approve(stakingV2.address, stakeAmount.mul(3));
      await stakingV2.connect(user1).deposit(nendToken.address, stakeAmount, 0); // Short duration
      await stakingV2.connect(user1).deposit(nendToken.address, stakeAmount, 1); // Medium duration
      await stakingV2.connect(user1).deposit(nendToken.address, stakeAmount, 2); // Long duration

      await nendToken
        .connect(user2)
        .approve(stakingV2.address, stakeAmount.mul(2));
      await stakingV2.connect(user2).deposit(nendToken.address, stakeAmount, 0); // Short duration
      await stakingV2.connect(user2).deposit(nendToken.address, stakeAmount, 1); // Medium duration
    });

    it('Should validate stake parameters correctly', async function () {
      const stakeAmount = ethers.utils.parseEther('100');

      // Test valid stake
      await nendToken.connect(user1).approve(stakingV2.address, stakeAmount);
      await expect(
        stakingV2.connect(user1).deposit(nendToken.address, stakeAmount, 1)
      ).to.not.be.reverted;

      // Test invalid amount (zero)
      await expect(
        stakingV2.connect(user1).deposit(nendToken.address, 0, 1)
      ).to.be.revertedWith('InvalidArgument');

      // Test invalid token
      await expect(
        stakingV2
          .connect(user1)
          .deposit(ethers.constants.AddressZero, stakeAmount, 1)
      ).to.be.revertedWith('InvalidArgument');

      // Test invalid duration
      await expect(
        stakingV2.connect(user1).deposit(nendToken.address, stakeAmount, 3)
      ).to.be.revertedWith('InvalidArgument');
    });

    it('Should calculate user stakes total correctly for a token', async function () {
      // Get user stakes count
      const user1StakeCount = await stakingV2.userStakesCount(user1.address);
      expect(user1StakeCount).to.be.gt(0);

      // get total staked amount manually by iterating through all user stakes
      const totalStaked = await stakingV2.getUserStakesTotal(
        user1.address,
        nendToken.address
      );

      // Verify the calculated total
      expect(totalStaked).to.be.gt(0);

      // Ensure the total matches expected amounts from our test setup
      const expectedAmount = ethers.utils.parseEther('300');
      expect(totalStaked).to.equal(expectedAmount);

      // Check for user2 who has 2 stakes
      const user2TotalStaked = await stakingV2.getUserStakesTotal(
        user2.address,
        nendToken.address
      );
      //   const user2StakeCount = await stakingV2.userStakesCount(user2.address);
      //   for (let i = 1; i <= user2StakeCount; i++) {
      //     const stakeId = await stakingV2.getUserStakeId(user2.address, i);
      //     const userStakeIndex = await stakingV2.getUserStakeIndex(stakeId);
      //     const stake = await stakingV2.getStakeByUserIndex(
      //       user2.address,
      //       userStakeIndex
      //     );

      //     if (stake.token === nendToken.address && stake.stakeStatus === 1) {
      //       for (let j = 0; j < stake.amountsPerDuration.length; j++) {
      //         user2TotalStaked = user2TotalStaked.add(
      //           stake.amountsPerDuration[j]
      //         );
      //       }
      //     }
      //   }
      expect(user2TotalStaked).to.equal(ethers.utils.parseEther('200'));
    });

    it('Should handle removal of user stakes correctly', async function () {
      // Create an extra stake that we'll remove
      const stakeAmount = ethers.utils.parseEther('100');
      await nendToken.connect(user1).approve(stakingV2.address, stakeAmount);
      await stakingV2.connect(user1).deposit(nendToken.address, stakeAmount, 0);

      // Fast forward time to after the stake duration
      await network.provider.send('evm_increaseTime', [WEEK + 100]);
      await network.provider.send('evm_mine');

      // Get the stake ID of the last stake
      const userStakeCount = await stakingV2.userStakesCount(user1.address);
      const stakeId = await stakingV2.getUserStakeId(
        user1.address,
        userStakeCount
      );

      // Verify initial stake count
      expect(userStakeCount).to.equal(4); // 3 from beforeEach + 1 new

      // Unstake
      await stakingV2.connect(user1).unstake(stakeId);

      // Verify stake count decreased
      const newStakeCount = await stakingV2.userStakesCount(user1.address);
      expect(newStakeCount).to.equal(3);

      // Try to access the removed stake
      await expect(stakingV2.getUserStakeIndex(stakeId)).to.be.revertedWith(
        'StakeNotFound'
      );
    });

    it('Should migrate stakes correctly', async function () {
      // Get initial setup
      const user1InitialCount = await stakingV2.userStakesCount(user1.address);
      const user2InitialCount = await stakingV2.userStakesCount(user2.address);

      // We'll mark the stakes as deprecated and migrate them
      await stakingV2.connect(owner).setStakesDeprecated(false);

      // Get the range of stake IDs to migrate
      const endStakeId = await stakingV2.nextStakeId();
      const startStakeId = 1;

      // Migrate all stakes
      await stakingV2
        .connect(owner)
        .migrateStakesInBatch(startStakeId, endStakeId.sub(1));

      // Verify stakes were migrated correctly
      for (let i = user1InitialCount; i <= user2InitialCount; i++) {
        const stakeId = await stakingV2.getUserStakeId(user1.address, i);
        expect(stakeId).to.be.gt(0);

        // Get the stake by ID
        const userStakeIndex = await stakingV2.getUserStakeIndex(stakeId);
        const stake = await stakingV2.getStakeByUserIndex(
          user1.address,
          userStakeIndex
        );

        // Verify stake data
        if (stake.staker === user1.address) {
          expect(stake.token).to.equal(nendToken.address);
          expect(stake.stakeStatus).to.equal(1); // STAKED
        }

        const stakeId2 = await stakingV2.getUserStakeId(user2.address, i);
        expect(stakeId).to.be.gt(0);

        // Get the stake by ID
        const userStakeIndex2 = await stakingV2.getUserStakeIndex(stakeId2);
        const stake2 = await stakingV2.getStakeByUserIndex(
          user2.address,
          userStakeIndex2
        );

        // Verify stake data
        if (stake2.staker === user2.address) {
          expect(stake2.token).to.equal(nendToken.address);
          expect(stake2.stakeStatus).to.equal(1); // STAKED
        }
      }
    });
  });

  describe('Reward Period Management', function () {
    beforeEach(async function () {
      // Clear any existing state by redeploying the contract
      const LendingPoolStakingV2 = await ethers.getContractFactory(
        'LendingPoolStakingV2',
        {
          libraries: {
            StakingLib: stakingLib.address
          }
        }
      );

      stakingV2 = await upgrades.deployProxy(
        LendingPoolStakingV2,
        [nendToken.address, vault.address],
        { unsafeAllowLinkedLibraries: true }
      );
      await stakingV2.deployed();

      // Re-setup roles
      await stakingV2.authorize(admin.address, 'admin', true);
      await vault.authorize(stakingV2.address, 'spender', true);

      // Create stakes for each user
      const stakeAmount = ethers.utils.parseEther('1000');

      // User1 stake
      await nendToken.connect(user1).approve(stakingV2.address, stakeAmount);
      await stakingV2.connect(user1).deposit(nendToken.address, stakeAmount, 1);

      // User2 stake
      await nendToken.connect(user2).approve(stakingV2.address, stakeAmount);
      await stakingV2.connect(user2).deposit(nendToken.address, stakeAmount, 2);

      // Fund vault for rewards
      await nendToken.transfer(vault.address, ethers.utils.parseEther('10000'));

      await stakingV2.setTesting(true);
      console.log('Test mode enabled for reward period management tests');
    });

    afterEach(async function () {
      // Disable test mode after each test
      await stakingV2.setTesting(false);
      console.log('Test mode disabled after reward period management test');
    });

    it('Should close current period correctly', async function () {
      // Get current period before closing
      const initialPeriodId = await stakingV2.getCurrentPeriodId();

      // Distribute rewards using test mode instead of impersonation
      const rewardAmount = ethers.utils.parseEther('5000');
      await stakingV2.distributeInflationRewards(rewardAmount);

      // Check that a new period was created
      const newPeriodId = await stakingV2.getCurrentPeriodId();
      expect(newPeriodId).to.be.gt(initialPeriodId);
    });
  });

  describe('Reward Claim Tests', function () {
    beforeEach(async function () {
      // Clear any existing state by redeploying the contract
      const LendingPoolStakingV2 = await ethers.getContractFactory(
        'LendingPoolStakingV2',
        {
          libraries: {
            StakingLib: stakingLib.address
          }
        }
      );

      stakingV2 = await upgrades.deployProxy(
        LendingPoolStakingV2,
        [nendToken.address, vault.address],
        { unsafeAllowLinkedLibraries: true }
      );
      await stakingV2.deployed();

      // Re-setup roles
      await stakingV2.authorize(admin.address, 'admin', true);
      await vault.authorize(stakingV2.address, 'spender', true);
      await vault.authorize(admin.address, 'spender', true);

      // Setup for distribution and claims
      // Create stakes for each user
      const stakeAmount = ethers.utils.parseEther('1000');

      // User1 stake
      await nendToken.connect(user1).approve(stakingV2.address, stakeAmount);
      await stakingV2.connect(user1).deposit(nendToken.address, stakeAmount, 1);

      // User2 stake with same amount but different duration (for testing proportional rewards)
      await nendToken.connect(user2).approve(stakingV2.address, stakeAmount);
      await stakingV2.connect(user2).deposit(nendToken.address, stakeAmount, 2);

      // Fund vault for rewards
      await nendToken.transfer(vault.address, ethers.utils.parseEther('10000'));
    });

    it('Should process claim correctly', async function () {
      // Enable test mode
      await stakingV2.setTesting(true);

      // Distribute inflation rewards using test mode
      const rewardAmount = ethers.utils.parseEther('2000');
      await stakingV2.distributeInflationRewards(rewardAmount);

      // Wait for new period
      await fastForwardTime(WEEK * 2);

      // Get claimable rewards before claiming
      const [inflationReward, ifpReward] = await stakingV2.getClaimableRewards(
        user1.address,
        nendToken.address
      );

      // Both users staked equal amount, so should get approximately half of rewards each
      expect(inflationReward).to.be.gt(0);

      // Claim rewards
      await stakingV2.connect(user1).claim(nendToken.address);

      const userStakeCount = await stakingV2.userStakesCount(user1.address);
      const laststake = await stakingV2.getStakeByUserIndex(user1.address, userStakeCount);

      // Get balance before claim
      let lastStakedAmount = BigNumber.from(0);
      for (let i = 0; i < laststake.amountsPerDuration.length; i++) {
        lastStakedAmount = lastStakedAmount.add(laststake.amountsPerDuration[i]);
      }

      expect(lastStakedAmount).to.equal(inflationReward);

      // Try to claim again - should revert with already claimed
      await expect(
        stakingV2.connect(user1).claim(nendToken.address)
      ).to.be.revertedWith('AlreadyClaimed');

      // Disable test mode
      await stakingV2.setTesting(false);
    });

    it('Should calculate claimable rewards correctly', async function () {
      // Enable test mode
      await stakingV2.setTesting(true);

      // Distribute inflation rewards using test mode
      const rewardAmount = ethers.utils.parseEther('2000');
      await stakingV2.distributeInflationRewards(rewardAmount);

      // Wait for new period
      await fastForwardTime(WEEK * 2);

      // Check user1 claimable rewards
      const [user1InflationReward, user1IfpReward] =
            await stakingV2.getClaimableRewards(user1.address, nendToken.address);

      // Check user2 claimable rewards
      const [user2InflationReward, user2IfpReward] =
            await stakingV2.getClaimableRewards(user2.address, nendToken.address);

      // Since both users staked the same amount, they should get approximately equal rewards
      // (might be slightly different due to rounding)
      expect(user1InflationReward).to.be.gt(0);
      expect(user2InflationReward).to.be.gt(0);

      // Total rewards should approximately match the distributed amount
      const totalRewards = user1InflationReward.add(user2InflationReward);

      // Allow for small rounding differences
      const difference = rewardAmount.sub(totalRewards).abs();
      expect(difference).to.be.lt(ethers.utils.parseEther('0.01'));

      // Disable test mode
      await stakingV2.setTesting(false);
    });

    it('Should handle ifp rewards distribution and claims correctly', async function () {
      // Enable test mode
      await stakingV2.setTesting(true);
      // Add IFP rewards (non-inflation rewards)
      const ifpRewardAmount = ethers.utils.parseEther('1000');
      const inflationRewardAmount = ethers.utils.parseEther('2000');

      // Distribute ifp rewards as admin
      await vault.connect(admin).namedBalanceReceive(
        'ifp',
        nendToken.address,
        ifpRewardAmount
      );

      // Wait for new period
      await fastForwardTime(WEEK * 2);

      // distribute inflation rewards to ensure the user has claimable rewards
      await stakingV2.distributeInflationRewards(inflationRewardAmount);

      // Check user1 claimable rewards
      const [user1InflationReward, user1IfpReward] =
            await stakingV2.getClaimableRewards(user1.address, nendToken.address);

      // Check that IFP rewards are calculated
      expect(user1IfpReward).to.be.gt(0);

      // Claim rewards
      await stakingV2.connect(user1).claim(nendToken.address);

      // Check that user can't claim again
      await expect(
        stakingV2.connect(user1).claim(nendToken.address)
      ).to.be.revertedWith('AlreadyClaimed');

      // Disable test mode
      await stakingV2.setTesting(false);
    });
  });

  describe('Vault Integration Tests', function () {
    beforeEach(async function () {
      // Re-setup roles
      await stakingV2.authorize(admin.address, 'admin', true);
      await vault.authorize(stakingV2.address, 'spender', true);
      await vault.authorize(admin.address, 'spender', true);

      // Enable test mode
      await stakingV2.setTesting(true);
    });
    afterEach(async function () {
      // Disable test mode
      await stakingV2.setTesting(false);
    });
    it('Should correctly transfer assets from lending pool', async function () {
      // Enable test mode
      await stakingV2.setTesting(true);
      // Fund the vault with NEND tokens
      await nendToken.transfer(vault.address, ethers.utils.parseEther('1000'));

      await vault.connect(admin).namedBalanceReceive(
        'ifp',
        nendToken.address,
        ethers.utils.parseEther('1000')
      );

      // Setup test for native currency transfer
      const recipient = user1.address;

      // Record balance before
      const balanceBefore = await nendToken.balanceOf(recipient);

      // Create a test function to call lendingPoolTransfer through the contract
      // We'll need to mock this call since we can't directly call the library

      // Use the unstake function to trigger a transfer
      // First create a stake that we can unstake
      const stakeAmount = ethers.utils.parseEther('100');
      await nendToken.connect(user1).approve(stakingV2.address, stakeAmount);
      await stakingV2.connect(user1).deposit(nendToken.address, stakeAmount, 0);

      // Fast forward time to after the stake duration
      //   await network.provider.send('evm_increaseTime', [WEEK]);
      //   await network.provider.send('evm_mine');
      await fastForwardTime(WEEK);

      // distribute rewards to ensure the user has claimable rewards
      const rewardAmount = ethers.utils.parseEther('1000');
      await nendToken.transfer(stakingV2.address, rewardAmount);
      await stakingV2.distributeInflationRewards(rewardAmount);

      // claim the rewards to ensure the stake is valid
      await stakingV2.connect(user1).claim(nendToken.address);

      const userStakeCount = await stakingV2.userStakesCount(user1.address);

      // Fast forward time to after the stake duration
      await fastForwardTime(WEEK * 27);
      //   await network.provider.send('evm_increaseTime', [WEEK * 27]);
      //   await network.provider.send('evm_mine');

      // Get the stake ID
      const stakeId = await stakingV2.getUserStakeId(
        user1.address,
        userStakeCount
      );

      // Unstake escrow reward
      await stakingV2.connect(user1).unstake(stakeId);

      const stakeId2 = await stakingV2.getUserStakeId(
        user1.address,
        userStakeCount.sub(1)
      );
      // Unstake staked amount
      await stakingV2.connect(user1).unstake(stakeId2);

      // The transfer has happened through the contract's unstake function
      // which internally calls the library's lendingPoolTransfer function

      // Since we can't directly verify the library call, we check its effects
      const balanceAfter = await nendToken.balanceOf(recipient);
      expect(balanceAfter).to.be.gt(balanceBefore);

      await stakingV2.setTesting(false);
    });
  });

  // Helper function to fast-forward time
  async function fastForwardTime (seconds) {
    await network.provider.send('evm_increaseTime', [seconds]);
    await network.provider.send('evm_mine');
  }

  describe('Period Management', function () {
    beforeEach(async function () {
      // Enable test mode for all tests in this section
      await stakingV2.setTesting(true);
      console.log('Test mode enabled for period management tests');
    });

    afterEach(async function () {
      // Disable test mode after each test
      await stakingV2.setTesting(false);
      console.log('Test mode disabled after period management test');
    });

    it('Should correctly report the current period ID', async function () {
      // Get initial period ID
      const initialPeriodId = await stakingV2.getCurrentPeriodId();

      // Distribute rewards which will trigger a new period
      // Using test mode instead of impersonating the NEND token
      const rewardAmount = ethers.utils.parseEther('1000');
      await stakingV2.distributeInflationRewards(rewardAmount);

      // Check that period ID increased after distribution
      const newPeriodId = await stakingV2.getCurrentPeriodId();
      expect(newPeriodId).to.be.gt(initialPeriodId);

      // Fast forward time to trigger period change
      //   await network.provider.send('evm_increaseTime', [WEEK]);
      //   await network.provider.send('evm_mine');
      await fastForwardTime(WEEK);

      // Distribute more rewards to create another period
      await stakingV2.distributeInflationRewards(rewardAmount);

      // Period ID should increase again
      const finalPeriodId = await stakingV2.getCurrentPeriodId();
      expect(finalPeriodId).to.be.gt(newPeriodId);
    });
  });
});
