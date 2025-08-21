import { useCallback } from 'react';
import { Connection, PublicKey } from '@solana/web3.js';
import type { Block, Transaction } from '../types';
import { FALLBACK_ADDRESSES } from '../constants';

export const fetchTransactionDetails = async (connection: Connection, signature: string): Promise<Transaction | null> => {
  console.log(`Fetching details for signature: ${signature} (length: ${signature.length})`);
  try {
    let attempts = 0;
    let tx = null;
    
    while (attempts < 3 && !tx) {
      try {
        tx = await connection.getParsedTransaction(signature, {
          maxSupportedTransactionVersion: 0,
          commitment: 'confirmed'
        });
        break;
      } catch (err) {
        console.warn(`Attempt ${attempts + 1} failed for signature ${signature}:`, err);
        attempts++;
        if (attempts < 3) await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    if (!tx) {
      console.log(`Transaction not found for ${signature} after ${attempts} attempts`);
      return null;
    }

    console.log(`Raw transaction data for ${signature}:`, tx);

    const timestamp = tx.blockTime || Math.floor(Date.now() / 1000);
    const result = tx.meta?.err ? 'Failed' : 'Success';
    const fee = tx.meta?.fee || 0;
    const instructions = tx.transaction.message.instructions;
    const programLogs = tx.meta?.logMessages || [];

    let from = '', to = '', amount = '';
    let transactionType = 'Unknown';
    
    if (tx.transaction.message.instructions && tx.transaction.message.instructions.length > 0) {
      const instruction = tx.transaction.message.instructions[0];
      
      if ('parsed' in instruction) {
        transactionType = instruction.parsed?.type || 'Unknown';
        
        if (instruction.parsed?.type === 'transfer') {
          from = instruction.parsed.info.source;
          to = instruction.parsed.info.destination;
          amount = (instruction.parsed.info.lamports / 1_000_000_000).toString();
        }
      } else if (instruction.programId) {
        transactionType = instruction.programId.toString();
      }
    }

    const txDetails: Transaction = {
      signature,
      slot: tx.slot,
      timestamp,
      type: transactionType,
      from,
      to,
      amount,
      fee,
      result,
      instructions,
      programLogs
    };
    console.log('Transaction details fetched:', txDetails);
    return txDetails;
  } catch (error) {
    console.warn(`Error fetching transaction details for ${signature}:`, error);
    return null;
  }
};

export const useFetchBlocks = (connection: Connection) => useCallback(async () => {
  try {
    const slot = await connection.getSlot('finalized');
    console.log("Fetching blocks from slot:", slot);
    const blocks: Block[] = [];
    let fetchPromises = [];
    for (let i = 0; i < 5; i++) {
      fetchPromises.push(
        connection.getBlock(slot - i, {
          maxSupportedTransactionVersion: 0,
          commitment: 'confirmed'
        }).then(blockInfo => {
          if (blockInfo) {
            blocks.push({
              slot: slot - i,
              timestamp: blockInfo.blockTime,
              transactions: blockInfo.transactions.length,
              validator: blockInfo.rewards?.[0]?.pubkey || 'Unknown',
            });
          }
        }).catch(blockError => {
          console.warn(`Error fetching block ${slot - i}:`, blockError);
        })
      );
    }
    await Promise.allSettled(fetchPromises);
    console.log("Fetched blocks:", blocks);
    return blocks.sort((a, b) => b.slot - a.slot);
  } catch (error) {
    console.warn('Error fetching blocks:', error);
    return [];
  }
}, [connection]);

export const useFetchTransactions = (connection: Connection) => useCallback(async () => {
  for (const address of FALLBACK_ADDRESSES) {
    try {
      const pubKey = new PublicKey(address);
      const signatures = await connection.getSignaturesForAddress(pubKey, { limit: 5 }, 'confirmed');
      console.log(`Fetched signatures for address ${address}:`, signatures);
      
      if (signatures.length > 0) {
        const txs: Transaction[] = [];
        for (const sig of signatures) {
          const txDetails = await fetchTransactionDetails(connection, sig.signature);
          if (txDetails) txs.push(txDetails);
        }
        console.log('Recent transactions fetched:', txs);
        return txs;
      }
    } catch (error) {
      console.warn(`Error fetching transactions for ${address}:`, error);
      continue;
    }
  }
  return [];
}, [connection]);

export const fetchWalletTransactions = async (
  connection: Connection,
  connectedWallet: string | null,
  setWalletTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>,
  setIsWalletTxLoading: React.Dispatch<React.SetStateAction<boolean>>
) => {
  if (!connectedWallet) {
    setWalletTransactions([]);
    return;
  }
  
  setIsWalletTxLoading(true);
  try {
    const walletPubkey = new PublicKey(connectedWallet);
    const signatures = await connection.getSignaturesForAddress(walletPubkey, { limit: 10 }, 'confirmed');
    
    if (signatures.length > 0) {
      const txs: Transaction[] = [];
      for (const sig of signatures) {
        const txDetails = await fetchTransactionDetails(connection, sig.signature);
        if (txDetails) txs.push(txDetails);
      }
      setWalletTransactions(txs);
    } else {
      setWalletTransactions([]);
    }
  } catch (error) {
    console.error('Error fetching wallet transactions:', error);
    setWalletTransactions([]);
  } finally {
    setIsWalletTxLoading(false);
  }
};

export const formatTimeAgo = (timestamp: number) => {
  const seconds = Math.floor((Date.now() / 1000) - timestamp);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
};