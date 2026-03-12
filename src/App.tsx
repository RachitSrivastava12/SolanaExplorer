import { Analytics } from "@vercel/analytics/react";
import React, { useState, useEffect, useRef } from 'react';
import { Search, Clock, Boxes, Wallet, ArrowRightLeft, Shield, Activity, ChevronRight, ChevronDown, RefreshCw, Zap, Radio, Terminal, Hash, Cpu, Database } from 'lucide-react';
import { Connection, PublicKey } from '@solana/web3.js';
import type { Network, Block, Transaction } from './types';
import { NETWORK_ENDPOINTS, networks } from './constants';
import { TransactionDetailModal } from './components/TransactionDetailModal';
import { fetchTransactionDetails, formatTimeAgo, fetchWalletTransactions } from './utils/fetchUtils';
import { useSolanaData } from './hooks/useSolanaData';

/* ─────────────────────────────────────────
   GLOBAL STYLES
───────────────────────────────────────── */
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500;600;700&family=Orbitron:wght@400;600;700;900&display=swap');

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --sol-purple: #9945FF;
      --sol-green: #14F195;
      --sol-cyan: #00D4FF;
      --bg-void: #050508;
      --bg-deep: #080B12;
      --bg-card: #0D1117;
      --border-dim: rgba(20,241,149,0.08);
      --border-mid: rgba(20,241,149,0.18);
      --text-primary: #E8F4F0;
      --text-secondary: rgba(232,244,240,0.5);
      --text-muted: rgba(232,244,240,0.25);
      --font-mono: 'IBM Plex Mono', monospace;
      --font-display: 'Orbitron', monospace;
    }

    html, body { background: var(--bg-void); font-family: var(--font-mono); color: var(--text-primary); }

    body::before {
      content: '';
      position: fixed; inset: 0; z-index: 9999;
      background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.025) 2px, rgba(0,0,0,0.025) 4px);
      pointer-events: none;
    }

    ::-webkit-scrollbar { width: 4px; }
    ::-webkit-scrollbar-track { background: var(--bg-void); }
    ::-webkit-scrollbar-thumb { background: rgba(20,241,149,0.3); }

    @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes pulseGlow { 0%, 100% { box-shadow: 0 0 8px var(--sol-green); } 50% { box-shadow: 0 0 20px var(--sol-green), 0 0 40px rgba(20,241,149,0.3); } }
    @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
    @keyframes ticker { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
    @keyframes dataStream { from { opacity: 0; transform: translateX(-6px); } to { opacity: 1; transform: translateX(0); } }
    @keyframes glitch {
      0%, 92%, 100% { clip-path: none; transform: none; }
      93% { clip-path: polygon(0 20%, 100% 20%, 100% 40%, 0 40%); transform: translate(-2px, 0); }
      95% { clip-path: polygon(0 60%, 100% 60%, 100% 80%, 0 80%); transform: translate(2px, 0); }
      97% { clip-path: none; transform: none; }
    }
    @keyframes spinSlow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    @keyframes rowFlash { 0% { background: rgba(20,241,149,0.1); } 100% { background: transparent; } }

    .fade-in { animation: fadeIn 0.4s ease both; }
    .blink { animation: blink 1s step-end infinite; }
    .glitch { animation: glitch 8s infinite; }
    .neon-green { color: var(--sol-green); text-shadow: 0 0 12px rgba(20,241,149,0.5); }
    .neon-purple { color: var(--sol-purple); text-shadow: 0 0 12px rgba(153,69,255,0.5); }

    .grid-bg {
      background-image:
        linear-gradient(rgba(20,241,149,0.025) 1px, transparent 1px),
        linear-gradient(90deg, rgba(20,241,149,0.025) 1px, transparent 1px);
      background-size: 40px 40px;
    }

    .data-row {
      border-left: 2px solid transparent;
      transition: all 0.15s ease;
      cursor: pointer;
    }
    .data-row:hover {
      border-left-color: var(--sol-green);
      background: rgba(20,241,149,0.04) !important;
    }

    .terminal-input {
      background: transparent;
      border: none;
      color: var(--sol-green);
      font-family: var(--font-mono);
      font-size: 13px;
      caret-color: var(--sol-green);
      outline: none;
      width: 100%;
    }
    .terminal-input::placeholder { color: rgba(20,241,149,0.2); }

    .stat-num {
      font-family: var(--font-display);
      font-weight: 700;
    }

    .led-green { width: 7px; height: 7px; border-radius: 50%; background: var(--sol-green); animation: pulseGlow 2s infinite; }
    .led-yellow { width: 7px; height: 7px; border-radius: 50%; background: #FBBF24; box-shadow: 0 0 8px #FBBF24; animation: blink 1.2s ease-in-out infinite; }

    .ticker-wrap { overflow: hidden; white-space: nowrap; }
    .ticker-inner { display: inline-flex; animation: ticker 35s linear infinite; }

    .hex {
      clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
      display: flex; align-items: center; justify-content: center;
      width: 36px; height: 36px; flex-shrink: 0;
    }

    .term-divider { height: 1px; background: linear-gradient(90deg, transparent, var(--border-mid), transparent); margin: 0; }

    .empty-state { color: var(--text-muted); font-size: 11px; text-align: center; padding: 32px 0; letter-spacing: 0.12em; text-transform: uppercase; }

    .btn-exec {
      background: var(--sol-green);
      border: none;
      color: var(--bg-void);
      font-family: var(--font-display);
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      padding: 0 28px;
      cursor: pointer;
      transition: all 0.2s;
      display: flex; align-items: center; gap: 8px;
      height: 100%; flex-shrink: 0;
    }
    .btn-exec:hover { background: var(--sol-cyan); box-shadow: 0 0 28px rgba(0,212,255,0.4); }
    .btn-exec:disabled { opacity: 0.5; cursor: wait; }

    .btn-wallet {
      border: 1px solid var(--sol-purple);
      background: transparent;
      color: var(--sol-purple);
      font-family: var(--font-mono);
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      padding: 8px 16px;
      cursor: pointer;
      transition: all 0.2s;
      display: flex; align-items: center; gap: 6px;
      clip-path: polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%);
    }
    .btn-wallet:hover, .btn-wallet-connected {
      background: rgba(153,69,255,0.12);
      box-shadow: 0 0 16px rgba(153,69,255,0.25);
    }

    .panel-corner {
      position: absolute;
      width: 12px; height: 12px;
    }
  `}</style>
);

/* ─────────────────────────────────────────
   MATRIX CANVAS BG
───────────────────────────────────────── */
const MatrixCanvas = () => {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext('2d')!;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);
    const cols = Math.floor(canvas.width / 22);
    const drops = Array(cols).fill(1);
    const chars = '01アイウエカキクサシスソタチツ';
    const id = setInterval(() => {
      ctx.fillStyle = 'rgba(5,5,8,0.06)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'rgba(20,241,149,0.1)';
      ctx.font = '13px IBM Plex Mono';
      drops.forEach((y, x) => {
        ctx.fillText(chars[Math.floor(Math.random() * chars.length)], x * 22, y * 22);
        if (y * 22 > canvas.height && Math.random() > 0.975) drops[x] = 0;
        drops[x]++;
      });
    }, 90);
    return () => { clearInterval(id); window.removeEventListener('resize', resize); };
  }, []);
  return <canvas ref={ref} style={{ position: 'fixed', inset: 0, zIndex: 0, opacity: 0.3, pointerEvents: 'none' }} />;
};

/* ─────────────────────────────────────────
   TICKER BAR
───────────────────────────────────────── */
const TickerBar = ({ blocks, isLoading }: { blocks: Block[]; isLoading: boolean }) => {
  const items = blocks.length > 0
    ? blocks.flatMap(b => [`BLOCK #${b.slot.toLocaleString()} ▸ ${b.transactions} TRANSACTIONS`, `VALIDATOR ${b.validator.slice(0, 8).toUpperCase()}… ▸ CONFIRMED`])
    : ['CONNECTING TO SOLANA CLUSTER…', 'INITIALIZING BLOCK STREAM…', 'AWAITING NETWORK DATA…'];
  const doubled = [...items, ...items];
  return (
    <div style={{ background: 'rgba(20,241,149,0.04)', borderBottom: '1px solid var(--border-dim)', height: '26px', overflow: 'hidden', position: 'relative' }}>
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '60px', background: 'linear-gradient(90deg, var(--bg-void), transparent)', zIndex: 2 }} />
      <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '60px', background: 'linear-gradient(-90deg, var(--bg-void), transparent)', zIndex: 2 }} />
      <div className="ticker-wrap" style={{ height: '100%' }}>
        <div className="ticker-inner" style={{ gap: '40px', alignItems: 'center', height: '100%' }}>
          {doubled.map((item, i) => (
            <span key={i} style={{ fontSize: '9px', letterSpacing: '0.14em', color: isLoading ? 'rgba(20,241,149,0.35)' : 'rgba(20,241,149,0.6)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
              <span style={{ color: 'var(--sol-cyan)', marginRight: '8px' }}>◈</span>{item}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────
   CORNER BOX
───────────────────────────────────────── */
const CornerBox = ({ children, accent = 'var(--sol-green)', style = {} }: any) => (
  <div style={{ position: 'relative', border: '1px solid var(--border-dim)', ...style }}>
    <div style={{ position: 'absolute', top: -1, left: -1, width: 12, height: 12, borderTop: `2px solid ${accent}`, borderLeft: `2px solid ${accent}` }} />
    <div style={{ position: 'absolute', top: -1, right: -1, width: 12, height: 12, borderTop: `2px solid ${accent}`, borderRight: `2px solid ${accent}` }} />
    <div style={{ position: 'absolute', bottom: -1, left: -1, width: 12, height: 12, borderBottom: `2px solid ${accent}`, borderLeft: `2px solid ${accent}` }} />
    <div style={{ position: 'absolute', bottom: -1, right: -1, width: 12, height: 12, borderBottom: `2px solid ${accent}`, borderRight: `2px solid ${accent}` }} />
    {children}
  </div>
);

/* ─────────────────────────────────────────
   STAT CARD
───────────────────────────────────────── */
const StatCard = ({ icon, label, value, sub, accent }: any) => (
  <CornerBox accent={accent} style={{ background: 'var(--bg-card)', padding: '22px 24px', overflow: 'hidden' }}>
    <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 0% 0%, ${accent}07, transparent 65%)`, pointerEvents: 'none' }} />
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
      <div style={{ fontSize: '9px', letterSpacing: '0.22em', textTransform: 'uppercase', color: accent, fontFamily: 'var(--font-display)', opacity: 0.8 }}>{label}</div>
      <div style={{ color: accent, opacity: 0.6 }}>{icon}</div>
    </div>
    <div className="stat-num" style={{ fontSize: '20px', lineHeight: 1, marginBottom: '8px', color: accent, textShadow: `0 0 20px ${accent}40` }}>{value}</div>
    <div style={{ fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{sub}</div>
  </CornerBox>
);

/* ─────────────────────────────────────────
   PANEL
───────────────────────────────────────── */
const Panel = ({ title, icon, action, children, accent = 'var(--sol-green)' }: any) => (
  <CornerBox accent={accent} style={{ background: 'var(--bg-card)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid var(--border-dim)', background: `linear-gradient(90deg, ${accent}05, transparent)` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ color: accent }}>{icon}</div>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: accent }}>{title}</span>
      </div>
      {action}
    </div>
    <div>{children}</div>
  </CornerBox>
);

/* ─────────────────────────────────────────
   BLOCK ROW
───────────────────────────────────────── */
const BlockRow = ({ block, delay }: { block: Block; delay: number }) => (
  <div className="data-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 16px', animation: `dataStream 0.3s ease ${delay}ms both` }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <div className="hex" style={{ background: 'rgba(153,69,255,0.1)', color: 'var(--sol-purple)' }}>
        <Boxes size={13} />
      </div>
      <div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '11px', color: 'var(--sol-purple)', letterSpacing: '0.05em' }}>#{block.slot.toLocaleString()}</div>
        <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '3px', letterSpacing: '0.05em' }}>{block.timestamp ? formatTimeAgo(block.timestamp) : '—'}</div>
      </div>
    </div>
    <div style={{ textAlign: 'right' }}>
      <div style={{ fontSize: '12px', color: 'var(--sol-green)', fontWeight: 600 }}>{block.transactions} <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: '10px' }}>TXS</span></div>
      <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '3px', fontFamily: 'var(--font-mono)' }}>{block.validator.slice(0, 10)}…</div>
    </div>
  </div>
);

/* ─────────────────────────────────────────
   TX ROW
───────────────────────────────────────── */
const TxRow = ({ tx, onClick, delay }: { tx: Transaction; onClick: () => void; delay: number }) => (
  <div className="data-row" onClick={onClick} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 16px', animation: `dataStream 0.3s ease ${delay}ms both` }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <div className="hex" style={{ background: 'rgba(20,241,149,0.07)', color: 'var(--sol-green)' }}>
        <ArrowRightLeft size={13} />
      </div>
      <div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--sol-green)', letterSpacing: '0.05em' }}>
          {tx.signature.slice(0, 8)}…{tx.signature.slice(-8)}
        </div>
        <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '3px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{tx.type}</div>
      </div>
    </div>
    <div style={{ textAlign: 'right' }}>
      <div style={{ fontSize: '11px', color: 'var(--text-primary)', fontFamily: 'var(--font-display)', letterSpacing: '0.03em' }}>#{tx.slot.toLocaleString()}</div>
      <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '3px' }}>{formatTimeAgo(tx.timestamp)}</div>
    </div>
  </div>
);

/* ─────────────────────────────────────────
   SKELETON LOADING
───────────────────────────────────────── */
const LoadingRows = ({ accent }: { accent: string }) => (
  <div style={{ padding: '16px' }}>
    {[0, 80, 160].map(d => (
      <div key={d} style={{ height: '52px', background: `${accent}05`, border: `1px solid ${accent}10`, borderLeft: `2px solid ${accent}30`, marginBottom: '8px', animation: `fadeIn 0.4s ease ${d}ms both` }} />
    ))}
    <div style={{ textAlign: 'center', fontSize: '9px', color: 'var(--text-muted)', letterSpacing: '0.2em', paddingTop: '8px', textTransform: 'uppercase' }}>
      FETCHING CHAIN DATA<span className="blink">_</span>
    </div>
  </div>
);

/* ─────────────────────────────────────────
   APP
───────────────────────────────────────── */
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
    } catch (e) { console.error(e); } finally { setIsWalletConnecting(false); }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearchLoading(true); setHasSearched(true); setSearchResults([]);
    try {
      try { const d = await fetchTransactionDetails(connection, searchQuery); if (d) { setSearchResults([d]); return; } } catch {}
      try {
        const pub = new PublicKey(searchQuery);
        const sigs = await connection.getSignaturesForAddress(pub, { limit: 10 });
        if (sigs.length > 0) {
          const txs: Transaction[] = [];
          for (const s of sigs) { const d = await fetchTransactionDetails(connection, s.signature); if (d) txs.push(d); }
          setSearchResults(txs); return;
        }
      } catch {}
      try {
        const n = parseInt(searchQuery);
        if (!isNaN(n)) {
          const bi = await connection.getBlock(n, { maxSupportedTransactionVersion: 0 });
          if (bi) {
            const txs: Transaction[] = [];
            for (let i = 0; i < Math.min(5, bi.transactions.length); i++) { const d = await fetchTransactionDetails(connection, bi.transactions[i].transaction.signatures[0]); if (d) txs.push(d); }
            setSearchResults(txs);
          }
        }
      } catch {}
    } catch (e) { console.error(e); } finally { setIsSearchLoading(false); }
  };

  return (
    <>
      <GlobalStyles />
      <MatrixCanvas />

      <div className="grid-bg" style={{ minHeight: '100vh', position: 'relative', zIndex: 1 }}>

        {/* ── HEADER ── */}
        <header style={{ background: 'rgba(5,5,8,0.9)', backdropFilter: 'blur(24px)', borderBottom: '1px solid var(--border-dim)', position: 'sticky', top: 0, zIndex: 30 }}>
          <TickerBar blocks={recentBlocks} isLoading={isLoading} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 32px', flexWrap: 'wrap', gap: '12px' }}>
            {/* Logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: 38, height: 38, background: 'rgba(20,241,149,0.07)', border: '1px solid rgba(20,241,149,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}>
                <img src="https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png" alt="" style={{ width: 22, height: 22 }} />
              </div>
              <div>
                <div className="glitch neon-green" style={{ fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: 900, letterSpacing: '0.15em', lineHeight: 1 }}>
                  SOL/SCAN
                </div>
                <div style={{ fontSize: '9px', color: 'var(--text-muted)', letterSpacing: '0.25em', marginTop: '3px', textTransform: 'uppercase' }}>Chain Explorer</div>
              </div>
            </div>

            {/* Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              {/* Live indicator */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', border: '1px solid var(--border-dim)', background: 'var(--bg-card)' }}>
                {isLoading ? <div className="led-yellow" /> : <div className="led-green" />}
                <span style={{ fontSize: '9px', color: isLoading ? '#FBBF24' : 'var(--sol-green)', letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 700 }}>
                  {isLoading ? 'SYNCING' : 'LIVE'}
                </span>
              </div>

              {/* TPS */}
              <div style={{ padding: '6px 12px', border: '1px solid var(--border-dim)', background: 'var(--bg-card)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Zap size={11} color="var(--sol-cyan)" />
                <span style={{ fontSize: '9px', color: 'var(--sol-cyan)', letterSpacing: '0.12em', fontWeight: 700 }}>{tps.toLocaleString()} TPS</span>
              </div>

              {/* Network */}
              <div style={{ position: 'relative' }}>
                <button onClick={() => setIsNetworkDropdownOpen(!isNetworkDropdownOpen)}
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border-mid)', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '10px', padding: '6px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', letterSpacing: '0.08em', transition: 'all 0.2s' }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: selectedNetwork === 'mainnet-beta' ? '#14F195' : selectedNetwork === 'testnet' ? '#FBBF24' : '#9945FF', boxShadow: `0 0 6px currentColor` }} />
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: '9px', letterSpacing: '0.1em' }}>{networks[selectedNetwork].name.toUpperCase()}</span>
                  <ChevronDown size={10} style={{ transition: 'transform 0.2s', transform: isNetworkDropdownOpen ? 'rotate(180deg)' : 'none' }} />
                </button>
                {isNetworkDropdownOpen && (
                  <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '4px', background: 'rgba(8,11,18,0.98)', border: '1px solid var(--border-mid)', minWidth: '160px', zIndex: 50, boxShadow: '0 20px 60px rgba(0,0,0,0.8)' }}>
                    {Object.entries(networks).map(([key, { name }]) => (
                      <button key={key} onClick={() => handleNetworkChange(key as Network)}
                        style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px 14px', background: selectedNetwork === key ? 'rgba(20,241,149,0.05)' : 'transparent', border: 'none', borderBottom: '1px solid var(--border-dim)', cursor: 'pointer', fontFamily: 'var(--font-display)', fontSize: '9px', letterSpacing: '0.12em', color: selectedNetwork === key ? 'var(--sol-green)' : 'var(--text-muted)', textAlign: 'left', textTransform: 'uppercase' }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: key === 'mainnet-beta' ? '#14F195' : key === 'testnet' ? '#FBBF24' : '#9945FF' }} />
                        {name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Wallet */}
              <button className={`btn-wallet ${connectedWallet ? 'btn-wallet-connected' : ''}`} onClick={handleConnectWallet} disabled={isWalletConnecting}>
                <Wallet size={12} />
                {connectedWallet ? `${connectedWallet.slice(0, 4)}…${connectedWallet.slice(-4)}` : isWalletConnecting ? 'CONNECTING…' : 'CONNECT WALLET'}
              </button>
            </div>
          </div>
        </header>

        {/* ── HERO ── */}
        <section style={{ padding: '72px 32px 56px', maxWidth: '860px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', justifyContent: 'center' }}>
            <div style={{ height: '1px', flex: 1, background: 'linear-gradient(90deg, transparent, rgba(20,241,149,0.3))' }} />
            <span style={{ fontSize: '9px', color: 'var(--sol-green)', letterSpacing: '0.35em', textTransform: 'uppercase', fontFamily: 'var(--font-display)' }}>◈ SOLANA NETWORK EXPLORER ◈</span>
            <div style={{ height: '1px', flex: 1, background: 'linear-gradient(-90deg, transparent, rgba(20,241,149,0.3))' }} />
          </div>

          <h1 className="fade-in" style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(30px, 6vw, 58px)', fontWeight: 900, textAlign: 'center', letterSpacing: '0.06em', lineHeight: 1.05, marginBottom: '16px' }}>
            <span style={{ color: 'var(--text-primary)' }}>EXPLORE</span>{' '}
            <span className="neon-green">THE CHAIN</span>
          </h1>
          <p style={{ textAlign: 'center', fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: '44px', animation: 'fadeIn 0.4s 0.1s ease both' }}>
            TRANSACTIONS · BLOCKS · ADDRESSES · VALIDATORS · TOKENS
          </p>

          {/* Search */}
          <div style={{ animation: 'fadeIn 0.4s 0.2s ease both' }}>
            <CornerBox accent="var(--sol-green)" style={{ height: '56px', display: 'flex', background: 'var(--bg-card)', boxShadow: '0 0 60px rgba(20,241,149,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', padding: '0 16px', borderRight: '1px solid var(--border-dim)', flexShrink: 0 }}>
                <Terminal size={15} color="var(--sol-green)" />
              </div>
              <input
                className="terminal-input"
                style={{ flex: 1, padding: '0 16px', height: '100%' }}
                placeholder="[ ENTER TX SIGNATURE / WALLET ADDRESS / BLOCK NUMBER ]"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && handleSearch()}
              />
              <button className="btn-exec" onClick={handleSearch} disabled={isSearchLoading}>
                {isSearchLoading
                  ? <><RefreshCw size={12} style={{ animation: 'spinSlow 0.8s linear infinite' }} />SCANNING</>
                  : <><Search size={12} />EXECUTE</>
                }
              </button>
            </CornerBox>
          </div>
        </section>

        <div style={{ maxWidth: '1260px', margin: '0 auto', padding: '0 32px' }}>

          {/* ── SEARCH RESULTS ── */}
          {hasSearched && (
            <div style={{ marginBottom: '24px' }}>
              <Panel title={`QUERY RESULTS [${searchResults.length}]`} icon={<Hash size={13} />} accent="var(--sol-cyan)"
                action={<span style={{ fontSize: '9px', color: 'var(--text-muted)', letterSpacing: '0.1em', fontFamily: 'var(--font-mono)' }}>{searchQuery.slice(0, 18)}…</span>}>
                {isSearchLoading ? <LoadingRows accent="var(--sol-cyan)" /> :
                  searchResults.length > 0
                    ? searchResults.map((tx, i) => <TxRow key={i} tx={tx} onClick={() => setSelectedTransaction(tx)} delay={i * 50} />)
                    : <div className="empty-state">NO RECORDS FOUND ON {selectedNetwork.toUpperCase()}<span className="blink">_</span></div>
                }
              </Panel>
            </div>
          )}

          {/* ── WALLET ACTIVITY ── */}
          {connectedWallet && (
            <div style={{ marginBottom: '24px' }}>
              <Panel title="WALLET ACTIVITY" icon={<Wallet size={13} />} accent="var(--sol-purple)"
                action={
                  <button onClick={() => fetchWalletTransactions(connection, connectedWallet, setWalletTransactions, setIsWalletTxLoading)}
                    disabled={isWalletTxLoading}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '9px', color: 'var(--sol-purple)', letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
                    <RefreshCw size={10} style={{ animation: isWalletTxLoading ? 'spinSlow 0.8s linear infinite' : 'none' }} />REFRESH
                  </button>
                }>
                {isWalletTxLoading ? <LoadingRows accent="var(--sol-purple)" /> :
                  walletTransactions.length > 0
                    ? walletTransactions.map((tx, i) => <TxRow key={i} tx={tx} onClick={() => setSelectedTransaction(tx)} delay={i * 50} />)
                    : <div className="empty-state">NO TRANSACTIONS FOUND<span className="blink">_</span></div>
                }
              </Panel>
            </div>
          )}

          {/* ── STATS ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <StatCard icon={<Cpu size={15} />} label="Latest Block" value={`#${recentBlocks[0]?.slot.toLocaleString() || '———'}`} sub={recentBlocks[0]?.timestamp ? formatTimeAgo(recentBlocks[0].timestamp) : 'awaiting data'} accent="var(--sol-green)" />
            <StatCard icon={<Database size={15} />} label="Block Transactions" value={recentBlocks[0]?.transactions.toLocaleString() || '———'} sub="latest confirmed" accent="var(--sol-purple)" />
            <StatCard icon={<Shield size={15} />} label="Active Validator" value={recentBlocks[0]?.validator ? recentBlocks[0].validator.slice(0, 10) + '…' : '———'} sub="current epoch node" accent="var(--sol-cyan)" />
          </div>

          {/* ── LIVE FEED ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '64px' }}>
            <Panel title="BLOCK STREAM" icon={<Radio size={13} />} accent="var(--sol-purple)"
              action={<button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '9px', letterSpacing: '0.12em', display: 'flex', alignItems: 'center', gap: '4px', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}><ChevronRight size={10} />VIEW ALL</button>}>
              {isLoading ? <LoadingRows accent="var(--sol-purple)" /> :
                recentBlocks.length > 0
                  ? recentBlocks.map((b, i) => <BlockRow key={i} block={b} delay={i * 40} />)
                  : <div className="empty-state">AWAITING BLOCK DATA<span className="blink">_</span></div>
              }
            </Panel>

            <Panel title="TX STREAM" icon={<Activity size={13} />} accent="var(--sol-green)"
              action={<button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '9px', letterSpacing: '0.12em', display: 'flex', alignItems: 'center', gap: '4px', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}><ChevronRight size={10} />VIEW ALL</button>}>
              {isLoading ? <LoadingRows accent="var(--sol-green)" /> :
                recentTransactions.length > 0
                  ? recentTransactions.map((tx, i) => <TxRow key={i} tx={tx} onClick={() => setSelectedTransaction(tx)} delay={i * 40} />)
                  : <div className="empty-state">AWAITING TX DATA<span className="blink">_</span></div>
              }
            </Panel>
          </div>
        </div>

        {/* ── FOOTER ── */}
        <footer style={{ borderTop: '1px solid var(--border-dim)', background: 'rgba(5,5,8,0.96)', padding: '48px 32px' }}>
          <div style={{ maxWidth: '1260px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
            <div className="neon-green" style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 900, letterSpacing: '0.2em', textAlign: 'center' }}>
              BUILD. SHIP. REPEAT.
            </div>
            <div className="term-divider" style={{ width: '100%' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <img src="https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png" alt="" style={{ width: 14, height: 14, opacity: 0.5 }} />
              <span style={{ fontSize: '9px', color: 'var(--text-muted)', letterSpacing: '0.3em', textTransform: 'uppercase', fontFamily: 'var(--font-display)' }}>SOLANA IS FOR EVERYONE</span>
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '0.1em' }}>
              CRAFTED BY RACHIT ·{' '}
              <a href="https://x.com/Rachit_twts" target="_blank" rel="noopener noreferrer"
                style={{ color: 'var(--sol-purple)', textDecoration: 'none', fontWeight: 600 }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--sol-green)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--sol-purple)')}>
                @RACHIT_TWTS
              </a>
            </div>
          </div>
        </footer>

      </div>

      {selectedTransaction && (
        <TransactionDetailModal transaction={selectedTransaction} onClose={() => setSelectedTransaction(null)} />
      )}
      <Analytics />
    </>
  );
}

export default App;
