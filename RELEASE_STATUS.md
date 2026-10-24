# Publication checkpoint — 24 October 2026 (NZDT)

**Status:** v1.0.1 — current simplified public demo released with All Rights Reserved terms for original source. Publication requires successful main CI and GitHub Release/tag readback; comprehensive browser-workflow acceptance remains open.

## Verified source and release evidence

- Public repository: https://github.com/pfirsowicz/beekeeping-operations-demo
- Initial implementation: [PR #1](https://github.com/pfirsowicz/beekeeping-operations-demo/pull/1), merged as `7d55870de00fdb27b1238e46a347816be413cb31`.
- Original Harvest and Studio themes: [PR #2](https://github.com/pfirsowicz/beekeeping-operations-demo/pull/2), merged as `fe45c7c7fa26a9d0a4221f965547591816e4ebd8`.
- [GitHub Release v1.0.1](https://github.com/pfirsowicz/beekeeping-operations-demo/releases/tag/v1.0.1) is the current public release with All Rights Reserved terms for original source. Confirm the GitHub release/tag and post-merge CI before treating this as delivered.
- [PR CI](https://github.com/pfirsowicz/beekeeping-operations-demo/actions/runs/39941053293) and [post-merge main CI](https://github.com/pfirsowicz/beekeeping-operations-demo/actions/runs/40020136403) passed on Node.js 22 and 24.
- Public GitHub Pages site: https://pfirsowicz.github.io/beekeeping-operations-demo/ — live index, theme.css, theme.js, app.js, domain.js all returned HTTP 200; resource-content assertions matched the merged design.
- Live Chrome headless smoke check rendered Harvest theme, selector, active colony metrics and apiary overview without remaining in loading state.
- The public implementation is separate from the already-used private application. No private beekeeping source code, database connectivity, operational records, credentials or Colorlib template assets were included. `docs/DESIGN.md` records the visual design and asset separation.

## Outstanding acceptance and operational limits

- Independent browser walkthrough of create/edit inspection, follow-up completion, colony moves and chronology, localStorage reload/reset, Studio switching, mobile breakpoints and keyboard accessibility.
- This is a simplified public presentation of workflows from an existing privately used beekeeping system, with synthetic per-visitor sample records. It is not a deployed public Node/SQLite service; the SQLite API is loopback-only.
- The regex-based publication check is not a complete repository-history or dependency security audit.
- Future source changes require PR review/CI, a live Pages check and an explicit version decision before a new GitHub Release. CI success alone does not establish deployment.
- The publication should remain on no-additional-cost public GitHub Pages and standard CI runners.

## Documentation

[Software Development / Beekeeping Operations Demo current state](https://pawelf.atlassian.net/wiki/spaces/HOME/pages/421855247) is the canonical specialist status and ownership record.

**Next:** complete an independent desktop/mobile interaction and accessibility pass, then update the owning page with evidence. No new release is required for documentation-only changes after the current documentation review.
