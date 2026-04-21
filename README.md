# amazon-scraper-api-cli

[![npm](https://img.shields.io/npm/v/amazon-scraper-api-cli)](https://www.npmjs.com/package/amazon-scraper-api-cli)
[![npm downloads](https://img.shields.io/npm/dm/amazon-scraper-api-cli)](https://www.npmjs.com/package/amazon-scraper-api-cli)
[![license](https://img.shields.io/npm/l/amazon-scraper-api-cli)](./LICENSE)

Command-line interface for **[Amazon Scraper API](https://www.amazonscraperapi.com/)**. Scrape Amazon products, searches, and submit async batches straight from your terminal. Structured JSON to stdout, errors to stderr, pipes cleanly into `jq` / shell scripts / ndjson pipelines.

## Benchmark (live production, 2026-04)

| Metric | Value |
|---|---|
| Median latency (product, US) | **~2.6 s** |
| P95 latency | **~6 s** |
| Price / 1,000 Amazon products | **$0.50** flat |
| Marketplaces supported | **20+** |
| Billing unit | per successful (2xx) response |

---

## Install

```bash
# global
npm install -g amazon-scraper-api-cli

# or zero-install:
npx amazon-scraper-api-cli product B09HN3Q81F
```

Requires Node >= 18.

## Auth

Set your API key via **either**:

```bash
# preferred (per-shell)
export ASA_API_KEY=asa_live_...

# or persistent file
mkdir -p ~/.asa
echo "api_key=asa_live_..." > ~/.asa/credentials
```

Get a key at https://app.amazonscraperapi.com. **1,000 free requests on signup, no credit card required.**

## Quick tour

```bash
# Single product (ASIN)
asa product B09HN3Q81F

# Specific marketplace + language
asa product B000ALVUM6 --domain de --language de_DE

# Keyword search with sort
asa search "cast iron skillet" --domain com --sort avg_customer_review

# Batch submit (up to 1,000 items)
cat <<EOF > batch.json
[
  {"query": "B09HN3Q81F", "domain": "com"},
  {"query": "B000ALVUM6", "domain": "de", "language": "de_DE"}
]
EOF
asa batch batch.json --webhook https://your.server/webhooks/asa

# Poll a batch
asa batch-status <BATCH_ID>
```

## Example output

```json
{
  "asin": "B09HN3Q81F",
  "title": "Apple AirPods Pro (2nd Generation)...",
  "price": { "current": 199.00, "currency": "USD", "was": 249.00 },
  "rating": { "average": 4.7, "count": 58214 },
  "availability": "In Stock",
  "buybox": { "seller": "Amazon.com", "prime": true },
  "images": ["https://m.media-amazon.com/images/I/...jpg"],
  "bullets": ["Active Noise Cancellation...", "Adaptive Audio..."],
  "_meta": { "tier": "direct", "duration_ms": 2634 }
}
```

## Piping to jq (one-liners)

```bash
# Just the price
asa product B09HN3Q81F | jq -r '.price.current'

# Title + rating
asa product B09HN3Q81F | jq -r '"\(.title) - \(.rating.average) stars (\(.rating.count) reviews)"'

# Top 10 ASINs for a search
asa search "wireless keyboard" --domain com | jq -r '.results[].asin'

# Bulk fetch a list of ASINs
while read asin; do asa product "$asin" --domain com; done < asins.txt > products.ndjson
```

## Flags

| Flag | Commands | Description |
|---|---|---|
| `--domain` | product, search | Marketplace TLD (`com`, `co.uk`, `de`, `fr`, `co.jp`, `com.br`, etc.) |
| `--language` | product | Content-language header (e.g. `en_US`, `de_DE`) |
| `--sort` | search | `best_match` \| `price_asc` \| `price_desc` \| `avg_customer_review` \| `newest` |
| `--endpoint` | batch | `amazon.product` (default) or `amazon.search` |
| `--webhook` | batch | HTTPS URL to POST batch results to when complete |

## Exit codes

| Code | Meaning |
|---|---|
| `0` | Success; JSON written to stdout |
| `1` | Error (network, auth, invalid params, Amazon unreachable). Error shape written to stderr |

Stdout is **always machine-readable JSON** on success. Errors on stderr. Safe to pipe into any script.

## What the CLI handles for you

| Pain | Solved |
|---|---|
| Amazon CAPTCHA/robot pages | Auto-retried through residential tier |
| Stale selector maintenance | Server-side extractors updated as Amazon layouts change |
| Setting up proxies locally | None needed. It's just an API call. |
| Parsing Amazon HTML manually | Structured JSON output |
| 20+ marketplaces | Same CLI, different `--domain` |

**Time saved:** a one-off local Amazon scraper in shell/Python typically takes a half-day (install deps, find a proxy, write selectors, handle blocks, parse). This CLI is one command.

## Error handling

Errors are JSON to stderr with a stable `error.code`:

```bash
$ asa product INVALID_ASIN --domain com
error: INVALID_PARAMS
{"error":{"code":"INVALID_PARAMS","message":"query must be a 10-character ASIN or an Amazon URL","hint":"Pass ?query=B09HN3Q81F or https://www.amazon.com/dp/B09HN3Q81F"}}
$ echo $?
1
```

Common codes: `INVALID_API_KEY`, `INSUFFICIENT_CREDITS`, `RATE_LIMITED`, `target_unreachable`, `amazon-robot-or-human`, `extraction_failed`. Non-2xx responses are **not charged**. `X-Request-Id` header is surfaced in error output for support tickets.

## Get an API key

[app.amazonscraperapi.com](https://app.amazonscraperapi.com). **1,000 free requests on signup, no credit card required.**

## Links

- **Website:** https://www.amazonscraperapi.com/
- **Docs:** https://amazonscraperapi.com/docs
- **Status:** https://amazonscraperapi.com/status
- **Pricing:** https://amazonscraperapi.com/pricing
- **Node SDK:** [amazon-scraper-api-sdk](https://www.npmjs.com/package/amazon-scraper-api-sdk) · **Python SDK:** [amazonscraperapi-sdk](https://pypi.org/project/amazonscraperapi-sdk/) · **Go SDK:** [github.com/ChocoData-com/amazon-scraper-api-sdk-go](https://github.com/ChocoData-com/amazon-scraper-api-sdk-go) · **MCP server:** [amazon-scraper-api-mcp](https://www.npmjs.com/package/amazon-scraper-api-mcp)

## License

MIT
