# Browser acceptance — 24 October 2026

Historical results for the then-published GitHub Pages demo. That version had eight disabled premium links; they were removed in the 30 October draft PR.

## Run

- Local static demo: `npm run test:browser`.
- Published Pages: `npm run test:browser -- --live` (**only after deployment**).
- Requires Node.js 22.13+ and local Chrome (or `CHROME_EXECUTABLE`).

## Results on 24 October

- **PASS locally and on GitHub Pages:** Chrome at 1440, 768, 390 and 320 px.
- Checked inspection create/edit, follow-up completion, colony relocation, reload, reset, theme persistence, no horizontal overflow or page errors.
- Verified disabled menu items did not activate in that historical release.
- Windows Node 22.12.0 was below the required version; its failed run is **not** counted as a pass.

## New navigation branch — 30 October

- Draft PR replaces the disabled-item test with checks of the five implemented views and keyboard navigation.
- PR CI passed on Node 22/24 (including local browser checks).
- Published Pages **has not been updated**; no post-merge live check has occurred.

## Limits

- Browser checks use synthetic storage, not the local SQLite API.
- Not a full accessibility, security or production-deployment audit.
