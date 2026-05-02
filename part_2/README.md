# Part 2 — Data pipeline

Polls the DatAds mock APIs (Facebook, Google, TikTok), writes normalized rows to SQLite (`insight`), prints aggregate metrics.

## Requirements

- Node.js **18+**
- npm
- Network access to the mock API host. If you skip `.env`, `src/config.ts` still has a default base URL; with `.env`, use `API_BASE_URL` there.

## Run

```bash
cd part_2
npm install
cp .env.example .env   # optional; defaults in src/config.ts work for the mock APIs
npm run start
```

Or from `part_2`: `./start.sh` (creates `.env` / runs `npm install` if needed, then `npm run start`).

`.env` and the database path are resolved from the **`part_2`** folder (not your shell cwd). Default DB: `data/ads.db`. Variables are listed in `.env.example`.

Also: `npm run typecheck`, `npm run build` (optional).

`better-sqlite3` is native; if `npm install` fails, install OS build tools (e.g. Xcode CLT on macOS).
