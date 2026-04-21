const hre = require("hardhat");

async function main() {
  const rewardTokenAddress = "0x..."; // Replace with actual ERC20 token address
  const initialAdmin = "0x...";      // Replace with your admin wallet address

  console.log("Deploying ReferralSystem...");
  
  const ReferralSystem = await hre.ethers.getContractFactory("ReferralSystem");
  const referralSystem = await ReferralSystem.deploy(rewardTokenAddress, initialAdmin);
  
  await referralSystem.waitForDeployment();
  
  console.log(`ReferralSystem deployed to: ${await referralSystem.getAddress()}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});