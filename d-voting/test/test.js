const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DAO Voting Platform", function () {
  let SBT, RepToken, Voting;
  let sbt, repToken, voting;
  let owner, user1, user2, nonMember;
  const TEN_REP = ethers.parseUnits("10", 18);

  beforeEach(async function () {
    [owner, user1, user2, nonMember] = await ethers.getSigners();

    SBT = await ethers.getContractFactory("SBT");
    sbt = await SBT.deploy();
    await sbt.waitForDeployment();

    RepToken = await ethers.getContractFactory("RepToken");
    repToken = await RepToken.deploy();
    await repToken.waitForDeployment();

    Voting = await ethers.getContractFactory("Voting");
    voting = await Voting.deploy(await sbt.getAddress(), await repToken.getAddress());
    await voting.waitForDeployment();

    await sbt.initializeVotingContract(await voting.getAddress());
    await repToken.initializeVotingContract(await voting.getAddress());
  });

  describe("SBT Contract", function () {

    it("should initialize voting contract correctly", async function () {
      expect(await sbt.votingContract()).to.equal(await voting.getAddress());
      await expect(sbt.initializeVotingContract(ethers.ZeroAddress)).to.be.revertedWith("Already initialized");
    });

    it("should mint SBT and trigger REP minting", async function () {
      await sbt.mint(user1.address);
      expect(await sbt.balanceOf(user1.address)).to.equal(1);
      expect(await sbt.ownerOf(0)).to.equal(user1.address);
      expect(await repToken.balanceOf(user1.address)).to.equal(TEN_REP);
      expect(await repToken.getVotes(user1.address)).to.equal(TEN_REP);
    });

    it("should prevent minting multiple SBTs to the same address", async function () {
      await sbt.mint(user1.address);
      await expect(sbt.mint(user1.address)).to.be.revertedWith("Already has SBT");
    });

    it("should prevent transfers and approvals", async function () {
      await sbt.mint(user1.address);
      // Call transferFrom as owner to reach custom revert
      await expect(sbt.connect(user1).transferFrom(user1.address, user2.address, 0))
        .to.be.revertedWith("Soulbound: non-transferable");
      await expect(sbt.connect(user1).approve(user2.address, 0))
        .to.be.revertedWith("Soulbound: approvals not allowed");
      await expect(sbt.connect(user1).setApprovalForAll(user2.address, true))
        .to.be.revertedWith("Soulbound: approvals not allowed");
    });
  });

  describe("RepToken Contract", function () {

    it("should initialize voting contract correctly", async function () {
      expect(await repToken.votingContract()).to.equal(await voting.getAddress());
      await expect(repToken.initializeVotingContract(ethers.ZeroAddress)).to.be.revertedWith("Already initialized");
    });

    it("should mint REP only via SBT contract", async function () {
      await expect(repToken.mintRep(user1.address, TEN_REP)).to.be.revertedWith("Unauthorized");
      await sbt.mint(user1.address); // Triggers mintRepForSbtHolder
      expect(await repToken.balanceOf(user1.address)).to.equal(TEN_REP);
      expect(await repToken.getVotes(user1.address)).to.equal(TEN_REP);
    });

    it("should allow delegation", async function () {
      await sbt.mint(user1.address);
      await repToken.connect(user1).delegate(user2.address);
      expect(await repToken.getVotes(user2.address)).to.equal(TEN_REP);
      expect(await repToken.getVotes(user1.address)).to.equal(0);
    });
  });

  describe("Voting Contract", function () {

    it("should allow SBT holders to create proposals", async function () {
      await sbt.mint(user1.address);
      const description = "Increase funding";
      const duration = 3600;
      await expect(voting.connect(user1).createProposal(description, duration))
        .to.emit(voting, "ProposalCreated")
        .withArgs(0, description);
      
      const proposal = await voting.proposals(0);
      expect(proposal.id).to.equal(0);
      expect(proposal.description).to.equal(description);
      expect(proposal.forVotes).to.equal(0);
      expect(proposal.againstVotes).to.equal(0);
      expect(proposal.deadline).to.be.closeTo(
        (await ethers.provider.getBlock("latest")).timestamp + duration,
        100
      );
      expect(proposal.executed).to.equal(false);
    });

    it("should prevent non-members from creating proposals", async function () {
      await expect(voting.connect(nonMember).createProposal("Test", 3600))
        .to.be.revertedWith("Not a member");
    });

    it("should allow SBT holders to vote with delegated power", async function () {
      await sbt.mint(user1.address);
      await voting.connect(user1).createProposal("Test", 3600);
      
      await expect(voting.connect(user1).vote(0, true))
        .to.emit(voting, "VoteCast")
        .withArgs(user1.address, 0, TEN_REP, true);
      
      const proposal = await voting.proposals(0);
      expect(proposal.forVotes).to.equal(TEN_REP);
      expect(proposal.againstVotes).to.equal(0);
      expect(await repToken.balanceOf(user1.address)).to.equal(TEN_REP + TEN_REP);
      expect(await voting.hasVoted(0, user1.address)).to.equal(true);
    });

    it("should prevent voting by non-members", async function () {
      await sbt.mint(user1.address);
      await voting.connect(user1).createProposal("Test", 3600);
      await expect(voting.connect(nonMember).vote(0, true)).to.be.revertedWith("Not a member");
    });

    it("should prevent voting after deadline", async function () {
      await sbt.mint(user1.address);
      await voting.connect(user1).createProposal("Test", 1);
      
      await ethers.provider.send("evm_increaseTime", [3600]);
      await ethers.provider.send("evm_mine", []);
      
      await expect(voting.connect(user1).vote(0, true)).to.be.revertedWith("Voting ended");
    });

    it("should prevent double voting", async function () {
      await sbt.mint(user1.address);
      await voting.connect(user1).createProposal("Test", 3600);
      await voting.connect(user1).vote(0, true);
      await expect(voting.connect(user1).vote(0, true)).to.be.revertedWith("Already voted");
    });

    it("should prevent voting with no voting power", async function () {
      await sbt.mint(user1.address);
      await repToken.connect(user1).delegate(ethers.ZeroAddress); // Revoke voting power
      await voting.connect(user1).createProposal("Test", 3600);
      await expect(voting.connect(user1).vote(0, true)).to.be.revertedWith("No voting power");
    });
  });
});