import { readFileSync } from 'node:fs';
import type { RegistryEntry } from './types.js';

export function loadRegistry(path = 'registry/registry.json'): RegistryEntry[] {
  const raw = JSON.parse(readFileSync(path, 'utf-8'));
  const entries: RegistryEntry[] = raw.services.filter(
    (s: RegistryEntry) => s.serviceId && s.serviceId !== 'FILL_ME'
  );
  if (entries.length === 0) {
    console.warn('⚠️  Registry has no usable entries yet — fill registry/registry.json');
  }
  return entries;
}

export function candidatesFor(entries: RegistryEntry[], category: string, budgetUsdc: number): RegistryEntry[] {
  return entries
    .filter(e => e.category === category && e.listPriceUsdc <= budgetUsdc)
    // prefer agents we've confirmed reachable, then cheaper
    .sort((a, b) => Number(b.confirmedLive ?? false) - Number(a.confirmedLive ?? false) || a.listPriceUsdc - b.listPriceUsdc);
}
