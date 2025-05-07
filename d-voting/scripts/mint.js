const { ethers } = require("hardhat");

async function main() {
  const sbtAddress = "0x8198f5d8F8CfFE8f9C413d98a0A55aEB8ab9FbB7"; // Change if redeployed
  //const accountAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"; // Hardhat #0
  const accountAddress = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"; // Hardhat #1

  const sbt = await ethers.getContractAt("SBT", sbtAddress);
  const [signer] = await ethers.getSigners();
  console.log("Minting SBT with signer:", signer.address);

  // Mint SBT
  const tx = await sbt.mint(accountAddress);
  console.log("Transaction sent:", tx.hash);
  await tx.wait();
  console.log("SBT minted to:", accountAddress);

  // Verify balance
  const balance = await sbt.balanceOf(accountAddress);
  console.log("SBT balance of", accountAddress, ":", balance.toString());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});