import { useState, useEffect } from 'react';
import { ethers, formatUnits } from 'ethers';
import './App.css';
import repABI from './abis/RepToken_ABI.json';
import sbtABI from './abis/SBT_ABI.json';
import votingABI from './abis/Voting_ABI.json';

const App = () => {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [account, setAccount] = useState('');
  const [activeProposals, setActiveProposals] = useState([]);
  const [completedProposals, setCompletedProposals] = useState([]);
  const [delegate, setDelegate] = useState('');
  const [newProposal, setNewProposal] = useState('');
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(1);
  const [votingPower, setVotingPower] = useState(0);
  const [sbtBalance, setSbtBalance] = useState(0);

  const sbtAddress = "0x8198f5d8F8CfFE8f9C413d98a0A55aEB8ab9FbB7";
  const repAddress = "0x0355B7B8cb128fA5692729Ab3AAa199C1753f726";
  const votingAddress = "0x202CCe504e04bEd6fC0521238dDf04Bc9E8E15aB";
  const initializeContracts = (signer) => {
    return {
      sbt: new ethers.Contract(sbtAddress, sbtABI, signer),
      rep: new ethers.Contract(repAddress, repABI, signer),
      voting: new ethers.Contract(votingAddress, votingABI, signer)
    };
  };

  const connectWallet = async () => {
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      if (accounts.length === 0) {
        console.warn("No accounts returned from MetaMask");
        return;
      }

      const newProvider = new ethers.BrowserProvider(window.ethereum);
      const newSigner = await newProvider.getSigner();
      const newAccount = accounts[0];

      //console.log("Connected account:", newAccount);

      setProvider(newProvider);
      setSigner(newSigner);
      setAccount(newAccount);

      const contracts = initializeContracts(newSigner);
      if (contracts) {
        await loadContractData(contracts);
      }
    } catch (error) {
      console.error("Error connecting wallet:", error);
      alert("Error connecting: " + error.message);
    }
  };

  const switchAccount = async () => {
    try {
      const permissions = await window.ethereum.request({
        method: 'wallet_requestPermissions',
        params: [{ eth_accounts: {} }]
      });
      const accounts = permissions[0]?.caveats?.[0]?.value || [];
      if (accounts.length === 0) {
        console.warn("No accounts selected");
        return;
      }

      const newProvider = new ethers.BrowserProvider(window.ethereum);
      const newSigner = await newProvider.getSigner();
      const newAccount = accounts[0];

      //console.log("Switched to account:", newAccount);

      setProvider(newProvider);
      setSigner(newSigner);
      setAccount(newAccount);

      const contracts = initializeContracts(newSigner);
      if (contracts) {
        await loadContractData(contracts);
      }
    } catch (error) {
      console.error("Error switching account:", error);
      alert("Error switching account: " + error.message);
    }
  };

  const loadContractData = async (contracts) => {
    if (!contracts) {
      console.error("Contracts not initialized");
      return;
    }

    try {
      const countBN = await contracts.voting.proposalCount();
      const count = Number(countBN);
      console.log("Proposal count:", count);

      const allProposals = [];
      const now = Math.floor(Date.now() / 1000);

      for (let i = 0; i < count; i++) {
        try {
          const p = await contracts.voting.proposals(i);
          const deadline = Number(p[4]);
          console.log(`Proposal ${i} deadline: ${deadline}, now: ${now}`);
          const proposal = {
            id: Number(p[0]),
            description: p[1],
            forVotes: parseFloat(formatUnits(p[2], 18)),
            againstVotes: parseFloat(formatUnits(p[3], 18)),
            deadline: deadline,
            executed: p[5]
          };
          console.log(`Proposal ${i}:`, proposal);
          allProposals.push(proposal);
        } catch (error) {
          console.error(`Error loading proposal ${i}:`, error);
          allProposals.push({
            id: i,
            description: `Proposal ${i} (Error Loading)`,
            forVotes: 0,
            againstVotes: 0,
            deadline: now,
            executed: false
          });
        }
      }

      const active = allProposals.filter(p => p.deadline > now);
      const completed = allProposals.filter(p => p.deadline <= now);
      console.log("Active proposals:", active);
      console.log("Completed proposals:", completed);

      setActiveProposals(active);
      setCompletedProposals(completed);

      if (account) {
        try {
          const powerBN = await contracts.rep.getVotes(account);
          const power = parseFloat(formatUnits(powerBN, 18));
          console.log("Voting power:", power);
          setVotingPower(power || 0);
        } catch (error) {
          console.error("Error loading voting power:", error);
          setVotingPower(0);
        }

        try {
          const sbtBalanceBN = await contracts.sbt.balanceOf(account);
          const balance = Number(sbtBalanceBN);
          console.log("SBT balance:", balance);
          setSbtBalance(balance);
        } catch (error) {
          console.error("Error loading SBT balance:", error);
          setSbtBalance(0);
        }
      }
    } catch (error) {
      console.error("Error loading contract data:", error);
    }
  };

  const validateDuration = (hours, minutes) => {
    const totalSeconds = (Number(hours) * 3600) + (Number(minutes) * 60);
    return totalSeconds >= 60;
  };

  const createProposal = async () => {
    if (!newProposal.trim()) {
      alert("Please enter a proposal description");
      return;
    }

    try {
      if (!validateDuration(hours, minutes)) {
        throw new Error("Minimum duration 1 minute");
      }

      const totalSeconds = (Number(hours) * 3600) + (Number(minutes) * 60);
      const contracts = initializeContracts(signer);
      if (!contracts) {
        throw new Error("Failed to initialize contracts");
      }

      console.log("Creating proposal:", { description: newProposal, duration: totalSeconds });
      const tx = await contracts.voting.createProposal(newProposal, totalSeconds);
      console.log("Transaction sent:", tx.hash);

      await tx.wait(2);
      console.log("Transaction confirmed");

      await loadContractData(contracts);
      setNewProposal('');
      setHours(0);
      setMinutes(1);

      alert("Proposal created successfully!");
    } catch (error) {
      console.error("Error creating proposal:", error);
      alert("Creation failed: " + (error.reason || error.message));
    }
  };

  const delegateVotingPower = async () => {
    if (!delegate) {
      alert("Please enter a delegate address");
      return;
    }

    try {
      if (!ethers.isAddress(delegate)) {
        throw new Error("Invalid Ethereum address");
      }

      const contracts = initializeContracts(signer);
      if (!contracts) {
        throw new Error("Failed to initialize contracts");
      }

      console.log("Delegating to:", delegate);
      const tx = await contracts.rep.delegate(delegate);
      console.log("Transaction sent:", tx.hash);

      await tx.wait();
      await loadContractData(contracts);
      setDelegate('');

      alert("Delegation success!");
    } catch (error) {
      console.error("Error delegating vote:", error);
      alert("Delegation failed: " + (error.reason || error.message));
    }
  };

  const castVote = async (proposalId, isFor) => {
    try {
      const contracts = initializeContracts(signer);
      if (!contracts) {
        throw new Error("Failed to initialize contracts");
      }

      // Verify proposal is active
      const proposal = await contracts.voting.proposals(proposalId);
      const deadline = Number(proposal[4]);
      const now = Math.floor(Date.now() / 1000);
      if (deadline <= now || proposal[5]) {
        throw new Error(`Proposal ${proposalId} is not active (deadline: ${deadline}, executed: ${proposal[5]})`);
      }

      console.log(`Casting ${isFor ? 'For' : 'Against'} vote for proposal:`, proposalId);
      const tx = await contracts.voting.vote(proposalId, isFor);
      console.log("Transaction sent:", tx.hash);

      await tx.wait();
      await loadContractData(contracts);

      alert(`Vote (${isFor ? 'For' : 'Against'}) cast successfully!`);
    } catch (error) {
      console.error(`Error casting ${isFor ? 'For' : 'Against'} vote:`, error);
      alert(`Voting failed: ${error.reason || error.message}`);
    }
  };

  const getProposalStatus = (proposal) => {
    if (proposal.forVotes > proposal.againstVotes) {
      return "✅ Approved";
    } else if (proposal.againstVotes > proposal.forVotes) {
      return "❌ Rejected";
    } else {
      return "⚖️ Tied";
    }
  };

  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = async (accounts) => {
      console.log("Accounts changed:", accounts);
      if (accounts.length === 0) {
        setAccount('');
        setSigner(null);
        setActiveProposals([]);
        setCompletedProposals([]);
        setVotingPower(0);
        setSbtBalance(0);
      } else {
        const newProvider = new ethers.BrowserProvider(window.ethereum);
        const newSigner = await newProvider.getSigner();
        setAccount(accounts[0]);
        setSigner(newSigner);
        const contracts = initializeContracts(newSigner);
        if (contracts) {
          await loadContractData(contracts);
        }
      }
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    return () => {
      window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
    };
  }, []);

  useEffect(() => {
    if (signer && account) {
      console.log("Reloading data for account:", account);
      const contracts = initializeContracts(signer);
      if (contracts) {
        loadContractData(contracts);
      }
    }
  }, [signer, account]);

  return (
    <div className="app-container">
      {!account ? (
        <div className="connect-screen">
          <h1>RMV Voting Platform</h1>
          <button className="connect-btn" onClick={connectWallet}>
            Connect Wallet
          </button>
        </div>
      ) : (
        <div className="main-interface">
          <header>
            <div className="header-content">
              <h1>🌿 RMV</h1>
              <div className="wallet-section">
                <span>{account.slice(0,7)}...{account.slice(-5)}</span>
                <button onClick={switchAccount} className="switch-btn">
                  Switch Account
                </button>
              </div>
              <div className="power-badge">
                Voting Power: {(votingPower || 0).toFixed(2)} REP
                <br />
                Member: {sbtBalance > 0 ? 'True' : 'False'}
              </div>
            </div>
          </header>

          <section className="proposal-creation">
            <h2>Create New Proposal</h2>
            <div className="creation-form">
              <input
                type="text"
                value={newProposal}
                onChange={(e) => setNewProposal(e.target.value)}
                placeholder="Proposal description..."
              />
              <div className="duration-inputs">
                <input
                  type="number"
                  min="0"
                  value={hours}
                  onChange={(e) => setHours(Math.max(0, parseInt(e.target.value) || 0))}
                  placeholder="Hours"
                />
                <input
                  type="number"
                  min="1"
                  value={minutes}
                  onChange={(e) => setMinutes(Math.max(1, parseInt(e.target.value) || 1))}
                  placeholder="Minutes"
                />
              </div>
              <button onClick={createProposal} className="create-btn">
                Create Proposal
              </button>
            </div>
          </section>

          <section className="delegation-section">
            <h2 style={{ marginTop: '-10px' }}>Delegate Voting Power</h2>
            <div className="delegate-form">
              <input style={{ marginTop: '15px' }}
                type="text"
                value={delegate}
                onChange={(e) => setDelegate(e.target.value)}
                placeholder="Delegate address (0x...)"
              />
              <button onClick={delegateVotingPower} className="delegate-btn" style={{ marginLeft: '20px' }}>
                Delegate
              </button>
            </div>
          </section>

          <section className="proposals-section">
            <h2>Active Proposals</h2>
            {activeProposals.length === 0 ? (
              <p>No active proposals.</p>
            ) : (
              <div className="proposals-grid">
                {activeProposals.map((p) => (
                  <div key={p.id} className="proposal-card">
                    <h3>Proposal #{p.id}: {p.description}</h3>
                    <p>Deadline: {new Date(p.deadline * 1000).toLocaleString()}</p>
                    <div className="vote-meter">
                      <div className="meter-bar" 
                        style={{width: `${(p.forVotes / (p.forVotes + p.againstVotes || 1)) * 100}%`}}>
                        <span className="for-percent">
                          For: {p.forVotes.toFixed(2)} | Against: {p.againstVotes.toFixed(2)}
                        </span>
                      </div>
                    </div>
                    <div className="vote-buttons">
                      <button onClick={() => castVote(p.id, true)} className="vote-for">
                        Vote For ({p.forVotes.toFixed(2)})
                      </button>
                      <button onClick={() => castVote(p.id, false)} className="vote-against">
                        Vote Against ({p.againstVotes.toFixed(2)})
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="completed-section">
            <h2>Completed Proposals</h2>
            <div className="proposals-grid">
              {completedProposals.map((p) => (
                <div key={p.id} className="completed-card">
                  <h3>Proposal #{p.id}: {p.description}</h3>
                  <div className="result-row">
                    <span className="result-status">{getProposalStatus(p)}</span>
                    <div className="result-numbers">
                      <span className="for">For: {p.forVotes.toFixed(2)}</span>
                      <span className="against">Against: {p.againstVotes.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

export default App;