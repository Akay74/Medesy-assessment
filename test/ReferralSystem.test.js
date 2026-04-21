const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ReferralSystem", function () {
  let referralSystem;
  let owner, user1, user2, referrer1, referrer2;
  
  const REWARD_ROLE = ethers.id("REWARD_ROLE");

  beforeEach(async function () {
    [owner, user1, user2, referrer1, referrer2] = await ethers.getSigners();
    
    // Deploy a mock ERC20 token for testing
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const mockToken = await MockERC20.deploy("Test Token", "TEST", 18);
    await mockToken.waitForDeployment();
    
    const ReferralSystem = await ethers.getContractFactory("ReferralSystem");
    referralSystem = await ReferralSystem.deploy(await mockToken.getAddress(), owner.address);
    await referralSystem.waitForDeployment();
  });

  it("Should register a referral correctly", async function () {
    await referralSystem.connect(owner).registerReferral(user1.address, referrer1.address);
    const referrer = await referralSystem.getReferrer(user1.address);
    expect(referrer).to.equal(referrer1.address);
  });

  it("Should prevent self-referral", async function () {
    await expect(
      referralSystem.connect(owner).registerReferral(user1.address, user1.address)
    ).to.be.revertedWithCustomError(referralSystem, "SelfReferral");
  });

  it("Should batch add rewards and claim", async function () {
    await referralSystem.connect(owner).registerReferral(user1.address, referrer1.address);
    await referralSystem.connect(owner).registerReferral(user2.address, referrer2.address);
    
    // Grant REWARD_ROLE to owner for testing
    await referralSystem.grantRole(REWARD_ROLE, owner.address);
    
    await referralSystem.batchAddRewards(
      [referrer1.address, referrer2.address],
      [ethers.parseEther("10"), ethers.parseEther("20")]
    );
    
    expect(await referralSystem.getPendingRewards(referrer1.address)).to.equal(ethers.parseEther("10"));
    expect(await referralSystem.getPendingRewards(referrer2.address)).to.equal(ethers.parseEther("20"));
  });
});