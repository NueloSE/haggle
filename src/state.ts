import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const DIR = 'state';
const FILE = `${DIR}/jobs.json`;

export function appendJobLog(entry: unknown): void {
  if (!existsSync(DIR)) mkdirSync(DIR, { recursive: true });
  const log = existsSync(FILE) ? JSON.parse(readFileSync(FILE, 'utf-8')) : [];
  log.push({ at: new Date().toISOString(), ...(entry as object) });
  writeFileSync(FILE, JSON.stringify(log, null, 2));
}

export function readJobLog(): unknown[] {
  return existsSync(FILE) ? JSON.parse(readFileSync(FILE, 'utf-8')) : [];
}
