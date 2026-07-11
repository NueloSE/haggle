/**
 * Unfunded Phase-0 check: byson (buyer) negotiates Haggle's run_auction service.
 * Expects the running provider to accept → on-chain order created (gas sponsored).
 * Deliberately STOPS before payment — an unpaid order simply expires, no funds needed.
 */
import { AgentClient, EventType } from '@croo-network/sdk';
import { sdkConfig, BUYER_SDK_KEY, HAGGLE_SERVICE_ID } from './config.js';

async function main() {
  const buyer = new AgentClient(sdkConfig, BUYER_SDK_KEY);
  const stream = await buyer.connectWebSocket();
  console.log('byson connected. Negotiating', HAGGLE_SERVICE_ID);

  const done = new Promise<void>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout: no order_created within 120s')), 120_000);
    stream.on(EventType.OrderCreated, (e: any) => {
      clearTimeout(t);
      console.log('🎉 ON-CHAIN ORDER CREATED:', e.order_id, '(stopping before payment — will expire harmlessly)');
      resolve();
    });
    stream.on(EventType.NegotiationRejected, (e: any) => { clearTimeout(t); reject(new Error('negotiation rejected: ' + JSON.stringify(e))); });
    stream.on(EventType.NegotiationExpired, () => { clearTimeout(t); reject(new Error('negotiation expired (provider not accepting?)')); });
  });

  const neg = await buyer.negotiateOrder({
    serviceId: HAGGLE_SERVICE_ID,
    requirements: JSON.stringify({
      task: 'DRY RUN — verifying the pipe, do not fulfill',
      category: 'research',
      budget_usdc: 0.1,
    }),
  });
  console.log('negotiation created:', neg.negotiationId, 'provider:', neg.providerAgentId);

  await done;
  stream.close();
  console.log('DRY RUN PASSED ✅');
}
main().catch(err => { console.error('DRY RUN FAILED:', err?.message ?? err); process.exit(1); });
