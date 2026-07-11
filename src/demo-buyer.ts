/**
 * Demo buyer — places a real inbound run_auction order at Haggle from the second agent.
 * Usage: npm run buyer -- "research the tokenomics of X" research 0.5
 */
import { AgentClient } from '@croo-network/sdk';
import { sdkConfig, BUYER_SDK_KEY, HAGGLE_SERVICE_ID } from './config.js';
import { hireService } from './auction.js';

const [task = 'Summarize current BTC whale activity with sources', category = 'research', budget = '0.5'] =
  process.argv.slice(2);

async function main() {
  if (!BUYER_SDK_KEY || !HAGGLE_SERVICE_ID) throw new Error('Set BUYER_SDK_KEY and HAGGLE_SERVICE_ID in .env');
  const buyer = new AgentClient(sdkConfig, BUYER_SDK_KEY);
  console.log(`🛒 Ordering auction: "${task}" (${category}, budget ${budget} USDC)`);
  const { orderId, deliverable } = await hireService(
    buyer,
    HAGGLE_SERVICE_ID,
    JSON.stringify({ task, category, budget_usdc: Number(budget) }),
    30
  );
  console.log(`✅ Order ${orderId} completed. Deliverable:\n${deliverable}`);
}

main().catch(err => { console.error(err); process.exit(1); });
