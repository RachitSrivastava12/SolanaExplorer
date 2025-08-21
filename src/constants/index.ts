import type { Network } from '../types';

export const FALLBACK_ADDRESSES = [
  'So11111111111111111111111111111111111111112', // Wrapped SOL
  '9n4nbM75f5nZ8g5g5g5g5g5g5g5g5g5g5g5g5g5g', // Example Token Address
  '4k3Dyjzvzp8e1Z1g1g1g1g1g1g1g1g1g1g1g1g1g', // Another known address
];

export const NETWORK_ENDPOINTS: Record<Network, string> = {
  'mainnet-beta': 'https://solana-rpc.publicnode.com',
  'devnet': 'https://api.devnet.solana.com',
  'testnet': 'https://api.testnet.solana.com'
};

export const networks = {
  'mainnet-beta': { name: 'Mainnet', className: 'bg-green-500' },
  'devnet': { name: 'Devnet', className: 'bg-purple-500' },
  'testnet': { name: 'Testnet', className: 'bg-blue-500' },
};