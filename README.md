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

# Keyword search with sort, then page 2
asa search "cast iron skillet" --domain com --sort avg_customer_review
asa search "cast iron skillet" --domain com --page 2

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

## Example output (trimmed, ~55 fields in total)

```json
{
  "asin": "B09HN3Q81F",
  "title": "LEGEND COOKWARE 5-Ply Stainless Steel Cookware Set, 14-Piece...",
  "brand": "LEGEND COOKWARE",
  "price": 549.99,
  "currency": "USD",
  "rating": 4.5,
  "reviews_count": 865,
  "stock": "In Stock",
  "is_prime": true,
  "images": ["https://m.media-amazon.com/images/I/71Q3a8JH5NL._AC_SY355_.jpg", "..."],
  "bullet_points": "5-PLY STAINLESS STEEL COOKWARE HEATS EVENLY - Five layers of steel..."
}
```

Search returns `{ "page": 1, "products": [ ... ] }`, one card per result with `asin`, `title`, `price`, `rating`, `reviews_count`, `organic_position` (or `sponsored_position`) and more.

## Piping to jq (one-liners)

```bash
# Just the price
asa product B09HN3Q81F | jq -r '.price'

# Title + rating
asa product B09HN3Q81F | jq -r '"\(.title) - \(.rating) stars (\(.reviews_count) reviews)"'

# ASINs from a search page
asa search "wireless keyboard" --domain com | jq -r '.products[].asin'

# Bulk fetch a list of ASINs into NDJSON (one object per line)
while read asin; do asa product "$asin" --domain com | jq -c .; done < asins.txt > products.ndjson
```

## Flags

| Flag | Commands | Description |
|---|---|---|
| `--domain` | product, search | Marketplace TLD (`com`, `co.uk`, `de`, `fr`, `co.jp`, `com.br`, etc.) |
| `--language` | product | Content-language header (e.g. `en_US`, `de_DE`) |
| `--sort` | search | `best_match` \| `price_asc` \| `price_desc` \| `avg_customer_review` \| `newest` |
| `--page` | search | Results page to fetch, 1-based (default 1) |
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

On failure the CLI prints `error: HTTP <status>: <code>` to stderr, followed by the API's JSON error body, and exits with `1`:

```bash
$ asa product INVALID_ASIN --domain com
error: HTTP 400: invalid_params
{
  "error": "invalid_params",
  "issues": [
    { "code": "invalid_string", "message": "ASIN must be 10 alphanumeric chars", "path": ["query"] }
  ]
}
$ echo $?
1
```

Common codes: `INVALID_API_KEY`, `INSUFFICIENT_CREDITS`, `RATE_LIMITED`, `CONCURRENCY_LIMIT`, `product_not_found`, `target_unreachable` (retry after 60s or more), `extraction_failed`. Non-2xx responses are **not charged**. For support, send the time and ASIN of the failed call.

## Get an API key

[app.amazonscraperapi.com](https://app.amazonscraperapi.com). **1,000 free requests on signup, no credit card required.**

## Links

- **Website:** https://www.amazonscraperapi.com/
- **Docs:** https://amazonscraperapi.com/docs
- **Pricing:** https://amazonscraperapi.com/pricing
- **Node SDK:** [amazon-scraper-api-sdk](https://www.npmjs.com/package/amazon-scraper-api-sdk) · **Python SDK:** [amazonscraperapi-sdk](https://pypi.org/project/amazonscraperapi-sdk/) · **Go SDK:** [github.com/ChocoData-com/amazon-scraper-api-sdk-go](https://github.com/ChocoData-com/amazon-scraper-api-sdk-go) · **MCP server:** [amazon-scraper-api-mcp](https://www.npmjs.com/package/amazon-scraper-api-mcp)

## License

MIT
