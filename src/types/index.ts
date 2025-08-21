export type Network = 'mainnet-beta' | 'devnet' | 'testnet';

export interface Block {
  slot: number;
  timestamp: number | null;
  transactions: number;
  validator: string;
}

export interface Transaction {
  signature: string;
  slot: number;
  timestamp: number;
  type: string;
  amount?: string;
  from?: string;
  to?: string;
  fee: number;
  result: string;
  instructions: any[];
  programLogs: string[];
}