
import { useEffect } from 'react';
import type { Connection } from '@solana/web3.js';
import type { Block, Transaction } from '../types';
import { useFetchBlocks, useFetchTransactions } from '../utils/fetchUtils';

export const useSolanaData = (
  connection: Connection,
  setRecentBlocks: React.Dispatch<React.SetStateAction<Block[]>>,
  setRecentTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>,
  retryCount: number, // Add retryCount as a parameter
  setRetryCount: React.Dispatch<React.SetStateAction<number>>,
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>
) => {
  const fetchBlocks = useFetchBlocks(connection);
  const fetchTransactions = useFetchTransactions(connection);

  useEffect(() => {
    let isMounted = true;
    let retryTimeout: NodeJS.Timeout;

    const fetchData = async () => {
      if (!isMounted) return;

      try {
        const fetchedBlocks = await fetchBlocks();
        const fetchedTransactions = await fetchTransactions();

        if (isMounted) {
          setRecentBlocks(fetchedBlocks);
          setRecentTransactions(fetchedTransactions);
          setRetryCount(0);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        if (isMounted && retryCount < 3) {
          setRetryCount(prev => prev + 1);
          retryTimeout = setTimeout(fetchData, 2000 * (retryCount + 1));
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 10000);

    return () => {
      isMounted = false;
      clearInterval(interval);
      if (retryTimeout) clearTimeout(retryTimeout);
    };
  }, [connection, fetchBlocks, fetchTransactions, setRecentBlocks, setRecentTransactions, setRetryCount, setIsLoading, retryCount]); // Add retryCount to dependencies
};
