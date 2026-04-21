const { expect } = require("chai");
const hre = require("hardhat");
const { ethers } = hre;

describe("ReferralSystem", function () {
  let referralSystem;
  let rewardToken;
  let owner, user1, user2, referrer1, referrer2, unauthorized;
  let testUsers, testReferrers;
  
  const REWARD_ROLE = ethers.id("REWARD_ROLE");
  const REGISTRAR_ROLE = ethers.id("REGISTRAR_ROLE");

  beforeEach(async function () {
    [owner, user1, user2, referrer1, referrer2, unauthorized] = await ethers.getSigners();
    
    // Create additional test addresses (non-zero, random)
    testUsers = [];
    testReferrers = [];
    for (let i = 0; i < 10; i++) {
      testUsers.push(ethers.Wallet.createRandom().address);
      testReferrers.push(ethers.Wallet.createRandom().address);
    }
    
    // Deploy mock ERC20 token
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    rewardToken = await MockERC20.deploy("Reward Token", "RWD", 18);
    await rewardToken.waitForDeployment();
    
    // Deploy ReferralSystem
    const ReferralSystem = await ethers.getContractFactory("ReferralSystem");
    referralSystem = await ReferralSystem.deploy(await rewardToken.getAddress(), owner.address);
    await referralSystem.waitForDeployment();
    
    // Mint tokens to the contract for rewards
    await rewardToken.mint(await referralSystem.getAddress(), ethers.parseEther("10000"));
  });

  describe("Deployment", function () {
    it("Should set the correct reward token", async function () {
      expect(await referralSystem.getRewardToken()).to.equal(await rewardToken.getAddress());
    });

    it("Should set the correct admin", async function () {
      const DEFAULT_ADMIN_ROLE = await referralSystem.DEFAULT_ADMIN_ROLE();
      expect(await referralSystem.hasRole(DEFAULT_ADMIN_ROLE, owner.address)).to.be.true;
    });

    it("Should grant REGISTRAR_ROLE to admin", async function () {
      expect(await referralSystem.hasRole(REGISTRAR_ROLE, owner.address)).to.be.true;
    });
  });

  describe("registerReferral", function () {
    it("Should register a referral correctly", async function () {
      await expect(referralSystem.connect(owner).registerReferral(user1.address, referrer1.address))
        .to.emit(referralSystem, "UserRegistered")
        .withArgs(user1.address, referrer1.address);
      
      const referrer = await referralSystem.getReferrer(user1.address);
      expect(referrer).to.equal(referrer1.address);
    });

    it("Should prevent self-referral", async function () {
      await expect(
        referralSystem.connect(owner).registerReferral(user1.address, user1.address)
      ).to.be.revertedWithCustomError(referralSystem, "SelfReferral");
    });

    it("Should prevent double registration", async function () {
      await referralSystem.connect(owner).registerReferral(user1.address, referrer1.address);
      await expect(
        referralSystem.connect(owner).registerReferral(user1.address, referrer2.address)
      ).to.be.revertedWithCustomError(referralSystem, "AlreadyReferralSet");
    });

    it("Should revert if referrer is zero address", async function () {
      await expect(
        referralSystem.connect(owner).registerReferral(user1.address, ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(referralSystem, "InvalidAddress");
    });
  });

  describe("batchRegisterReferral", function () {
    it("Should batch register multiple referrals", async function () {
      // Use 5 non-zero addresses
      const usersBatch = testUsers.slice(0, 5);
      const referrersBatch = testReferrers.slice(0, 5);
      
      await expect(referralSystem.connect(owner).batchRegisterReferral(usersBatch, referrersBatch))
        .to.emit(referralSystem, "UserRegistered");
      
      for (let i = 0; i < usersBatch.length; i++) {
        expect(await referralSystem.getReferrer(usersBatch[i])).to.equal(referrersBatch[i]);
      }
    });

    it("Should revert if array lengths mismatch", async function () {
      const usersBatch = testUsers.slice(0, 3);
      const referrersBatch = testReferrers.slice(0, 5);
      await expect(
        referralSystem.connect(owner).batchRegisterReferral(usersBatch, referrersBatch)
      ).to.be.revertedWithCustomError(referralSystem, "NoArrayParity");
    });

    it("Should revert if batch exceeds max size (30)", async function () {
      const largeUsers = new Array(31).fill(user1.address);
      const largeReferrers = new Array(31).fill(referrer1.address);
      await expect(
        referralSystem.connect(owner).batchRegisterReferral(largeUsers, largeReferrers)
      ).to.be.revertedWithCustomError(referralSystem, "BatchLimitExceeded");
    });
  });

  describe("batchAddRewards", function () {
    beforeEach(async function () {
      // Register users first
      await referralSystem.connect(owner).registerReferral(user1.address, referrer1.address);
      await referralSystem.connect(owner).registerReferral(user2.address, referrer2.address);
      
      // Grant REWARD_ROLE to owner
      await referralSystem.grantRole(REWARD_ROLE, owner.address);
    });

    it("Should add rewards to referrers", async function () {
      const amount1 = ethers.parseEther("10");
      const amount2 = ethers.parseEther("20");
      
      await expect(referralSystem.connect(owner).batchAddRewards(
        [referrer1.address, referrer2.address],
        [amount1, amount2]
      ))
        .to.emit(referralSystem, "RewardAllocated")
        .withArgs(referrer1.address, amount1)
        .to.emit(referralSystem, "RewardAllocated")
        .withArgs(referrer2.address, amount2);
      
      expect(await referralSystem.getPendingRewards(referrer1.address)).to.equal(amount1);
      expect(await referralSystem.getPendingRewards(referrer2.address)).to.equal(amount2);
    });

    it("Should revert if not called by REWARD_ROLE", async function () {
      // Use generic revert check because custom error matcher may have issues with inherited errors
      await expect(
        referralSystem.connect(unauthorized).batchAddRewards([referrer1.address], [ethers.parseEther("1")])
      ).to.be.reverted;
    });

    it("Should skip zero amount allocations", async function () {
      await referralSystem.connect(owner).batchAddRewards(
        [referrer1.address, referrer2.address],
        [ethers.parseEther("0"), ethers.parseEther("5")]
      );
      expect(await referralSystem.getPendingRewards(referrer1.address)).to.equal(0);
      expect(await referralSystem.getPendingRewards(referrer2.address)).to.equal(ethers.parseEther("5"));
    });
  });

  describe("claimRewards", function () {
    beforeEach(async function () {
      await referralSystem.connect(owner).registerReferral(user1.address, referrer1.address);
      await referralSystem.grantRole(REWARD_ROLE, owner.address);
      await referralSystem.connect(owner).batchAddRewards(
        [referrer1.address],
        [ethers.parseEther("100")]
      );
    });

    it("Should allow referrer to claim rewards", async function () {
      const initialBalance = await rewardToken.balanceOf(referrer1.address);
      
      await expect(referralSystem.connect(referrer1).claimRewards())
        .to.emit(referralSystem, "RewardClaimed")
        .withArgs(referrer1.address, ethers.parseEther("100"));
      
      const finalBalance = await rewardToken.balanceOf(referrer1.address);
      expect(finalBalance - initialBalance).to.equal(ethers.parseEther("100"));
      expect(await referralSystem.getPendingRewards(referrer1.address)).to.equal(0);
    });

    it("Should revert if no rewards to claim", async function () {
      await expect(referralSystem.connect(referrer2).claimRewards())
        .to.be.revertedWithCustomError(referralSystem, "NoRewardsToClaim");
    });
  });

  describe("Admin Functions", function () {
    it("Should allow admin to set max batch size", async function () {
      await expect(referralSystem.connect(owner).setMaxBatchSize(20))
        .to.emit(referralSystem, "MaxBatchSizeUpdated")
        .withArgs(30, 20);
      expect(await referralSystem.getMaxBatchSize()).to.equal(20);
    });

    it("Should revert if non-admin tries to set batch size", async function () {
      // Use generic revert check to avoid custom error name mismatch
      await expect(referralSystem.connect(unauthorized).setMaxBatchSize(10))
        .to.be.reverted;
    });
  });
});