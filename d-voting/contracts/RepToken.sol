// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";

contract RepToken is ERC20Votes {
    address public votingContract;
    
    constructor() ERC20("Reputation", "REP") ERC20Permit("Reputation") {}
    
    function initializeVotingContract(address _votingContract) external {
        require(votingContract == address(0), "Already initialized");
        votingContract = _votingContract;
        _mint(_votingContract, 1_000_000 * 10**decimals());
    }
    
    function mintRep(address to, uint256 amount) external {
        require(msg.sender == votingContract, "Unauthorized");
        _mint(to, amount);
        // Auto-delegate to self when minting
        _delegate(to, to);
    }
}