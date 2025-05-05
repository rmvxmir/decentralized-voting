// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract SBT is ERC721URIStorage, Ownable {
    uint256 private _nextTokenId;

    constructor() ERC721("RMV SoulboundToken", "RMV") {}

    function mint(address to, string memory uri) public onlyOwner {
        require(balanceOf(to) == 0, "Recipient already has a token");
        uint256 tokenId = _nextTokenId++;
        _mint(to, tokenId);
        _setTokenURI(tokenId, uri);
    }

    function _transfer(address from, address to, uint256 tokenId) internal pure override {
        revert("Transfers are disabled");
    }
}