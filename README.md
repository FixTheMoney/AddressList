# Bitcoin Balance Checker | ビットコイン残高チェッカー

A bilingual (English / Japanese) static web page that looks up Bitcoin address balances in real time and auto-refreshes every 60 seconds.

## Layout

- Desktop: input panel on the left, **one single results container (table)** on the right, so all 10 addresses fit on one screen.
- Mobile: panels stack; the Txs column is hidden to save width.
- Files: `index.html` (markup + CSS), `app.js` (logic, i18n, rendering).
- Optional URL params: `?addr=addr1,addr2,...` pre-fills and loads; `?lang=ja` starts in Japanese.

## Features

- Enter up to **10 Bitcoin addresses** (one per line)
- Supports **Legacy (1...)**, **SegWit (3...)**, and **Bech32 (bc1...)** formats
- Displays per-address: **balance in BTC**, **USD equivalent**, **transaction count**, and **unconfirmed mempool count**
- **Summary strip** showing total BTC, total USD value, and live BTC/USD price
- **Auto-refresh every 60 seconds** with a visible ring countdown and manual "Refresh Now" button
- **EN / 日本語 toggle** — full bilingual UI
- Links to blockstream.info explorer for each address
- Pure static HTML/CSS/JS — no build step required

## Data Sources

| Source | Purpose |
|---|---|
| `https://blockstream.info/api/address/{addr}` | Balance, tx count, mempool stats |
| `https://api.coingecko.com/api/v3/simple/price` | Live BTC/USD price |

Both APIs are public, CORS-enabled, and require no API key.

## Entry Point

| Path | Description |
|---|---|
| `index.html` | Main (and only) page |

## Not Implemented

- Historical balance charts
- CSV / clipboard export
- Portfolio tracking across sessions (no persistence)
- Push notifications when balance changes

## Recommended Next Steps

1. Add a `localStorage` cache so addresses persist between visits
2. Show a small sparkline chart for recent balance history
3. Add a "copy address" button on each card
4. Support ENS / Lightning address resolution
