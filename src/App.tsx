import { Analytics } from "@vercel/analytics/react";
import React, { useState,  useEffect } from 'react';
import { Search, Clock, Boxes, Wallet, ArrowRightLeft, Shield, Activity, ChevronRight, ChevronDown, RefreshCw } from 'lucide-react';
import { Connection, PublicKey } from '@solana/web3.js';
import type { Network, Block, Transaction } from './types';
import { NETWORK_ENDPOINTS, networks } from './constants';
import { StatsCard } from './components/StatsCard';
import { TransactionDetailModal } from './components/TransactionDetailModal';
import { fetchTransactionDetails, formatTimeAgo, fetchWalletTransactions } from './utils/fetchUtils';
import { useSolanaData } from './hooks/useSolanaData';

function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNetwork, setSelectedNetwork] = useState<Network>('devnet');
  const [isNetworkDropdownOpen, setIsNetworkDropdownOpen] = useState(false);
  const [isWalletConnecting, setIsWalletConnecting] = useState(false);
  const [connection, setConnection] = useState<Connection>(() =>
    new Connection(NETWORK_ENDPOINTS['devnet'], {
      commitment: 'confirmed',
      confirmTransactionInitialTimeout: 60000
    })
  );
  const [recentBlocks, setRecentBlocks] = useState<Block[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [walletTransactions, setWalletTransactions] = useState<Transaction[]>([]);
  const [tps, setTps] = useState<number>(0); // Note: TPS fetching is commented in original; add if needed
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
    const newConnection = new Connection(NETWORK_ENDPOINTS[network], {
      commitment: 'confirmed',
      confirmTransactionInitialTimeout: 60000
    });
    console.log("Current connection endpoint:", newConnection.rpcEndpoint);
    setConnection(newConnection);
  };

  const handleConnectWallet = async () => {
    if (connectedWallet) {
      setConnectedWallet(null);
      setWalletTransactions([]);
      return;
    }
    
    setIsWalletConnecting(true);
    try {
      const { solana } = window as any;
      if (!solana?.isPhantom) {
        window.open('https://phantom.app/', '_blank');
        return;
      }
      const response = await solana.connect();
      setConnectedWallet(response.publicKey.toString());
    } catch (error) {
      console.error('Error connecting wallet:', error);
    } finally {
      setIsWalletConnecting(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    console.log('Starting search for:', searchQuery, 'on network:', selectedNetwork, 'length:', searchQuery.length);
    setIsSearchLoading(true);
    setHasSearched(true);
    setSearchResults([]);
    
    try {
      try {
        console.log('Attempting to treat as transaction signature...');
        const txDetails = await fetchTransactionDetails(connection, searchQuery);
        console.log('txDetails after fetch:', txDetails);
        
        if (txDetails) {
          console.log('Setting searchResults with:', [txDetails]);
          setSearchResults([txDetails]);
          setIsSearchLoading(false);
          return;
        }
      } catch (sigError) {
        console.warn('Not a valid transaction signature:', sigError);
      }
      
      try {
        console.log('Attempting to treat as address...');
        const pubKey = new PublicKey(searchQuery);
        const signatures = await connection.getSignaturesForAddress(pubKey, { limit: 10 });
        console.log('Signatures found for address:', signatures);
        
        if (signatures.length > 0) {
          const txs: Transaction[] = [];
          for (const sig of signatures) {
            const txDetails = await fetchTransactionDetails(connection, sig.signature);
            if (txDetails) txs.push(txDetails);
          }
          console.log('Transactions from address:', txs);
          setSearchResults(txs);
          setIsSearchLoading(false);
          return;
        }
      } catch (addrError) {
        console.warn('Not a valid address:', addrError);
      }
      
      try {
        const blockNum = parseInt(searchQuery);
        if (!isNaN(blockNum)) {
          console.log('Attempting to treat as block number...');
          const blockInfo = await connection.getBlock(blockNum, {
            maxSupportedTransactionVersion: 0
          });
          
          if (blockInfo) {
            const blockTxs: Transaction[] = [];
            for (let i = 0; i < Math.min(5, blockInfo.transactions.length); i++) {
              const txSig = blockInfo.transactions[i].transaction.signatures[0];
              const txDetails = await fetchTransactionDetails(connection, txSig);
              if (txDetails) blockTxs.push(txDetails);
            }
            setSearchResults(blockTxs);
          }
        }
      } catch (blockError) {
        console.warn('Not a valid block number:', blockError);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearchLoading(false);
      console.log('Search complete, isSearchLoading set to false');
    }
  };

  const handleTransactionClick = (tx: Transaction) => {
    setSelectedTransaction(tx);
  };

  return (
    <div className="min-h-screen bg-[#0c0d10]">
      {/* Header and rest of JSX remains the same as original, but with tps displayed (even if 0) */}
      <header className="bg-[#1a1b23] border-b border-[#2a2b35] sticky top-0 z-30">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center space-x-3">
              <img
                src="https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png"
                alt="Solana Logo"
                className="w-8 h-8"
              />
              <span className="text-2xl font-bold text-white">Solana Explorer</span>
            </div>
            <div className="flex flex-wrap items-center gap-2 md:gap-4">
              <div className="relative">
                <button
                  onClick={() => setIsNetworkDropdownOpen(!isNetworkDropdownOpen)}
                  className="flex items-center space-x-2 bg-[#2a2b35] rounded-lg px-3 py-2 text-white hover:bg-[#3a3b45] transition-colors text-sm md:text-base"
                >
                  <div className={`w-2 h-2 rounded-full ${networks[selectedNetwork].className}`} />
                  <span>{networks[selectedNetwork].name}</span>
                  <ChevronDown className="w-4 h-4" />
                </button>
                {isNetworkDropdownOpen && (
                  <div className="absolute top-full mt-2 w-full bg-[#2a2b35] rounded-lg border border-[#3a3b45] overflow-hidden z-50">
                    {Object.entries(networks).map(([key, { name, className }]) => (
                      <button
                        key={key}
                        onClick={() => handleNetworkChange(key as Network)}
                        className="flex items-center space-x-2 w-full px-4 py-2 hover:bg-[#3a3b45] text-white"
                      >
                        <div className={`w-2 h-2 rounded-full ${className}`} />
                        <span>{name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="hidden md:flex items-center bg-[#2a2b35] rounded-full px-3 py-2">
                <Activity className={`w-4 h-4 ${isLoading ? "text-yellow-400" : "text-green-400"}`} />
                <span className={`ml-2 text-sm ${isLoading ? "text-yellow-400" : "text-green-400"}`}>
                  {isLoading ? "Syncing..." : "Network Healthy"}
                </span>
              </div>
              <div className="hidden md:block text-white/80 text-sm">
                <span className="font-mono">{tps.toLocaleString()} TPS</span>
              </div>
              <button
                onClick={handleConnectWallet}
                disabled={isWalletConnecting}
                className={`flex items-center space-x-2 ${connectedWallet ? 'bg-[#3a3b45]' : 'bg-[#9945FF] hover:bg-[#7a37cc]'} text-white rounded-lg px-3 py-2 transition-colors disabled:opacity-70 text-sm md:text-base`}
              >
                <Wallet className="w-4 h-4" />
                <span>
                  {connectedWallet
                    ? `${connectedWallet.slice(0, 4)}...${connectedWallet.slice(-4)}`
                    : isWalletConnecting
                    ? 'Connecting...'
                    : 'Connect Wallet'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Search Section */}
      <div className="container mx-auto px-4 py-6 md:py-12">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold text-center text-white mb-6 md:mb-8">
            Explore the Solana Blockchain
          </h1>
          <div className="relative">
            <input
              type="text"
              placeholder="Search by address, transaction, block, or token"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full px-4 md:px-6 py-3 md:py-4 bg-[#1a1b23] border border-[#2a2b35] rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#9945FF]"
            />
            <button
              onClick={handleSearch}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-[#2a2b35] hover:bg-[#3a3b45] p-2 rounded-lg"
            >
              <Search className="text-white w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Search Results */}
      {hasSearched && (
        <div className="container mx-auto px-4 mb-8">
          <div className="bg-[#1a1b23] rounded-xl border border-[#2a2b35] p-6">
            <h2 className="text-xl font-semibold text-white mb-6">Search Results</h2>
            {isSearchLoading ? (
              <div className="text-white/60 text-center py-4">Searching...</div>
            ) : searchResults.length > 0 ? (
              <div className="space-y-4">
                {searchResults.map((tx, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 bg-[#2a2b35] rounded-lg hover:bg-[#3a3b45] transition-colors cursor-pointer"
                    onClick={() => handleTransactionClick(tx)}
                  >
                    <div className="flex items-center space-x-4">
                      <ArrowRightLeft className="w-5 h-5 text-[#9945FF]" />
                      <div>
                        <div className="text-white font-mono">
                          {tx.signature.slice(0, 8)}...{tx.signature.slice(-8)}
                        </div>
                        <div className="text-white/60 text-sm">{tx.type}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-white">Slot #{tx.slot.toLocaleString()}</div>
                      <div className="text-white/60 text-sm">{formatTimeAgo(tx.timestamp)}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-white/60 text-center py-4">No results found</div>
            )}
          </div>
        </div>
      )}

      {/* Wallet Transactions */}
      {connectedWallet && (
        <div className="container mx-auto px-4 mb-8">
          <div className="bg-[#1a1b23] rounded-xl border border-[#2a2b35] p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">Your Transactions</h2>
              <button
                onClick={() => fetchWalletTransactions(connection, connectedWallet, setWalletTransactions, setIsWalletTxLoading)}
                disabled={isWalletTxLoading}
                className="flex items-center space-x-2 text-[#9945FF] hover:text-[#7a37cc] transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${isWalletTxLoading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>
            <div className="space-y-4">
              {isWalletTxLoading ? (
                <div className="text-white/60 text-center py-4">Loading transactions...</div>
              ) : walletTransactions.length > 0 ? (
                walletTransactions.map((tx, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 bg-[#2a2b35] rounded-lg hover:bg-[#3a3b45] transition-colors cursor-pointer"
                    onClick={() => handleTransactionClick(tx)}
                  >
                    <div className="flex items-center space-x-4">
                      <ArrowRightLeft className="w-5 h-5 text-[#9945FF]" />
                      <div>
                        <div className="text-white font-mono">
                          {tx.signature.slice(0, 8)}...{tx.signature.slice(-8)}
                        </div>
                        <div className="text-white/60 text-sm">{tx.type}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-white">Slot #{tx.slot.toLocaleString()}</div>
                      <div className="text-white/60 text-sm">{formatTimeAgo(tx.timestamp)}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-white/60 text-center py-4">No recent transactions found for this wallet</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="container mx-auto px-4 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          <StatsCard
            icon={<Clock className="w-5 h-5" />}
            title="Latest Block"
            value={`#${recentBlocks[0]?.slot.toLocaleString() || '---'}`}
            subValue={recentBlocks[0]?.timestamp ? formatTimeAgo(recentBlocks[0].timestamp) : '---'}
          />
          <StatsCard
            icon={<ArrowRightLeft className="w-5 h-5" />}
            title="Transactions"
            value={recentBlocks[0]?.transactions.toLocaleString() || '---'}
            subValue="Latest block"
          />
          <StatsCard
            icon={<Shield className="w-5 h-5" />}
            title="Current Validator"
            value={recentBlocks[0]?.validator.slice(0, 8) + '...' || '---'}
            subValue="Active node"
          />
        </div>
      </div>

      {/* Recent Activity */}
      <div className="container mx-auto px-4 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-[#1a1b23] rounded-xl border border-[#2a2b35] p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">Recent Blocks</h2>
              <button className="text-[#9945FF] hover:text-[#7a37cc] flex items-center">
                View All <ChevronRight className="w-4 h-4 ml-1" />
              </button>
            </div>
            <div className="space-y-4">
              {isLoading ? (
                <div className="text-white/60 text-center py-4">Loading...</div>
              ) : recentBlocks.length > 0 ? (
                recentBlocks.map((block, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-[#2a2b35] rounded-lg hover:bg-[#3a3b45] transition-colors">
                    <div className="flex items-center space-x-4">
                      <Boxes className="w-5 h-5 text-[#9945FF]" />
                      <div>
                        <div className="text-white font-mono">#{block.slot.toLocaleString()}</div>
                        <div className="text-white/60 text-sm">
                          {block.timestamp ? formatTimeAgo(block.timestamp) : '---'}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-white">{block.transactions} txns</div>
                      <div className="text-white/60 text-sm">{block.validator.slice(0, 8)}...</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-white/60 text-center py-4">No blocks available</div>
              )}
            </div>
          </div>

          <div className="bg-[#1a1b23] rounded-xl border border-[#2a2b35] p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">Recent Transactions</h2>
              <button className="text-[#9945FF] hover:text-[#7a37cc] flex items-center">
                View All <ChevronRight className="w-4 h-4 ml-1" />
              </button>
            </div>
            <div className="space-y-4">
              {isLoading ? (
                <div className="text-white/60 text-center py-4">Loading...</div>
              ) : recentTransactions.length > 0 ? (
                recentTransactions.map((tx, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 bg-[#2a2b35] rounded-lg hover:bg-[#3a3b45] transition-colors cursor-pointer"
                    onClick={() => handleTransactionClick(tx)}
                  >
                    <div className="flex items-center space-x-4">
                      <ArrowRightLeft className="w-5 h-5 text-[#9945FF]" />
                      <div>
                        <div className="text-white font-mono">
                          {tx.signature.slice(0, 4)}...{tx.signature.slice(-4)}
                        </div>
                        <div className="text-white/60 text-sm">{tx.type}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-white">Slot #{tx.slot.toLocaleString()}</div>
                      <div className="text-white/60 text-sm">{formatTimeAgo(tx.timestamp)}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-white/60 text-center py-4">No transactions available</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Transaction Detail Modal */}
      {selectedTransaction && (
        <TransactionDetailModal
          transaction={selectedTransaction}
          onClose={() => setSelectedTransaction(null)}
        />
      )}

      {/* Footer */}
      <footer className="bg-[#1a1b23] py-8" style={{ backgroundColor: 'rgba(12,13,16,255)' }}>
        <div className="container mx-auto px-4 text-center">
          <div className="space-y-4">
            <div className="text-white text-2xl font-bold tracking-wider">
              Build Build Build !!!
            </div>
            <div className="flex items-center justify-center space-x-2">
              <img
                src="https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png"
                alt="Solana Logo"
                className="w-6 h-6"
                width="65"
                height="65"
              />
              <span className="text-white text-lg font-semibold"> IS FOR EVERYONE</span>
            </div>
            <div className="text-white/70 text-sm">
              Made with ❤️ by Rachit
            </div>
            <div className="flex items-center justify-center space-x-2">
              <span className="text-white/70 text-sm">Contact me:</span>
              <a
                href="https://x.com/Rachit_twts"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#9945FF] hover:text-[#7a37cc] transition-colors"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
      <Analytics />
    </div>
  );
}

export default App;