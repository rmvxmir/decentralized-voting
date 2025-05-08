# RMV Voting Platform Documentation

## Introduction

This Voting Platform is a decentralized application (DApp) designed to facilitate transparent and secure governance. Built on Ethereum using Solidity smart contracts and a React frontend, the platform allows members to create proposals, vote on them, and delegate voting power. Membership is represented by non-transferable Soulbound Tokens (SBTs), and voting power is managed through Reputation Tokens (REP) with delegation capabilities.

### Project Description
The platform consists of three smart contracts:
- **SBT.sol**: Manages soulbound tokens to represent membership.
- **RepToken.sol**: Handles REP tokens for voting power, using OpenZeppelin's `ERC20Votes` for delegation.
- **Voting.sol**: Manages proposal creation, voting, and REP minting for members.

The frontend provides a user-friendly interface for connecting a wallet, creating proposals, voting, and delegating voting power. Key features include:
- Membership-based access (SBT holders only).
- Proposal creation with customizable voting durations.
- For/Against voting with delegated voting power.
- Automatic REP minting for participation (voting or SBT minting).
- Real-time proposal status updates in the UI.

### Pros
- **Transparency**: All actions (proposal creation, voting, delegation) are recorded on-chain.
- **Flexibility**: Delegation allows members to assign voting power to trusted parties.
- **User-Friendly**: The React frontend shows active/completed proposals and voting power.
- **Incentivization**: Minting REP for voting encourages active participation.

### Cons
- **Gas Costs**: Ethereum transactions (e.g., voting, proposal creation) can be expensive, especially during network congestion.
- **Centralized Minting**: SBT minting is restricted to the contract owner, which may limit decentralization.
- **Scalability**: The current design may face challenges with a large number of proposals or voters due to gas limits and UI rendering.
- **Learning Curve**: Users unfamiliar with Ethereum wallets (e.g., MetaMask) may find setup challenging.

## Purpose of the Work

The purpose of this project is to develop a functional voting system. The project aims to:
- Discovering and implementing new features and protocols.
- Provide a practical example for learning Ethereum development, including contract deployment, cross-contract interactions, and frontend integration.

This project is intended for educational purposes, demonstrating blockchain-based governance for a project defense, and can be extended for real-world applications.

## Real life cases (inspirations)
- **UniSwap DAO;**
- **Compound Finance**: Compound DAO voted to add support for new collateral types, with COMP holders proposing and voting on-chain. The process used delegated voting and was fully transparent. (https://www.sciencedirect.com/science/article/pii/S2096720924000216#se0030)
- **Aragon-Based DAOs**: An Aragon-based DAO (e.g., a community fund) voted to allocate treasury funds for a new project, using token-weighted voting and delegation. (https://blog.colony.io/8-essential-voting-mechanisms-in-daos/)

## Description of the Stages of Work

### 1. Smart Contract Design
The first stage was designing the smart contracts to handle membership, voting power, and governance. Three contracts were created:
- **SBT.sol**: A soulbound ERC721 token contract to represent non-transferable membership.
  ```solidity
  function mintSbt(address to) external onlyOwner {
      uint256 tokenId = _tokenIdCounter++;
      _safeMint(to, tokenId);
      if (votingContract != address(0)) {
          Voting(votingContract).mintRepForSbtHolder(to);
      }
  }
  ```
  This function mints an SBT and triggers REP minting via the `Voting` contract.
- **RepToken.sol**: An ERC20Votes token contract for voting power, with delegation and restricted minting.
  ```solidity
  function mintRep(address to, uint256 amount) external {
      require(msg.sender == votingContract, "Only voting contract can mint");
      require(to != address(0), "Invalid address");
      _mint(to, amount);
      _delegate(to, to); // Auto-delegate to self
  }
  ```
  The `mintRep` function ensures only the `Voting` contract can mint REP, with auto-delegation for immediate voting power.
- **Voting.sol**: Manages proposals, voting, and REP minting for SBT holders.
  ```solidity
  function createProposal(string calldata description, uint40 duration) external {
      require(sbt.balanceOf(msg.sender) > 0, "Not a member");
      proposals[proposalCount] = Proposal({
          id: proposalCount,
          description: description,
          forVotes: 0,
          againstVotes: 0,
          deadline: uint40(block.timestamp) + duration
      });
      emit ProposalCreated(proposalCount++, description);
  }
  ```
  This function allows SBT holders to create proposals with a specified duration.

### 2. Smart Contract Development
The contracts were written in Solidity, leveraging OpenZeppelin’s libraries for security:
- **SBT.sol**: Extended `ERC721` and `Ownable`, overriding `_beforeTokenTransfer` to make tokens non-transferable.
- **RepToken.sol**: Extended `ERC20Votes` and `Ownable`, implementing `mintRep` with access control.
- **Voting.sol**: Defined the `Proposal` struct and implemented voting logic with `getVotes` for delegation.
Key challenges included ensuring cross-contract interactions (e.g., `SBT` calling `Voting.mintRepForSbtHolder`) and proper delegation mechanics.

### 3. Frontend Development
The frontend was built using React (`App.js`) to interact with the contracts via ethers.js. Key components:
- **Wallet Connection**:
  ```javascript
  const connectWallet = async () => {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const newProvider = new ethers.BrowserProvider(window.ethereum);
      const newSigner = await newProvider.getSigner();
      setProvider(newProvider);
      setSigner(newSigner);
      setAccount(accounts[0]);
  };
  ```
  Connects to MetaMask and initializes contract instances.
- **Proposal Creation**:
  ```javascript
  const createProposal = async () => {
      const totalSeconds = (Number(hours) * 3600) + (Number(minutes) * 60);
      const tx = await contracts.voting.createProposal(newProposal, totalSeconds);
      await tx.wait(2);
      await loadContractData(contracts);
  };
  ```
  Allows users to create proposals with a duration.
- **Voting and Delegation**: Functions like `castVote` and `delegateVotingPower` enable voting and delegation, updating the UI dynamically.

### 4. Integration and Deployment
- **Contract Deployment**: A Hardhat script (`deploy.js`) deploys the contracts and initializes cross-contract references:
  ```javascript
  const Voting = await ethers.getContractFactory("Voting");
  const voting = await Voting.deploy(sbt.address, repToken.address);
  await voting.deployed();
  await repToken.initializeVotingContract(voting.address);
  await sbt.initializeVotingContract(voting.address);
  ```
- **Frontend Integration**: Updated `App.js` with contract addresses and ABIs, ensuring seamless interaction.
- **Testing**: Ran the DApp locally (`npm start`) to verify end-to-end functionality, from wallet connection to voting.

## Instructions on Setting Up the Project

To set up and run the DAO Voting Platform, follow these steps. The project requires Node.js, Hardhat, and MetaMask.

### Prerequisites
- **Node.js and npm**: Install from [nodejs.org](https://nodejs.org/) (v16 or later).
- **MetaMask**: Install the browser extension and set up an Ethereum wallet.
- **Hardhat**: Used for contract development and deployment.
- **Git**: For cloning the project repository (optional).

### Step 1: Clone the Repository
Clone the project repository or create a new directory with the provided files:
```bash
git clone https://github.com/rmvxmir/decentralized-voting.git
OR git clone git@github.com:rmvxmir/decentralized-voting (via SSH key)
cd decentralized-voting
```

### Step 2: Set Up the Hardhat Environment
1. Initialize a Hardhat project:
   ```bash
   npm init -y
   npm install --save-dev hardhat
   npx hardhat
   ```
   Choose “Create a JavaScript project” and accept defaults.
2. Install dependencies:
   ```bash
   npm install @openzeppelin/contracts@4.9.5 ethers
   ```
3. Place the smart contracts (`Voting.sol`, `SBT.sol`, `RepToken.sol`) in the `contracts/` directory.
4. Place `deploy.js` and `mint.js` in the `scripts/` directory.
5. Update `hardhat.config.js`:
   ```javascript
   require("@nomicfoundation/hardhat-toolbox");

   module.exports = {
     solidity: "0.8.20",
     networks: {
       localhost: {
         url: "http://127.0.0.1:8545"
       }
     }
   };
   ```

### Step 3: Deploy the Smart Contracts
1. Start a Hardhat node:
   ```bash
   npx hardhat node
   ```
   This runs a local Ethereum network and provides test accounts.
2. Deploy the contracts:
   ```bash
   npx hardhat run scripts/deploy.js --network localhost
   ```
3. Copy the output contract addresses:
   ```
   const sbtAddress = "SBT_ADDRESS";
   const repAddress = "REP_ADDRESS";
   const votingAddress = "VOTING_ADDRESS";
   ```
4. Update `App.js` with these addresses:
   ```javascript
   const sbtAddress = "SBT_ADDRESS";
   const repAddress = "REP_ADDRESS";
   const votingAddress = "VOTING_ADDRESS";
   ```
5. Copy the compiled ABIs from `artifacts/contracts/*.sol/*.json` to `frontend/src/abis/` as `SBT_ABI.json`, `RepToken_ABI.json`, and `Voting_ABI.json`.

### Step 4: Set Up the Frontend
1. Create a React project in the `frontend/` directory:
   ```bash
   npx create-react-app frontend
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install ethers
   ```
3. Place `App.js` in `frontend/src/` and create an `abis/` directory with the ABI files.
4. Add basic CSS (`App.css`) for styling (optional, use provided styles or customize).
5. Start the frontend:
   ```bash
   npm start
   ```
   The app runs at `http://localhost:3000`.

### Step 5: Interact with the DApp
1. Open `http://localhost:3000` in a browser with MetaMask.
2. Connect MetaMask to the Hardhat network:
   - Network Name: Hardhat
   - RPC URL: `http://127.0.0.1:8545`
   - Chain ID: 31337
   - Import test accounts from the Hardhat node (private keys shown in `npx hardhat node` output).
3. Use the DApp:
   - **Connect Wallet**: Click “Connect Wallet” to link MetaMask.
   - **Mint SBT**: Use the Hardhat console to mint an SBT via the mint.js script:
     ```bash
     npx hardhat run scripts/mint.js --network localhost
     ```
     This grants membership and 10 REP.
   - **Create Proposal**: Enter a description and duration, then click “Create Proposal.”
   - **Vote**: Click “Vote For” or “Vote Against” on active proposals (or do nothing for a tie).
   - **Delegate**: Enter a delegate address and click “Delegate.”
