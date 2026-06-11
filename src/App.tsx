import { useState } from 'react';
import { Shield, Search, Lock, ShieldAlert, ShieldCheck, Activity, Wallet } from 'lucide-react';
import { motion } from 'framer-motion';
import { createClient, createAccount } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';
import { TransactionStatus } from 'genlayer-js/types';

// Auto-generated GenLayer account for the demo
const glAccount = createAccount();
const glClient = createClient({ chain: studionet, account: glAccount });

function App() {
  const [contractAddress] = useState('0x77d8ddfD50e3b4FF5f39fC83EBa1D3D6F1A447Bf');
  const [repoUrl, setRepoUrl] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [auditResult, setAuditResult] = useState<any>(null);
  const [walletAddress, setWalletAddress] = useState('');

  const connectWallet = async () => {
    if (typeof (window as any).ethereum !== 'undefined') {
      try {
        const accounts = await (window as any).ethereum.request({ method: 'eth_requestAccounts' });
        setWalletAddress(accounts[0]);
      } catch (error) {
        console.error("User denied wallet connection");
      }
    } else {
      alert("Please install MetaMask to connect your wallet!");
    }
  };

  const handleAudit = async () => {
    if (!walletAddress) {
      alert("Please connect your MetaMask wallet first to request an audit!");
      return;
    }
    if (!contractAddress) {
      alert("Please enter the NexusGuard smart contract address first.");
      return;
    }
    if (!repoUrl) {
      alert("Please enter a GitHub URL to audit.");
      return;
    }

    try {
      // Force MetaMask popup to make the demo realistic
      const message = `NexusGuard\n\nAction: Request Smart Contract Audit\nTarget: ${repoUrl}\nTimestamp: ${new Date().toISOString()}`;
      const hexMessage = '0x' + Array.from(new TextEncoder().encode(message))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      await (window as any).ethereum.request({
        method: 'personal_sign',
        params: [hexMessage, walletAddress]
      });
    } catch (err) {
      console.warn("Signature rejected by user");
      return; // Stop if they reject the popup
    }

    setIsProcessing(true);
    setAuditResult(null);

    try {
      const txHash = await glClient.writeContract({
        address: contractAddress as `0x${string}`,
        functionName: 'request_audit',
        args: [repoUrl],
        value: 0n,
      });
      
      try {
        // We wait for FINALIZED, but if it times out and is stuck on ACCEPTED (2) or FINALIZED (3), we just catch and proceed.
        await glClient.waitForTransactionReceipt({ hash: txHash, status: TransactionStatus.FINALIZED });
      } catch (timeoutErr) {
        console.warn("Wait timeout, proceeding to read anyway:", timeoutErr);
        // Sleep for 3 seconds to let GenLayer catch up
        await new Promise(r => setTimeout(r, 3000));
      }
      
      // Fetch the result
      const data = await glClient.readContract({
        address: contractAddress as `0x${string}`,
        functionName: 'get_audit',
        args: [repoUrl],
      });

      if (data && data !== 'NOT_FOUND') {
        setAuditResult(JSON.parse(data as string));
      } else {
        alert("Audit failed to generate or is still processing on the network. Please try again in a few seconds.");
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const renderStatusIcon = (status: string) => {
    switch(status) {
      case 'SECURE': return <ShieldCheck size={48} color="var(--success)" />;
      case 'WARNING': return <ShieldAlert size={48} color="var(--warning)" />;
      case 'CRITICAL': return <Lock size={48} color="var(--danger)" />;
      default: return <Shield size={48} color="var(--primary)" />;
    }
  };

  return (
    <>
      <div className="particles-bg">
        {[...Array(20)].map((_, i) => (
          <div key={i} className="particle" style={{
            left: `${Math.random() * 100}vw`,
            top: `${Math.random() * 100}vh`,
            width: `${Math.random() * 4 + 1}px`,
            height: `${Math.random() * 4 + 1}px`,
            animationDuration: `${Math.random() * 10 + 10}s`,
            animationDelay: `${Math.random() * 5}s`
          }}></div>
        ))}
      </div>

      <nav>
        <div className="logo-container">
          <Shield size={32} color="var(--primary)" />
          <div className="logo-text"><span className="nexus">Nexus</span><span className="guard">Guard</span></div>
        </div>
        <div className="nav-links">
          <a href="#" className="nav-link">Services</a>
          <a href="#" className="nav-link">Verified</a>
          <a href="#" className="nav-link">About Us</a>
          <button 
            className={`btn-connect ${walletAddress ? 'connected' : ''}`} 
            onClick={connectWallet}
          >
            <Wallet size={16} style={{display: 'inline', marginRight: '8px', verticalAlign: 'text-bottom'}} />
            {walletAddress ? walletAddress.substring(0,6) + '...' + walletAddress.substring(38) : 'Connect Wallet'}
          </button>
        </div>
      </nav>

      <main className="hero">
        <motion.h1 
          className="hero-title"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          Securing the <span className="highlight">Web3 Ecosystem</span>
        </motion.h1>
        
        <motion.p 
          className="hero-subtitle"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          NexusGuard is a decentralized AI Smart Contract Auditor powered by GenLayer. 
          Enter a raw GitHub URL below, and our autonomous validators will dynamically fetch your code, 
          analyze it for critical vulnerabilities, and mint an immutable security report on-chain.
        </motion.p>

        <motion.div 
          className="audit-box"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          <div className="input-group">
            <input 
              type="text" 
              className="input-field" 
              placeholder="Paste Raw GitHub Code URL (e.g., https://raw.githubusercontent.com/...)"
              value={repoUrl}
              onChange={e => setRepoUrl(e.target.value)}
            />
            <button className="btn-audit" onClick={handleAudit} disabled={isProcessing}>
              <Search size={20} />
              AUDIT NOW
            </button>
          </div>
          <p style={{color: 'var(--text-muted)', fontSize: '14px', textAlign: 'left', marginTop: '10px'}}>
            * Uses GenVM gl.nondet.web.get and prompt_comparative consensus.
          </p>
          {!walletAddress && (
            <p style={{color: 'var(--danger)', fontSize: '14px', textAlign: 'left', marginTop: '5px'}}>
              * Please connect wallet to request an audit.
            </p>
          )}
        </motion.div>

        {isProcessing && (
          <div className="loader-container">
            <div className="scan-line"></div>
            <Activity size={48} color="var(--primary)" />
            <div className="pulse-text">AI Validators Scanning Codebase...</div>
          </div>
        )}

        {auditResult && !isProcessing && (
          <motion.div 
            className={`results-container ${auditResult.status.toLowerCase()}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div style={{display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '20px'}}>
              {renderStatusIcon(auditResult.status)}
              <div>
                <div className={`status-badge ${auditResult.status.toLowerCase()}`}>
                  {auditResult.status}
                </div>
                <h3 style={{fontSize: '24px', color: '#fff'}}>Audit Complete</h3>
              </div>
            </div>
            
            <div style={{marginBottom: '15px'}}>
              <strong>Target URL:</strong> <a href={auditResult.url} target="_blank" rel="noreferrer" style={{color: 'var(--primary)'}}>{auditResult.url}</a>
            </div>
            
            <div className="detail-text">
              {auditResult.details}
            </div>
          </motion.div>
        )}
      </main>
    </>
  );
}

export default App;
