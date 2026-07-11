import 'dotenv/config';

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var ${name} — copy .env.example to .env and fill it in`);
  return v;
}

export const sdkConfig = {
  baseURL: process.env.CROO_API_URL ?? 'https://api.croo.network',
  wsURL: process.env.CROO_WS_URL ?? 'wss://api.croo.network/ws',
};

export const HAGGLE_SDK_KEY = required('HAGGLE_SDK_KEY');
export const BUYER_SDK_KEY = process.env.BUYER_SDK_KEY ?? '';
export const HAGGLE_SERVICE_ID = process.env.HAGGLE_SERVICE_ID ?? '';

export const MAX_USDC_PER_JOB = Number(process.env.MAX_USDC_PER_JOB ?? '1');
export const MAX_USDC_TOTAL = Number(process.env.MAX_USDC_TOTAL ?? '8');
