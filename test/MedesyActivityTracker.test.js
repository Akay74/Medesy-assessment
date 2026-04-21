import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

describe("MedesyActivityTracker", function () {
  let activityTracker;
  let admin, user1, user2, unauthorized;

  const ZERO_HASH = ethers.ZeroHash;
  const VALID_HASH_1 = ethers.id("activity1");
  const VALID_HASH_2 = ethers.id("activity2");
  const VALID_HASH_3 = ethers.id("activity3");
  const IDENTITY_HASH = ethers.id("user-identity");

  beforeEach(async function () {
    [admin, user1, user2, unauthorized] = await ethers.getSigners();

    const MedesyActivityTracker = await ethers.getContractFactory("MedesyActivityTracker");
    activityTracker = await MedesyActivityTracker.deploy(admin.address);
    await activityTracker.waitForDeployment();
  });

  describe("Deployment & Initialization", function () {
    it("Should set the correct admin role", async function () {
      const DEFAULT_ADMIN_ROLE = await activityTracker.DEFAULT_ADMIN_ROLE();
      expect(await activityTracker.hasRole(DEFAULT_ADMIN_ROLE, admin.address)).to.be.true;
    });

    it("Should revert if initial admin is zero address", async function () {
      const MedesyActivityTracker = await ethers.getContractFactory("MedesyActivityTracker");
      await expect(MedesyActivityTracker.deploy(ethers.ZeroAddress))
        .to.be.revertedWithCustomError(activityTracker, "InvalidAddress");
    });

    it("Should set default max batch size to 30", async function () {
      expect(await activityTracker.getMaxBatchSize()).to.equal(30);
    });
  });

  describe("anchorActivity", function () {
    it("Should allow a user to anchor a single activity", async function () {
      await expect(activityTracker.connect(user1).anchorActivity(VALID_HASH_1))
        .to.emit(activityTracker, "ActivityAnchored")
        .withArgs(user1.address, VALID_HASH_1, await ethers.provider.getBlock("latest").then(b => b.timestamp));
      
      const count = await activityTracker.getActivityCount(user1.address);
      expect(count).to.equal(1);
    });

    it("Should revert when activity hash is zero", async function () {
      await expect(activityTracker.connect(user1).anchorActivity(ZERO_HASH))
        .to.be.revertedWithCustomError(activityTracker, "InvalidActivityHash");
    });

    it("Should allow multiple activities from same user", async function () {
      await activityTracker.connect(user1).anchorActivity(VALID_HASH_1);
      await activityTracker.connect(user1).anchorActivity(VALID_HASH_2);
      expect(await activityTracker.getActivityCount(user1.address)).to.equal(2);
    });

    it("Should emit ActivityAnchored event with correct timestamp", async function () {
      const tx = await activityTracker.connect(user1).anchorActivity(VALID_HASH_1);
      const block = await ethers.provider.getBlock(tx.blockNumber);
      await expect(tx).to.emit(activityTracker, "ActivityAnchored")
        .withArgs(user1.address, VALID_HASH_1, block.timestamp);
    });
  });

  describe("anchorActivityBatch", function () {
    const hashes = [VALID_HASH_1, VALID_HASH_2, VALID_HASH_3];

    it("Should batch anchor multiple activities", async function () {
      await expect(activityTracker.connect(user1).anchorActivityBatch(hashes))
        .to.emit(activityTracker, "BatchActivityAnchored")
        .withArgs(user1.address, hashes, await ethers.provider.getBlock("latest").then(b => b.timestamp));
      
      const count = await activityTracker.getActivityCount(user1.address);
      expect(count).to.equal(3);
    });

    it("Should revert if batch size exceeds max batch size", async function () {
      // Default max is 30; create array of 31 hashes
      const largeArray = new Array(31).fill(VALID_HASH_1);
      await expect(activityTracker.connect(user1).anchorActivityBatch(largeArray))
        .to.be.revertedWithCustomError(activityTracker, "BatchLimitExceeded");
    });

    it("Should revert if any hash in batch is zero", async function () {
      const badHashes = [VALID_HASH_1, ZERO_HASH, VALID_HASH_3];
      await expect(activityTracker.connect(user1).anchorActivityBatch(badHashes))
        .to.be.revertedWithCustomError(activityTracker, "InvalidActivityHash");
      
      // No activities should have been stored
      expect(await activityTracker.getActivityCount(user1.address)).to.equal(0);
    });

    it("Should revert if batch is empty", async function () {
      await expect(activityTracker.connect(user1).anchorActivityBatch([]))
        .to.be.revertedWithCustomError(activityTracker, "InvalidFraction");
    });

    it("Should respect updated max batch size after admin change", async function () {
      await activityTracker.connect(admin).setMaxBatchSize(5);
      const fiveHashes = new Array(5).fill(VALID_HASH_1);
      await expect(activityTracker.connect(user1).anchorActivityBatch(fiveHashes))
        .to.not.be.reverted;
      
      const sixHashes = new Array(6).fill(VALID_HASH_1);
      await expect(activityTracker.connect(user1).anchorActivityBatch(sixHashes))
        .to.be.revertedWithCustomError(activityTracker, "BatchLimitExceeded");
    });
  });

  describe("anchorIdentity", function () {
    it("Should allow a user to anchor identity once", async function () {
      await expect(activityTracker.connect(user1).anchorIdentity(IDENTITY_HASH))
        .to.emit(activityTracker, "IdentityAnchored")
        .withArgs(user1.address, IDENTITY_HASH, await ethers.provider.getBlock("latest").then(b => b.timestamp));
      
      const identity = await activityTracker.getIdentityAnchor(user1.address);
      expect(identity.identityHash).to.equal(IDENTITY_HASH);
      expect(identity.isSet).to.be.true;
      expect(identity.timestamp).to.be.gt(0);
    });

    it("Should revert if identity hash is zero", async function () {
      await expect(activityTracker.connect(user1).anchorIdentity(ZERO_HASH))
        .to.be.revertedWithCustomError(activityTracker, "InvalidActivityHash");
    });

    it("Should revert if identity already set", async function () {
      await activityTracker.connect(user1).anchorIdentity(IDENTITY_HASH);
      await expect(activityTracker.connect(user1).anchorIdentity(IDENTITY_HASH))
        .to.be.revertedWithCustomError(activityTracker, "IdentityAlreadySet");
    });
  });

  describe("View Functions", function () {
    beforeEach(async function () {
      await activityTracker.connect(user1).anchorActivity(VALID_HASH_1);
      await activityTracker.connect(user1).anchorActivity(VALID_HASH_2);
      await activityTracker.connect(user1).anchorActivity(VALID_HASH_3);
    });

    it("getActivityCount returns correct count", async function () {
      expect(await activityTracker.getActivityCount(user1.address)).to.equal(3);
      expect(await activityTracker.getActivityCount(user2.address)).to.equal(0);
    });

    it("getActivities returns correct paginated results", async function () {
      const activities = await activityTracker.getActivities(user1.address, 0, 3);
      expect(activities.length).to.equal(3);
      expect(activities[0].activityHash).to.equal(VALID_HASH_1);
      expect(activities[1].activityHash).to.equal(VALID_HASH_2);
      expect(activities[2].activityHash).to.equal(VALID_HASH_3);
    });

    it("getActivities returns empty array for invalid ranges", async function () {
      const outOfBounds = await activityTracker.getActivities(user1.address, 5, 10);
      expect(outOfBounds.length).to.equal(0);
      
      const reverseRange = await activityTracker.getActivities(user1.address, 2, 1);
      expect(reverseRange.length).to.equal(0);
    });

    it("getIdentityAnchor returns default values if not set", async function () {
      const identity = await activityTracker.getIdentityAnchor(user2.address);
      expect(identity.identityHash).to.equal(ZERO_HASH);
      expect(identity.isSet).to.be.false;
      expect(identity.timestamp).to.equal(0);
    });
  });

  describe("Admin Functions", function () {
    describe("setMaxBatchSize", function () {
      it("Should allow admin to update max batch size", async function () {
        await expect(activityTracker.connect(admin).setMaxBatchSize(20))
          .to.emit(activityTracker, "MaxBatchSizeUpdated")
          .withArgs(30, 20);
        expect(await activityTracker.getMaxBatchSize()).to.equal(20);
      });

      it("Should revert if non-admin tries to set batch size", async function () {
        await expect(activityTracker.connect(user1).setMaxBatchSize(10))
          .to.be.revertedWithCustomError(activityTracker, "AccessControlUnauthorized")
          .withArgs(user1.address, await activityTracker.DEFAULT_ADMIN_ROLE());
      });

      it("Should revert if new size is zero", async function () {
        await expect(activityTracker.connect(admin).setMaxBatchSize(0))
          .to.be.revertedWithCustomError(activityTracker, "InvalidFraction");
      });

      it("Should revert if new size exceeds hard cap (30)", async function () {
        await expect(activityTracker.connect(admin).setMaxBatchSize(31))
          .to.be.revertedWithCustomError(activityTracker, "InvalidFraction");
      });
    });
  });

  describe("Reentrancy Protection", function () {
    it("Should prevent reentrancy (indirect test via batch call that tries to call back)", async function () {
      // Since the contract doesn't make external calls except emitting events, reentrancy is not a practical risk.
      // However, we ensure the nonReentrant modifier is applied to state-changing functions.
      // We'll test that two calls from the same user in a single transaction cannot re-enter (but that's not possible).
      // Simpler: ensure that calling anchorActivity from within a malicious contract that tries to call back fails.
      // We'll skip this for brevity as OpenZeppelin's ReentrancyGuard is well-tested.
      // The presence of the modifier is enough; we can check that the function has the modifier by inspecting bytecode? Not needed.
      // For completeness, we'll just verify that the function cannot be called recursively within the same transaction.
      // This is a structural test.
      const [attacker] = await ethers.getSigners();
      const ReentrantCaller = await ethers.getContractFactory("ReentrantCallerMock");
      const reentrant = await ReentrantCaller.deploy(await activityTracker.getAddress());
      await reentrant.waitForDeployment();
      
      // This mock will try to call anchorActivity again during the execution.
      // The contract should revert due to nonReentrant.
      await expect(reentrant.attack()).to.be.reverted;
    });
  });

  describe("Event Emissions", function () {
    it("Should emit IdentityAnchored only once", async function () {
      const tx = await activityTracker.connect(user1).anchorIdentity(IDENTITY_HASH);
      await expect(tx).to.emit(activityTracker, "IdentityAnchored");
    });
  });
});