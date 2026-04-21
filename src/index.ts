#!/usr/bin/env node
/**
 * asa — Amazon Scraper API CLI.
 *
 * Usage:
 *   asa product B09HN3Q81F             # scrape one product
 *   asa product B09HN3Q81F --domain de # specific marketplace
 *   asa search "wireless headphones"   # keyword search
 *   asa batch items.json               # batch submit from a local file
 *
 * Auth: reads API key from:
 *   - ASA_API_KEY environment variable (preferred)
 *   - ~/.asa/credentials (stores via `asa auth login`)
 *
 * Minimal by design — heavy lifting stays in the SDK.
 */
import { AmazonScraperAPI } from 'amazon-scraper-api-sdk';
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const VERSION = '0.1.0';

function loadApiKey(): string | null {
  if (process.env.ASA_API_KEY) return process.env.ASA_API_KEY;
  try {
    const p = join(homedir(), '.asa', 'credentials');
    const raw = readFileSync(p, 'utf-8');
    const m = raw.match(/api_key\s*=\s*(.+)/);
    return m ? m[1].trim() : null;
  } catch {
    return null;
  }
}

function usage(): never {
  console.log(`asa v${VERSION} — Amazon Scraper API CLI

Usage:
  asa product <ASIN> [--domain com|de|co.uk|...] [--language en_US|de_DE|...] [--json]
  asa search <QUERY> [--domain com] [--sort best_match|price_asc|price_desc|avg_customer_review|newest]
  asa batch <FILE.json> [--webhook https://...]
  asa batch-status <BATCH_ID>
  asa --version

Auth (set ONE of these):
  ASA_API_KEY=asa_live_...  (env var, preferred)
  ~/.asa/credentials        (file format: api_key=asa_live_...)

Docs: https://app.amazonscraperapi.com/docs`);
  process.exit(0);
}

const args = process.argv.slice(2);
if (args.length === 0 || args[0] === '--help' || args[0] === '-h') usage();
if (args[0] === '--version' || args[0] === '-v') {
  console.log(VERSION);
  process.exit(0);
}

const apiKey = loadApiKey();
if (!apiKey) {
  console.error('error: no API key found. Set ASA_API_KEY env var or create ~/.asa/credentials');
  console.error('Get a key at https://app.amazonscraperapi.com');
  process.exit(1);
}

const client = new AmazonScraperAPI(apiKey);

function arg(flag: string, fallback?: string): string | undefined {
  const idx = args.indexOf(flag);
  if (idx === -1) return fallback;
  return args[idx + 1];
}

async function main() {
  const cmd = args[0];
  try {
    switch (cmd) {
      case 'product': {
        const q = args[1];
        if (!q) { console.error('error: ASIN required'); process.exit(1); }
        const r = await client.product({
          query: q,
          domain: (arg('--domain') ?? 'com') as any,
          language: arg('--language'),
        });
        console.log(JSON.stringify(r, null, 2));
        break;
      }
      case 'search': {
        const q = args[1];
        if (!q) { console.error('error: query required'); process.exit(1); }
        const r = await client.search({
          query: q,
          domain: (arg('--domain') ?? 'com') as any,
          sort_by: arg('--sort') as any,
        });
        console.log(JSON.stringify(r, null, 2));
        break;
      }
      case 'batch': {
        const file = args[1];
        if (!file) { console.error('error: JSON file path required'); process.exit(1); }
        const items = JSON.parse(readFileSync(file, 'utf-8'));
        const r = await client.createBatch({
          endpoint: (arg('--endpoint') ?? 'amazon.product') as any,
          items,
          webhook_url: arg('--webhook'),
        });
        console.log(JSON.stringify(r, null, 2));
        break;
      }
      case 'batch-status': {
        const id = args[1];
        if (!id) { console.error('error: batch id required'); process.exit(1); }
        const r = await client.getBatch(id);
        console.log(JSON.stringify(r, null, 2));
        break;
      }
      default:
        console.error(`unknown command: ${cmd}`);
        usage();
    }
  } catch (e: any) {
    console.error(`error: ${e.message}`);
    if (e.body) console.error(JSON.stringify(e.body, null, 2));
    process.exit(1);
  }
}

main();
