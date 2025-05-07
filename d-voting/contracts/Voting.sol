// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./SBT.sol";
import "./RepToken.sol";

contract Voting {
    struct Proposal {
        uint256 id;
        string description;
        uint256 forVotes;
        uint256 againstVotes;
        uint40 deadline;
        bool executed; // Deprecated
    }

    SBT public immutable sbt;
    RepToken public immutable rep;
    
    uint256 public proposalCount;
    mapping(uint256 => Proposal) public proposals;
    mapping(address => address) public delegates;

    event ProposalCreated(uint256 indexed id, string description);
    event VoteCast(address indexed voter, uint256 proposalId, uint256 power, bool isFor);
    event DelegateChanged(address indexed delegator, address indexed delegate);

    constructor(address _sbt, address _rep) {
        sbt = SBT(_sbt);
        rep = RepToken(_rep);
    }

    function mintRepForSbtHolder(address holder) external {
        require(msg.sender == address(sbt), "Only SBT contract can call");
        rep.mintRep(holder, 10 * 10**18);
    }

    function createProposal(string calldata description, uint40 duration) external {
        require(sbt.balanceOf(msg.sender) > 0, "Not a member");
        proposals[proposalCount] = Proposal({
            id: proposalCount,
            description: description,
            forVotes: 0,
            againstVotes: 0,
            deadline: uint40(block.timestamp) + duration,
            executed: false
        });
        emit ProposalCreated(proposalCount++, description);
    }

    mapping(uint256 => mapping(address => bool)) public hasVoted;

    function vote(uint256 proposalId, bool isFor) external {
        require(sbt.balanceOf(msg.sender) > 0, "Not a member");
        Proposal storage proposal = proposals[proposalId];
        require(block.timestamp < proposal.deadline, "Voting ended");
        require(!hasVoted[proposalId][msg.sender], "Already voted");

        address voter = msg.sender;
        uint256 votingPower = rep.getVotes(voter);
        require(votingPower > 0, "No voting power");

        if (isFor) {
            proposal.forVotes += votingPower;
        } else {
            proposal.againstVotes += votingPower;
        }
        hasVoted[proposalId][msg.sender] = true;
        rep.mintRep(voter, 10 * 10**18);
        
        emit VoteCast(voter, proposalId, votingPower, isFor);
    }

    function executeProposal(uint256 proposalId) external { // Deprecated
        Proposal storage proposal = proposals[proposalId];
        require(block.timestamp > proposal.deadline, "Voting ongoing");
        require(!proposal.executed, "Already executed");
        proposal.executed = true;
    }
}