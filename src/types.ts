export interface RegistryEntry {
  serviceId: string;
  agentId: string;
  teamName: string;
  serviceName: string;
  category: string;          // research | defi-intel | security | content | verification
  listPriceUsdc: number;
  slaMinutes: number;
  /** Completion-rate / volume stats noted from the Agent Store page (manual refresh). */
  completionRate?: number;    // 0..1
  orderCount?: number;
  /** If the team runs a haggle-bidder RFQ quote service, its serviceId. */
  quoteServiceId?: string;
  quotePriceUsdc?: number;
}

export interface JobRequest {
  task: string;
  category: string;
  budgetUsdc: number;
  /** 0 = cheapest wins, 1 = quality dominates. Default 0.4 */
  qualityWeight?: number;
  /** If true, hire an independent verification agent (different team than the winner) to grade the delivery. */
  verify?: boolean;
}

export interface Bid {
  entry: RegistryEntry;
  bidUsdc: number;
  source: 'rfq' | 'list-price';
  rfqOrderId?: string;
  rfqTxProof?: string;
  etaMinutes?: number;
  confidence?: number;
  score?: number;
}

export interface AuctionReceipt {
  jobId: string;
  task: string;
  category: string;
  budgetUsdc: number;
  candidates: number;
  bids: Array<{
    team: string;
    service: string;
    bidUsdc: number;
    source: string;
    score: number;
    rfqOrderId?: string;
  }>;
  winner: { team: string; service: string; serviceId: string; bidUsdc: number };
  awardOrderId: string;
  /** Present when verify:true — independent third-party check of the winner's delivery. */
  verification?: {
    team: string;
    service: string;
    verifyOrderId: string;
    costUsdc: number;
    verdict: string;
  };
  totalSpentUsdc: number;
  savedVsMaxBidPct: number;
  savedVsMeanBidPct: number;
  startedAt: string;
  settledAt: string;
  notes: string[];
}
