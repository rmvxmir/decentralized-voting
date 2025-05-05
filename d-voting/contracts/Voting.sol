// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./SBT.sol";
import "./RepToken.sol";

contract Voting {
    struct Proposal {
        bytes32 descriptionHash; // Stores hash instead of string for gas savings
        uint256 votesFor;
        uint256 votesAgainst;
        uint40 creationTime; // Packed timestamp (saves gas)
        uint40 votingPeriod; // Duration in seconds
        bool finalized; // Marks when voting period is closed
    }

    struct Voter {
        address delegate;
        uint256 delegatedWeight;
        bool voted;
    }

    // State variables
    uint256 public proposalCount;
    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => mapping(address => Voter)) public voters;
    mapping(bytes32 => bool) public descriptionHashes; // Prevents duplicate proposals

    // Immutable for gas optimization
    SBT public immutable sbt;
    RepToken public immutable rep;
    uint256 public constant MIN_PROPOSAL_REP = 10;

    // Events
    event ProposalCreated(uint256 indexed proposalId, bytes32 descriptionHash);
    event VoteDelegated(address indexed delegator, address indexed delegatee, uint256 proposalId);
    event Voted(address indexed voter, uint256 indexed proposalId, bool support, uint256 weight);
    event ProposalFinalized(uint256 indexed proposalId);

    constructor(address _sbt, address _rep) {
        sbt = SBT(_sbt);
        rep = RepToken(_rep);
    }

    modifier onlySBT() {
        require(sbt.balanceOf(msg.sender) > 0, "SBT required");
        _;
    }

    /// @notice Creates a new voting proposal
    /// @param description Proposal details (off-chain reference)
    /// @param votingPeriod Duration in seconds
    function createProposal(string calldata description, uint40 votingPeriod) external onlySBT {
        require(rep.balanceOf(msg.sender) >= MIN_PROPOSAL_REP, "Insufficient REP");
        bytes32 descriptionHash = keccak256(abi.encodePacked(description));
        require(!descriptionHashes[descriptionHash], "Duplicate proposal");
        
        descriptionHashes[descriptionHash] = true;
        proposals[proposalCount] = Proposal({
            descriptionHash: descriptionHash,
            votesFor: 0,
            votesAgainst: 0,
            creationTime: uint40(block.timestamp),
            votingPeriod: votingPeriod,
            finalized: false
        });

        emit ProposalCreated(proposalCount++, descriptionHash);
    }

    /// @notice Delegate voting power to another address
    function delegateVote(uint256 proposalId, address delegatee) external onlySBT {
        require(delegatee != msg.sender, "Cannot delegate to self");
        Proposal storage p = proposals[proposalId];
        require(_isVotingActive(p), "Voting inactive");

        Voter storage voter = voters[proposalId][msg.sender];
        require(!voter.voted, "Already voted");
        require(voter.delegate == address(0), "Already delegated");

        uint256 weight = rep.balanceOf(msg.sender);
        require(weight > 0, "No voting power");

        voter.delegate = delegatee;
        voters[proposalId][delegatee].delegatedWeight += weight;

        emit VoteDelegated(msg.sender, delegatee, proposalId);
    }

    /// @notice Vote on an active proposal
    function vote(uint256 proposalId, bool support) external onlySBT {
        Proposal storage p = proposals[proposalId];
        require(_isVotingActive(p), "Voting inactive");

        Voter storage voter = voters[proposalId][msg.sender];
        require(!voter.voted, "Already voted");

        uint256 weight = rep.balanceOf(msg.sender);
        if (voter.delegate != address(0)) {
            weight += voters[proposalId][voter.delegate].delegatedWeight;
        }
        require(weight > 0, "No voting power");

        if (support) {
            p.votesFor += weight;
        } else {
            p.votesAgainst += weight;
        }

        voter.voted = true;
        emit Voted(msg.sender, proposalId, support, weight);
    }

    /// @notice Finalize a proposal after voting period ends
    function finalizeProposal(uint256 proposalId) external {
        Proposal storage p = proposals[proposalId];
        require(_exists(p), "Invalid proposal");
        require(!p.finalized, "Already finalized");
        require(block.timestamp >= p.creationTime + p.votingPeriod, "Voting ongoing");

        p.finalized = true;
        emit ProposalFinalized(proposalId);
    }

    // View Functions

    function getProposal(uint256 proposalId) external view returns (
        bytes32 descriptionHash,
        uint256 votesFor,
        uint256 votesAgainst,
        uint40 creationTime,
        uint40 votingPeriod,
        bool finalized
    ) {
        Proposal storage p = proposals[proposalId];
        require(_exists(p), "Invalid proposal");
        return (
            p.descriptionHash,
            p.votesFor,
            p.votesAgainst,
            p.creationTime,
            p.votingPeriod,
            p.finalized
        );
    }

    // Internal Helpers

    function _exists(Proposal storage p) internal view returns (bool) {
        return p.creationTime != 0;
    }

    function _isVotingActive(Proposal storage p) internal view returns (bool) {
        return _exists(p) && 
               !p.finalized && 
               block.timestamp < p.creationTime + p.votingPeriod;
    }
}