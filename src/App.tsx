import { Analytics } from "@vercel/analytics/react";
import React, { useState, useEffect, useRef } from 'react';
import { Search, Clock, Boxes, Wallet, ArrowRightLeft, Shield, Activity, ChevronRight, ChevronDown, RefreshCw, Zap, Globe, TrendingUp } from 'lucide-react';
import { Connection, PublicKey } from '@solana/web3.js';
import type { Network, Block, Transaction } from './types';
import { NETWORK_ENDPOINTS, networks } from './constants';
import { StatsCard } from './components/StatsCard';
import { TransactionDetailModal } from './components/TransactionDetailModal';
import { fetchTransactionDetails, formatTimeAgo, fetchWalletTransactions } from './utils/fetchUtils';
import { useSolanaData } from './hooks/useSolanaData';

// Animated particle background
const ParticleField = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const particles: { x: number; y: number; vx: number; vy: number; size: number; alpha: number; hue: number }[] = [];
    for (let i = 0; i < 80; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        size: Math.random() * 1.5 + 0.5,
        alpha: Math.random() * 0.5 + 0.1,
        hue: Math.random() > 0.5 ? 270 : 180,
      });
    }
    let animId: number;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 80%, 65%, ${p.alpha})`;
        ctx.fill();
        // Draw connections
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[j].x - p.x;
          const dy = particles[j].y - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `hsla(270, 80%, 65%, ${0.08 * (1 - dist / 120)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      });
      animId = requestAnimationFrame(animate);
    };
    animate();
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', handleResize); };
  }, []);
  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" style={{ opacity: 0.6 }} />;
};

// Glowing orb decoration
const GlowOrb = ({ color, size, top, left, blur }: any) => (
  <div className="fixed pointer-events-none z-0" style={{
    top, left, width: size, height: size,
    borderRadius: '50%',
    background: color,
    filter: `blur(${blur})`,
    opacity: 0.15,
  }} />
);

// Pulse dot
const PulseDot = ({ active }: { active: boolean }) => (
  <span className="relative flex h-2.5 w-2.5">
    {active && <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: 'linear-gradient(135deg, #14F195, #9945FF)' }} />}
    <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ background: active ? '#14F195' : '#facc15' }} />
  </span>
);

// Animated number
const AnimatedValue = ({ value }: { value: string }) => (
  <span className="font-mono tabular-nums transition-all duration-500">{value}</span>
);

// Block row
const BlockRow = ({ block, index }: { block: Block; index: number }) => (
  <div
    className="group flex items-center justify-between px-4 py-3.5 rounded-xl transition-all duration-200 cursor-pointer"
    style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.06)',
      animationDelay: `${index * 60}ms`,
    }}
    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(153,69,255,0.08)')}
    onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
  >
    <div className="flex items-center gap-3">
      <div className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'rgba(153,69,255,0.15)', border: '1px solid rgba(153,69,255,0.3)' }}>
        <Boxes className="w-4 h-4" style={{ color: '#9945FF' }} />
      </div>
      <div>
        <div className="text-white font-mono text-sm font-semibold tracking-tight">#{block.slot.toLocaleString()}</div>
        <div className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{block.timestamp ? formatTimeAgo(block.timestamp) : '—'}</div>
      </div>
    </div>
    <div className="text-right">
      <div className="text-sm font-semibold" style={{ color: '#14F195' }}>{block.transactions} txns</div>
      <div className="text-xs font-mono mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>{block.validator.slice(0, 8)}…</div>
    </div>
  </div>
);

// Transaction row
const TxRow = ({ tx, onClick, index }: { tx: Transaction; onClick: () => void; index: number }) => (
  <div
    className="group flex items-center justify-between px-4 py-3.5 rounded-xl transition-all duration-200 cursor-pointer"
    style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.06)',
      animationDelay: `${index * 60}ms`,
    }}
    onClick={onClick}
    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(20,241,149,0.06)')}
    onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
  >
    <div className="flex items-center gap-3">
      <div className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'rgba(20,241,149,0.1)', border: '1px solid rgba(20,241,149,0.25)' }}>
        <ArrowRightLeft className="w-4 h-4" style={{ color: '#14F195' }} />
      </div>
      <div>
        <div className="text-white font-mono text-sm font-semibold tracking-tight">
          {tx.signature.slice(0, 6)}…{tx.signature.slice(-6)}
        </div>
        <div className="text-xs mt-0.5 capitalize" style={{ color: 'rgba(255,255,255,0.4)' }}>{tx.type}</div>
      </div>
    </div>
    <div className="text-right">
      <div className="text-sm font-semibold text-white">Slot #{tx.slot.toLocaleString()}</div>
      <div className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>{formatTimeAgo(tx.timestamp)}</div>
    </div>
  </div>
);

// Panel wrapper
const Panel = ({ title, action, children, icon }: any) => (
  <div className="rounded-2xl overflow-hidden flex flex-col" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)' }}>
    <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="flex items-center gap-2.5">
        {icon}
        <span className="text-base font-bold text-white tracking-tight">{title}</span>
      </div>
      {action}
    </div>
    <div className="flex-1 overflow-hidden p-4 space-y-2.5">{children}</div>
  </div>
);

function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNetwork, setSelectedNetwork] = useState<Network>('devnet');
  const [isNetworkDropdownOpen, setIsNetworkDropdownOpen] = useState(false);
  const [isWalletConnecting, setIsWalletConnecting] = useState(false);
  const [connection, setConnection] = useState<Connection>(() =>
    new Connection(NETWORK_ENDPOINTS['devnet'], { commitment: 'confirmed', confirmTransactionInitialTimeout: 60000 })
  );
  const [recentBlocks, setRecentBlocks] = useState<Block[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [walletTransactions, setWalletTransactions] = useState<Transaction[]>([]);
  const [tps, setTps] = useState<number>(0);
  const [connectedWallet, setConnectedWallet] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [isWalletTxLoading, setIsWalletTxLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<Transaction[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [searchFocused, setSearchFocused] = useState(false);

  useSolanaData(connection, setRecentBlocks, setRecentTransactions, retryCount, setRetryCount, setIsLoading);

  useEffect(() => {
    fetchWalletTransactions(connection, connectedWallet, setWalletTransactions, setIsWalletTxLoading);
  }, [connectedWallet, connection]);

  const handleNetworkChange = (network: Network) => {
    setSelectedNetwork(network);
    setIsNetworkDropdownOpen(false);
    setIsLoading(true);
    setConnection(new Connection(NETWORK_ENDPOINTS[network], { commitment: 'confirmed', confirmTransactionInitialTimeout: 60000 }));
  };

  const handleConnectWallet = async () => {
    if (connectedWallet) { setConnectedWallet(null); setWalletTransactions([]); return; }
    setIsWalletConnecting(true);
    try {
      const { solana } = window as any;
      if (!solana?.isPhantom) { window.open('https://phantom.app/', '_blank'); return; }
      const response = await solana.connect();
      setConnectedWallet(response.publicKey.toString());
    } catch (error) { console.error('Error connecting wallet:', error); }
    finally { setIsWalletConnecting(false); }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearchLoading(true); setHasSearched(true); setSearchResults([]);
    try {
      try {
        const txDetails = await fetchTransactionDetails(connection, searchQuery);
        if (txDetails) { setSearchResults([txDetails]); return; }
      } catch {}
      try {
        const pubKey = new PublicKey(searchQuery);
        const signatures = await connection.getSignaturesForAddress(pubKey, { limit: 10 });
        if (signatures.length > 0) {
          const txs: Transaction[] = [];
          for (const sig of signatures) { const d = await fetchTransactionDetails(connection, sig.signature); if (d) txs.push(d); }
          setSearchResults(txs); return;
        }
      } catch {}
      try {
        const blockNum = parseInt(searchQuery);
        if (!isNaN(blockNum)) {
          const blockInfo = await connection.getBlock(blockNum, { maxSupportedTransactionVersion: 0 });
          if (blockInfo) {
            const blockTxs: Transaction[] = [];
            for (let i = 0; i < Math.min(5, blockInfo.transactions.length); i++) {
              const d = await fetchTransactionDetails(connection, blockInfo.transactions[i].transaction.signatures[0]);
              if (d) blockTxs.push(d);
            }
            setSearchResults(blockTxs);
          }
        }
      } catch {}
    } catch (error) { console.error('Search error:', error); }
    finally { setIsSearchLoading(false); }
  };

  return (
    <>
      {/* Global styles */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Syne:wght@400;600;700;800&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; font-family: 'Syne', sans-serif; }
        .sol-font { font-family: 'Space Mono', monospace; }
        .syne { font-family: 'Syne', sans-serif; }
        @keyframes fadeSlideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes glowPulse { 0%,100% { opacity: 0.6; } 50% { opacity: 1; } }
        @keyframes scanline { 0% { transform: translateY(-100%); } 100% { transform: translateY(100vh); } }
        @keyframes shimmer { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
        .fade-up { animation: fadeSlideUp 0.5s ease forwards; }
        .glow-pulse { animation: glowPulse 3s ease-in-out infinite; }
        .gradient-text {
          background: linear-gradient(135deg, #14F195 0%, #9945FF 60%, #00C2FF 100%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
        }
        .shimmer-text {
          background: linear-gradient(90deg, #9945FF 0%, #14F195 30%, #9945FF 60%, #00C2FF 80%, #9945FF 100%);
          background-size: 200% auto;
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
          animation: shimmer 4s linear infinite;
        }
        .glass { background: rgba(255,255,255,0.04); backdrop-filter: blur(24px); border: 1px solid rgba(255,255,255,0.09); }
        .search-glow { box-shadow: 0 0 0 1px rgba(153,69,255,0.6), 0 0 30px rgba(153,69,255,0.2), 0 0 60px rgba(20,241,149,0.08); }
        .stat-card { transition: all 0.25s ease; }
        .stat-card:hover { transform: translateY(-3px); box-shadow: 0 20px 60px rgba(153,69,255,0.15); }
        ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: rgba(153,69,255,0.4); border-radius: 3px; }
      `}</style>

      <div className="min-h-screen relative" style={{ background: '#08090e', fontFamily: 'Syne, sans-serif' }}>
        {/* Background effects */}
        <ParticleField />
        <GlowOrb color="radial-gradient(circle, #9945FF, transparent)" size="600px" top="-150px" left="-100px" blur="120px" />
        <GlowOrb color="radial-gradient(circle, #14F195, transparent)" size="500px" top="40%" left="70%" blur="120px" />
        <GlowOrb color="radial-gradient(circle, #00C2FF, transparent)" size="400px" top="80%" left="20%" blur="100px" />

        {/* HEADER */}
        <header className="sticky top-0 z-30" style={{ background: 'rgba(8,9,14,0.85)', backdropFilter: 'blur(32px)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              {/* Logo */}
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center overflow-hidden" style={{ background: 'linear-gradient(135deg, #9945FF, #14F195)' }}>
                    <img src="https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png" alt="" className="w-6 h-6" />
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2" style={{ background: '#14F195', borderColor: '#08090e' }} />
                </div>
                <div>
                  <div className="text-white font-bold text-lg leading-none syne tracking-tight">SolScan<span className="shimmer-text">Pro</span></div>
                  <div className="text-xs leading-none mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>Blockchain Explorer</div>
                </div>
              </div>

              {/* Right controls */}
              <div className="flex items-center gap-3">
                {/* Network status pill */}
                <div className="hidden md:flex items-center gap-2 px-3 py-2 rounded-full" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <PulseDot active={!isLoading} />
                  <span className="text-xs font-medium" style={{ color: isLoading ? '#facc15' : '#14F195' }}>{isLoading ? 'Syncing' : 'Live'}</span>
                </div>

                {/* TPS display */}
                <div className="hidden lg:flex items-center gap-2 px-3 py-2 rounded-full" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <Zap className="w-3.5 h-3.5" style={{ color: '#9945FF' }} />
                  <span className="text-xs font-bold sol-font" style={{ color: '#9945FF' }}>{tps.toLocaleString()} TPS</span>
                </div>

                {/* Network selector */}
                <div className="relative">
                  <button
                    onClick={() => setIsNetworkDropdownOpen(!isNetworkDropdownOpen)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition-all"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full ${networks[selectedNetwork].className}`} />
                    <span>{networks[selectedNetwork].name}</span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isNetworkDropdownOpen ? 'rotate-180' : ''}`} style={{ color: 'rgba(255,255,255,0.5)' }} />
                  </button>
                  {isNetworkDropdownOpen && (
                    <div className="absolute top-full mt-2 right-0 w-44 rounded-xl overflow-hidden z-50" style={{ background: 'rgba(14,15,22,0.97)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(24px)', boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }}>
                      {Object.entries(networks).map(([key, { name, className }]) => (
                        <button key={key} onClick={() => handleNetworkChange(key as Network)}
                          className="flex items-center gap-2.5 w-full px-4 py-3 text-sm font-semibold text-white transition-all"
                          style={{ background: selectedNetwork === key ? 'rgba(153,69,255,0.15)' : 'transparent' }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                          onMouseLeave={e => (e.currentTarget.style.background = selectedNetwork === key ? 'rgba(153,69,255,0.15)' : 'transparent')}
                        >
                          <div className={`w-2 h-2 rounded-full ${className}`} />
                          {name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Wallet button */}
                <button
                  onClick={handleConnectWallet}
                  disabled={isWalletConnecting}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all"
                  style={{
                    background: connectedWallet ? 'rgba(20,241,149,0.12)' : 'linear-gradient(135deg, #9945FF, #7a37cc)',
                    border: connectedWallet ? '1px solid rgba(20,241,149,0.3)' : '1px solid transparent',
                    color: connectedWallet ? '#14F195' : '#fff',
                    boxShadow: connectedWallet ? 'none' : '0 4px 20px rgba(153,69,255,0.35)',
                  }}
                >
                  <Wallet className="w-4 h-4" />
                  <span>
                    {connectedWallet ? `${connectedWallet.slice(0, 4)}…${connectedWallet.slice(-4)}` : isWalletConnecting ? 'Connecting…' : 'Connect'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* HERO SEARCH SECTION */}
        <div className="relative z-10 pt-16 pb-12 px-6">
          <div className="max-w-3xl mx-auto text-center fade-up">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6" style={{ background: 'rgba(153,69,255,0.12)', border: '1px solid rgba(153,69,255,0.25)' }}>
              <Globe className="w-3.5 h-3.5" style={{ color: '#9945FF' }} />
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#9945FF' }}>Solana Blockchain Explorer</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-extrabold text-white mb-3 leading-none syne">
              Explore the Chain
            </h1>
            <p className="text-lg mb-10" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Search transactions, addresses, blocks & tokens in real-time
            </p>

            {/* Search bar */}
            <div className="relative">
              <div className={`relative rounded-2xl transition-all duration-300 ${searchFocused ? 'search-glow' : ''}`} style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${searchFocused ? 'rgba(153,69,255,0.5)' : 'rgba(255,255,255,0.1)'}` }}>
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: searchFocused ? '#9945FF' : 'rgba(255,255,255,0.3)' }} />
                <input
                  type="text"
                  placeholder="Search address, transaction, block, or token…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                  className="w-full pl-14 pr-36 py-5 text-base rounded-2xl bg-transparent text-white outline-none sol-font"
                  style={{ caretColor: '#9945FF', '::placeholder': { color: 'rgba(255,255,255,0.3)' } } as any}
                />
                <button
                  onClick={handleSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all"
                  style={{ background: 'linear-gradient(135deg, #9945FF, #14F195)', color: '#fff', boxShadow: '0 4px 16px rgba(153,69,255,0.4)' }}
                >
                  {isSearchLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : 'Search'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* SEARCH RESULTS */}
        {hasSearched && (
          <div className="container mx-auto px-6 mb-8 z-10 relative fade-up">
            <Panel
              title="Search Results"
              icon={<Search className="w-4 h-4" style={{ color: '#9945FF' }} />}
              action={<span className="text-xs font-bold sol-font" style={{ color: 'rgba(255,255,255,0.3)' }}>{searchResults.length} found</span>}
            >
              {isSearchLoading ? (
                <div className="flex items-center justify-center py-10 gap-3">
                  <RefreshCw className="w-5 h-5 animate-spin" style={{ color: '#9945FF' }} />
                  <span style={{ color: 'rgba(255,255,255,0.5)' }}>Searching the chain…</span>
                </div>
              ) : searchResults.length > 0 ? (
                searchResults.map((tx, i) => <TxRow key={i} tx={tx} onClick={() => setSelectedTransaction(tx)} index={i} />)
              ) : (
                <div className="text-center py-10" style={{ color: 'rgba(255,255,255,0.3)' }}>No results found for this query.</div>
              )}
            </Panel>
          </div>
        )}

        {/* WALLET TRANSACTIONS */}
        {connectedWallet && (
          <div className="container mx-auto px-6 mb-8 z-10 relative">
            <Panel
              title="Your Transactions"
              icon={<Wallet className="w-4 h-4" style={{ color: '#14F195' }} />}
              action={
                <button onClick={() => fetchWalletTransactions(connection, connectedWallet, setWalletTransactions, setIsWalletTxLoading)} disabled={isWalletTxLoading}
                  className="flex items-center gap-2 text-sm font-semibold transition-colors" style={{ color: '#14F195' }}>
                  <RefreshCw className={`w-3.5 h-3.5 ${isWalletTxLoading ? 'animate-spin' : ''}`} />Refresh
                </button>
              }
            >
              {isWalletTxLoading ? (
                <div className="text-center py-8" style={{ color: 'rgba(255,255,255,0.4)' }}>Loading transactions…</div>
              ) : walletTransactions.length > 0 ? (
                walletTransactions.map((tx, i) => <TxRow key={i} tx={tx} onClick={() => setSelectedTransaction(tx)} index={i} />)
              ) : (
                <div className="text-center py-8" style={{ color: 'rgba(255,255,255,0.3)' }}>No recent transactions found for this wallet.</div>
              )}
            </Panel>
          </div>
        )}

        {/* STATS GRID */}
        <div className="container mx-auto px-6 mb-8 z-10 relative">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                icon: <Clock className="w-5 h-5" />,
                label: 'Latest Block',
                value: `#${recentBlocks[0]?.slot.toLocaleString() || '—'}`,
                sub: recentBlocks[0]?.timestamp ? formatTimeAgo(recentBlocks[0].timestamp) : '—',
                color: '#9945FF',
                bg: 'rgba(153,69,255,0.1)',
                border: 'rgba(153,69,255,0.2)',
              },
              {
                icon: <ArrowRightLeft className="w-5 h-5" />,
                label: 'Transactions',
                value: recentBlocks[0]?.transactions.toLocaleString() || '—',
                sub: 'Latest block',
                color: '#14F195',
                bg: 'rgba(20,241,149,0.1)',
                border: 'rgba(20,241,149,0.2)',
              },
              {
                icon: <Shield className="w-5 h-5" />,
                label: 'Active Validator',
                value: recentBlocks[0]?.validator ? recentBlocks[0].validator.slice(0, 8) + '…' : '—',
                sub: 'Current node',
                color: '#00C2FF',
                bg: 'rgba(0,194,255,0.1)',
                border: 'rgba(0,194,255,0.2)',
              },
            ].map((stat, i) => (
              <div key={i} className="stat-card rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid rgba(255,255,255,0.07)`, backdropFilter: 'blur(20px)' }}>
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: stat.bg, border: `1px solid ${stat.border}`, color: stat.color }}>
                    {stat.icon}
                  </div>
                  <TrendingUp className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.2)' }} />
                </div>
                <div className="text-2xl font-extrabold text-white syne mb-1">{stat.value}</div>
                <div className="text-sm font-medium mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>{stat.label}</div>
                <div className="text-xs sol-font" style={{ color: stat.color }}>{stat.sub}</div>
              </div>
            ))}
          </div>
        </div>

        {/* RECENT ACTIVITY GRID */}
        <div className="container mx-auto px-6 pb-20 z-10 relative">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Panel
              title="Recent Blocks"
              icon={<Boxes className="w-4 h-4" style={{ color: '#9945FF' }} />}
              action={
                <button className="flex items-center gap-1 text-sm font-semibold transition-colors" style={{ color: 'rgba(255,255,255,0.35)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#9945FF')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.35)')}>
                  View All <ChevronRight className="w-4 h-4" />
                </button>
              }
            >
              {isLoading ? (
                <div className="flex items-center justify-center py-10 gap-3">
                  <RefreshCw className="w-4 h-4 animate-spin" style={{ color: '#9945FF' }} />
                  <span style={{ color: 'rgba(255,255,255,0.4)' }}>Loading blocks…</span>
                </div>
              ) : recentBlocks.length > 0 ? (
                recentBlocks.map((block, i) => <BlockRow key={i} block={block} index={i} />)
              ) : (
                <div className="text-center py-8" style={{ color: 'rgba(255,255,255,0.3)' }}>No blocks available</div>
              )}
            </Panel>

            <Panel
              title="Recent Transactions"
              icon={<ArrowRightLeft className="w-4 h-4" style={{ color: '#14F195' }} />}
              action={
                <button className="flex items-center gap-1 text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.35)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#14F195')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.35)')}>
                  View All <ChevronRight className="w-4 h-4" />
                </button>
              }
            >
              {isLoading ? (
                <div className="flex items-center justify-center py-10 gap-3">
                  <RefreshCw className="w-4 h-4 animate-spin" style={{ color: '#14F195' }} />
                  <span style={{ color: 'rgba(255,255,255,0.4)' }}>Loading transactions…</span>
                </div>
              ) : recentTransactions.length > 0 ? (
                recentTransactions.map((tx, i) => <TxRow key={i} tx={tx} onClick={() => setSelectedTransaction(tx)} index={i} />)
              ) : (
                <div className="text-center py-8" style={{ color: 'rgba(255,255,255,0.3)' }}>No transactions available</div>
              )}
            </Panel>
          </div>
        </div>

        {/* TRANSACTION MODAL */}
        {selectedTransaction && (
          <TransactionDetailModal transaction={selectedTransaction} onClose={() => setSelectedTransaction(null)} />
        )}

        {/* FOOTER */}
        <footer className="relative z-10" style={{ background: 'rgba(8,9,14,0.95)', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="container mx-auto px-6 py-12">
            <div className="flex flex-col items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #9945FF, #14F195)' }}>
                  <img src="https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png" alt="" className="w-6 h-6" />
                </div>
                <div className="text-2xl font-extrabold syne shimmer-text">SolScanPro</div>
              </div>

              <div className="text-4xl font-extrabold syne text-white tracking-tight text-center">
                Build. <span className="gradient-text">Ship.</span> Repeat.
              </div>

              <div className="flex items-center gap-2 px-4 py-2 rounded-full" style={{ background: 'rgba(153,69,255,0.1)', border: '1px solid rgba(153,69,255,0.2)' }}>
                <img src="https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png" alt="" className="w-4 h-4" />
                <span className="text-sm font-bold uppercase tracking-widest" style={{ color: '#9945FF' }}>Solana is for everyone</span>
              </div>

              <div className="flex items-center gap-6 text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
                <span>Made with ❤️ by Rachit</span>
                <a href="https://x.com/Rachit_twts" target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 transition-colors font-semibold"
                  style={{ color: '#9945FF' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#14F195')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#9945FF')}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                  @Rachit_twts
                </a>
              </div>
            </div>
          </div>
        </footer>

        <Analytics />
      </div>
    </>
  );
}

export default App;
