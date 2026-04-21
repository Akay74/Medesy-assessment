const hre = require("hardhat");

async function main() {
  const initialAdmin = "0x..."; // Replace with your admin wallet address

  console.log("Deploying MedesyActivityTracker...");
  
  const MedesyActivityTracker = await hre.ethers.getContractFactory("MedesyActivityTracker");
  const activityTracker = await MedesyActivityTracker.deploy(initialAdmin);
  
  await activityTracker.waitForDeployment();
  
  console.log(`MedesyActivityTracker deployed to: ${await activityTracker.getAddress()}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});