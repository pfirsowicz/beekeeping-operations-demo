# HiveLedger — Beekeeping Operations Demo

A small public demo of workflows from a separate app I use to manage my apiaries.

[Live demo](https://pfirsowicz.github.io/beekeeping-operations-demo/) · [CI](https://github.com/pfirsowicz/beekeeping-operations-demo/actions/workflows/ci.yml) · [Latest release](https://github.com/pfirsowicz/beekeeping-operations-demo/releases/tag/v1.1.0)

## Engineering decisions and evidence

- **Colony history:** Colonies keep their identity when moved; date checks prevent inconsistent history. [Rules](docs/domain.js) · [Tests](test/domain.test.js).
- **Safe writes:** The local SQLite API uses transactions, idempotent operation IDs and revision checks. [Code](src/sqlite-store.js) · [Tests](test/sqlite.test.js).
- **Audit trail:** Inspection edits record changed values; moves keep their source and destination. [Rules](docs/domain.js) · [Tests](test/api.test.js).
- **Missing versus zero:** Unchecked observations are kept separate from measured values. [Rules](docs/domain.js).

## What it does

- Browse apiaries and colonies, and record inspections.
- Create and complete follow-up tasks.
- Move colonies and review their history.

## Run locally

Requires Node.js 22.13+.

```bash
npm ci
npm run check
npm test
npm run audit:public
npm start
```

Open `http://127.0.0.1:3000`. The local API uses SQLite (in memory by default). Run `npm run test:browser` for Chrome checks. See [browser test notes](docs/browser-acceptance.md).

## Demo and source

- **GitHub Pages:** Static demo using synthetic sample records in each visitor's browser `localStorage`; no hosted API, login or production connection.
- **Local app:** A separate loopback-only Node/SQLite API, not deployed on GitHub Pages.
- The public implementation is **not** the private beekeeping application. No real apiary records or credentials are included.
- Original code and design: **All Rights Reserved**. See [LICENSE](LICENSE) and [design notes](docs/DESIGN.md).

## Screenshot

![HiveLedger dashboard](docs/screenshots/hiveledger-dashboard.png)
