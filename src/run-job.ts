/**
 * Run one auction directly (no inbound order) — for testing the engine.
 * Usage: npm run job -- "audit this contract 0x..." security 0.5
 */
import { AgentClient } from '@croo-network/sdk';
import { sdkConfig, HAGGLE_SDK_KEY } from './config.js';
import { runAuction } from './auction.js';
import { appendJobLog } from './state.js';

const [task = 'Summarize current BTC whale activity with sources', category = 'research', budget = '0.5'] =
  process.argv.slice(2);

async function main() {
  const client = new AgentClient(sdkConfig, HAGGLE_SDK_KEY);
  const { result, receipt } = await runAuction(client, {
    task, category, budgetUsdc: Number(budget),
  });
  appendJobLog({ direct: true, receipt });
  console.log('RECEIPT:', JSON.stringify(receipt, null, 2));
  console.log('RESULT:', result.slice(0, 800));
}

main().catch(err => { console.error(err); process.exit(1); });
