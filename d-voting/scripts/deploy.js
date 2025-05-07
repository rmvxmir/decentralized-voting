const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  // 1. Deploy SBT (no dependencies)
  const SBT = await ethers.getContractFactory("SBT");
  const sbt = await SBT.deploy();
  await sbt.waitForDeployment();
  const sbtAddress = await sbt.getAddress();
  console.log("SBT deployed to:", sbtAddress);

  // 2. Deploy RepToken (empty constructor)
  const RepToken = await ethers.getContractFactory("RepToken");
  const rep = await RepToken.deploy();
  await rep.waitForDeployment();
  const repAddress = await rep.getAddress();
  console.log("RepToken deployed to:", repAddress);

  // 3. Deploy Voting with both addresses
  const Voting = await ethers.getContractFactory("Voting");
  const voting = await Voting.deploy(sbtAddress, repAddress);
  await voting.waitForDeployment();
  const votingAddress = await voting.getAddress();
  console.log("Voting deployed to:", votingAddress);

  const sbtContract = await ethers.getContractAt("SBT", sbtAddress, deployer);
  await sbtContract.initializeVotingContract(votingAddress);
  console.log("Voting contract initialized in SBT");

  const repContract = await ethers.getContractAt("RepToken", repAddress, deployer);
  await repContract.initializeVotingContract(votingAddress);
  console.log("Voting contract initialized in RepToken");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});