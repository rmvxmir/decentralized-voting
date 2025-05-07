// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "./Voting.sol";

contract SBT is ERC721 {
    uint256 private _nextTokenId;
    address public votingContract;

    constructor() ERC721("MemberToken", "MBT") {}

    function initializeVotingContract(address _votingContract) external {
        require(votingContract == address(0), "Already initialized");
        votingContract = _votingContract;
    }

    function mint(address to) external {
        require(balanceOf(to) == 0, "Already has SBT");
        _mint(to, _nextTokenId++);
        
        // Mint 10 REP tokens through Voting contract
        Voting(votingContract).mintRepForSbtHolder(to);
    }

    function _transfer(address from, address to, uint256 tokenId) internal pure override {
        revert("Soulbound: non-transferable");
    }

    function approve(address to, uint256 tokenId) public pure override {
        revert("Soulbound: approvals not allowed");
    }

    function setApprovalForAll(address operator, bool approved) public pure override {
        revert("Soulbound: approvals not allowed");
    }
}