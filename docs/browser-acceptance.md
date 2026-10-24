# Browser acceptance — 24 October 2026

## Scope and environment

Synthetic public HiveLedger demo only. No private beekeeping services, production databases, user records or paid services were accessed or changed.

Automated Chrome acceptance: `npm run test:browser`. To check already published Pages: `npm run test:browser -- --live`. The default command uses a loopback static server with `?offline=1`; it does not start the local SQLite API. Requires Node.js >=22.13 and locally available Google Chrome, or `CHROME_EXECUTABLE`.

## Results

- **Local Chrome, synthetic browser storage:** PASS at 1440, 768, 390 and 320 px on 24 October 2026.
- **Published GitHub Pages, synthetic browser storage:** PASS at 1440, 768, 390 and 320 px on 24 October 2026, using fresh isolated browser contexts.
- **Checked interaction:** create inspection, edit saved inspection, complete follow-up, move colony between apiaries, verify current site, reload and verify persisted site, reset data to original sample site, switch to Studio and verify persistence, ensure eight premium links do not activate, check JavaScript page errors and horizontal scrolling.
- **Keyboard sample:** focus locked feature and press Enter; confirms it remains inactive. This is not a full WCAG audit or exhaustive screen-reader test.
- **Existing Node test suite on connected Windows PC:** not accepted as a pass; installed Node 22.12.0 is below repo minimum 22.13.0, and `npm test` exited 1 on that machine. Use supported Node 22/24 GitHub CI results before merging.
- **New branch CI:** pending as of authoring; no production release or Pages deployment is implied by a PR.

## Limits and follow-up

This is a synthetic end-to-end acceptance baseline, not an exhaustive contrast audit, assistive technology audit, or API/SQLite browser walkthrough. CI validates local source using its own Chrome, not the deployed GitHub Pages asset identity. After merge, verify the GitHub Pages deployment, repeat `--live`, and cross-check published asset/release versions. Never use this script against private production data.
