# Release status — 24 October 2026

- **Published:** [v1.1.0](https://github.com/pfirsowicz/beekeeping-operations-demo/releases/tag/v1.1.0); All Rights Reserved for original source.
- **Source branch:** `master`. Release/tag was verified on 24 October 2026.
- **Live demo:** [GitHub Pages](https://pfirsowicz.github.io/beekeeping-operations-demo/) — synthetic browser-only data; local Node/SQLite API is not hosted.
- **Current draft changes:** Not part of v1.1.0 until reviewed, merged and deployed.

## Evidence

- [Initial public demo — PR #1](https://github.com/pfirsowicz/beekeeping-operations-demo/pull/1), commit `7d55870de00fdb27b1238e46a347816be413cb31`.
- [Harvest/Studio themes — PR #2](https://github.com/pfirsowicz/beekeeping-operations-demo/pull/2), commit `fe45c7c7fa26a9d0a4221f965547591816e4ebd8`.
- [PR CI](https://github.com/pfirsowicz/beekeeping-operations-demo/actions/runs/39941053293) and [post-merge CI](https://github.com/pfirsowicz/beekeeping-operations-demo/actions/runs/40020136403) passed on Node 22/24.
- GitHub Pages assets returned HTTP 200; live Chrome displayed the dashboard and theme selector.
- [Browser acceptance](docs/browser-acceptance.md) records separate local and hosted checks.
- [Design/asset separation](docs/DESIGN.md) documents original styling; no private source or records were published.

## Release checks

- Review PR and CI first; confirm deployed Pages assets and rerun browser checks **after merge**.
- A green CI run is not proof of deployment.
- Keep releases/tags for meaningful version changes, with explicit review.
- [Maintained current state](https://pawelf.atlassian.net/wiki/spaces/HOME/pages/421855247) owns ongoing project status.
