import React from 'react';
import { X } from 'lucide-react';
import type { Transaction } from '../types';

interface TransactionDetailModalProps {
  transaction: Transaction | null;
  onClose: () => void;
}

export function TransactionDetailModal({ transaction, onClose }: TransactionDetailModalProps) {
  if (!transaction) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a1b23] rounded-2xl border border-[#2a2b35] w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-[#1a1b23] border-b border-[#2a2b35] p-6 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-white">Transaction Details</h2>
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <span className="text-sm text-white/70 uppercase tracking-wide">Signature</span>
              <div className="bg-[#2a2b35] p-3 rounded-lg text-white font-mono text-sm break-all">
                {transaction.signature}
              </div>
            </div>
            <div className="space-y-2">
              <span className="text-sm text-white/70 uppercase tracking-wide">Result</span>
              <div className={`p-3 rounded-lg text-white font-medium ${transaction.result === 'Success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                {transaction.result}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <span className="text-sm text-white/70 uppercase tracking-wide">Slot</span>
              <div className="bg-[#2a2b35] p-3 rounded-lg text-white">#{transaction.slot.toLocaleString()}</div>
            </div>
            <div className="space-y-2">
              <span className="text-sm text-white/70 uppercase tracking-wide">Timestamp</span>
              <div className="bg-[#2a2b35] p-3 rounded-lg text-white text-sm">
                {new Date(transaction.timestamp * 1000).toLocaleString()}
              </div>
            </div>
            <div className="space-y-2">
              <span className="text-sm text-white/70 uppercase tracking-wide">Fee</span>
              <div className="bg-[#2a2b35] p-3 rounded-lg text-white">{(transaction.fee / 1_000_000_000).toFixed(9)} SOL</div>
            </div>
          </div>
          {(transaction.from || transaction.to || transaction.amount) && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Transfer Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {transaction.from && (
                  <div className="space-y-2">
                    <span className="text-sm text-white/70 uppercase tracking-wide">From</span>
                    <div className="bg-[#2a2b35] p-3 rounded-lg text-white font-mono text-sm break-all">
                      {transaction.from}
                    </div>
                  </div>
                )}
                {transaction.to && (
                  <div className="space-y-2">
                    <span className="text-sm text-white/70 uppercase tracking-wide">To</span>
                    <div className="bg-[#2a2b35] p-3 rounded-lg text-white font-mono text-sm break-all">
                      {transaction.to}
                    </div>
                  </div>
                )}
                {transaction.amount && (
                  <div className="space-y-2">
                    <span className="text-sm text-white/70 uppercase tracking-wide">Amount</span>
                    <div className="bg-[#2a2b35] p-3 rounded-lg text-white">{transaction.amount} SOL</div>
                  </div>
                )}
              </div>
            </div>
          )}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Instructions</h3>
            <div className="bg-[#2a2b35] p-4 rounded-lg max-h-40 overflow-y-auto scrollbar-thin scrollbar-thumb-[#3a3b45] scrollbar-track-[#2a2b35]">
              {transaction.instructions.length > 0 ? (
                transaction.instructions.map((instr, idx) => (
                  <div key={idx} className="text-white text-sm font-mono mb-2 last:mb-0">
                    {JSON.stringify(instr, null, 2)}
                  </div>
                ))
              ) : (
                <div className="text-white/60 text-sm">No instructions available</div>
              )}
            </div>
          </div>
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Program Logs</h3>
            <div className="bg-[#2a2b35] p-4 rounded-lg max-h-40 overflow-y-auto scrollbar-thin scrollbar-thumb-[#3a3b45] scrollbar-track-[#2a2b35]">
              {transaction.programLogs.length > 0 ? (
                transaction.programLogs.map((log, idx) => (
                  <div key={idx} className="text-white text-sm font-mono mb-1 last:mb-0">
                    {log}
                  </div>
                ))
              ) : (
                <div className="text-white/60 text-sm">No program logs available</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}