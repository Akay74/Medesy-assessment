
const hre = require("hardhat");

async function main() {
    console.log("Deploying MedesyActivityTracker to", hre.network.name);
    
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying with account:", deployer.address);
    
    const balance = await hre.ethers.provider.getBalance(deployer.address);
    console.log("Account balance:", hre.ethers.formatEther(balance), "MATIC");
    
    // Deploy contract
    const MedesyActivityTracker = await hre.ethers.getContractFactory("MedesyActivityTracker");
    
    // Relayer is used as the deployer
    const relayerAddress = deployer.address;
    
    console.log("Deploying contract...");
    const contract = await MedesyActivityTracker.deploy(relayerAddress);
    
    await contract.waitForDeployment();
    const contractAddress = await contract.getAddress();
    
    console.log("MedesyActivityTracker deployed to:", contractAddress);
    console.log("Relayer address:", relayerAddress);
    console.log("");
    console.log("Update your .env file:");
    console.log(`CONTRACT_ADDRESS=${contractAddress}`);
    console.log(`RELAYER_PRIVATE_KEY=${process.env.RELAYER_PRIVATE_KEY}`);
    console.log("");
    console.log("Verify on PolygonScan (Amoy testnet):");
    console.log(`https://amoy.polygonscan.com/address/${contractAddress}`);
    
    // Verify contract on PolygonScan
    if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
        console.log("");
        console.log("Waiting for block confirmations...");
        await contract.deploymentTransaction().wait(6);
        
        console.log("Verifying contract on PolygonScan...");
        try {
            await hre.run("verify:verify", {
                address: contractAddress,
                constructorArguments: [relayerAddress],
            });
            console.log("Contract verified!");
        } catch (error) {
            console.log("Verification failed:", error.message);
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
