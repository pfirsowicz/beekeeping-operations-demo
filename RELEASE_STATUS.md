# Publication checkpoint — 24 October 2026 (NZDT)

**Status:** v1.0.1 — current simplified public demo released with All Rights Reserved terms for original source. Publication requires successful main CI and GitHub Release/tag readback; comprehensive browser-workflow acceptance remains open.

## Verified source and release evidence

- Public repository: https://github.com/pfirsowicz/beekeeping-operations-demo
- Initial implementation: [PR #1](https://github.com/pfirsowicz/beekeeping-operations-demo/pull/1), merged as `7d55870de00fdb27b1238e46a347816be413cb31`.
- Original Harvest and Studio themes: [PR #2](https://github.com/pfirsowicz/beekeeping-operations-demo/pull/2), merged as `fe45c7c7fa26a9d0a4221f965547591816e4ebd8`.
- The original GitHub Release `v1.0.0` was published on 24 October 2026 NZDT under MIT at PR #2 merge commit `fe45c7c7fa26a9d0a4221f965547591816e4ebd8`. Its release listing and tag have now been deleted at the owner's request; the original commit remains in Git history, and deleting references does not revoke the earlier MIT grant.
- [GitHub Release v1.0.1](https://github.com/pfirsowicz/beekeeping-operations-demo/releases/tag/v1.0.1) supersedes the original public listing, with current All Rights Reserved terms for original source. Confirm the GitHub release/tag and post-merge CI before treating this as delivered.
- [PR CI](https://github.com/pfirsowicz/beekeeping-operations-demo/actions/runs/39941053293) and [post-merge main CI](https://github.com/pfirsowicz/beekeeping-operations-demo/actions/runs/40020136403) passed on Node.js 22 and 24.
- Public GitHub Pages site: https://pfirsowicz.github.io/beekeeping-operations-demo/ — live index, theme.css, theme.js, app.js, domain.js all returned HTTP 200; resource-content assertions matched the merged design.
- Live Chrome headless smoke check rendered Harvest theme, selector, active colony metrics and apiary overview without remaining in loading state.
- The public implementation is separate from the already-used private application. No private beekeeping source code, database connectivity, operational records, credentials or Colorlib template assets were included. `docs/DESIGN.md` records the design/licence separation.

## Licensing transition

The original material in `main` is All Rights Reserved following PR #9 (`ab4722db6a1b734f7be95d075eaf4d965842cdba`). The historical MIT-licensed `v1.0.0` Git tag was deleted after the v1.0.1 proprietary release was verified. The original Git commit and history have not been rewritten. Earlier MIT permissions cannot be withdrawn.

## Outstanding acceptance and operational limits

- Independent browser walkthrough of create/edit inspection, follow-up completion, colony moves and chronology, localStorage reload/reset, Studio switching, mobile breakpoints and keyboard accessibility.
- This is a simplified public presentation of workflows from an existing privately used beekeeping system, with synthetic per-visitor sample records. It is not a deployed public Node/SQLite service; the SQLite API is loopback-only.
- The regex-based publication check is not a complete repository-history or dependency security audit.
- Future source changes require PR review/CI, a live Pages check and an explicit version decision before a new GitHub Release. CI success alone does not establish deployment.
- The publication should remain on no-additional-cost public GitHub Pages and standard CI runners.

## Documentation

[Software Development / Beekeeping Operations Demo current state](https://pawelf.atlassian.net/wiki/spaces/HOME/pages/421855247) is the canonical specialist status and ownership record.

**Next:** complete an independent desktop/mobile interaction and accessibility pass, then update the owning page with evidence. No new release is required for documentation-only changes after the v1.0.1 transition.

## 24 October 2026 — Historical MIT tag retirement

- Owner explicitly requested deletion of the former MIT-licensed `v1.0.0` Git tag.
- [PR #12](https://github.com/pfirsowicz/beekeeping-operations-demo/pull/12) merged the one-time guard; [tag-retirement workflow](https://github.com/pfirsowicz/beekeeping-operations-demo/actions/runs/40048218640) succeeded.
- GitHub REST readback confirmed `v1.0.0` tag absent and only current proprietary `v1.0.1` tag and release present. No history rewrite or source deletion.
- The one-time write-enabled workflow is removed as part of the follow-up documentation PR. Any retained third-party licence notices continue to apply.
