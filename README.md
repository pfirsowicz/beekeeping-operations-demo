# HiveLedger — Beekeeping Operations Demo

**A standalone engineering portfolio project showcasing operational workflows, transactional consistency and traceable colony history.**

This is a fictional example application, not a cut-down deployment of a working beekeeping business system. **All apiaries, colonies, observations and event history are synthetic.** No production services, credentials, private records, routes or infrastructure are used.

## Why this project

A beekeeping operation involves more than CRUD: colony identity must survive a move, inspection observations must distinguish *unknown* from *zero*, follow-up tasks need lifecycle state, and a backdated operation must not silently falsify the location history.

HiveLedger demonstrates these constraints using a small, inspectable codebase.

## Features

| Workflow | What the demo does |
| --- | --- |
| Apiary overview | Three fictional locations and calculated active-colony counts |
| Colony register | Search/filter by site; stable colony identity and latest inspection evidence |
| Inspections | Create/edit structured queen observations, brood-frame counts, stores, temperament and notes |
| Follow-ups | Schedule from an inspection, update/cancel through editing, complete with a recorded event |
| Colony relocation | Move between apiaries while retaining original source/destination, date and reason |
| History | Combined colony timeline, location moves and append-only audit events with edited-value deltas |
| Safety | Domain validation, relational constraints, transactional writes, idempotency, revision conflicts |

### The distinctive workflow: move a colony

1. Inspect **COL-101** in fictional **Fern Ridge**.
2. Open the colony and choose **Move colony** → **Stonefield**.
3. The register immediately shows Stonefield, while all previous inspections retain their original colony ID.
4. The timeline still includes the `Fern Ridge → Stonefield` event.
5. The service rejects a move dated earlier than the colony's latest activity.

### Architecture

```text
                  Shared pure domain module (docs/domain.js)
                     validation + immutable commands
                           /                 \
                          /                   \
 GitHub Pages demo (docs/)                      Local Node API (src/server.js)
 HTML/CSS/ES modules                            GET /api/state
 Browser localStorage                           POST /api/commands
 Per-visitor sample data                        POST /api/reset
                          \                   /
                           \                 /
                         same command semantics
                                    |
                            SQLiteStore
                   BEGIN IMMEDIATE / COMMIT / ROLLBACK
                   FK constraints + indexes + op ledger
                   optimistic revision + idempotency
```

**The hosted static and local REST experiences are intentionally different persistence adapters.** GitHub Pages uses visitor-local browser storage because it cannot host a server or shared database. The local API uses normalized, foreign-key-enforced SQLite tables to show real transactional data handling. Neither mode talks to production.

## Run locally

Requires **Node.js 22.13+** (Node.js 24 also supported). No `npm install`, account, API key or external service is required.

```bash
npm run check
npm test
npm run audit:public
npm start
```

Open **http://127.0.0.1:3000**. Local development uses the SQLite-backed API. By default the database is in memory; changes persist while the server is running. To keep local demo state across restarts, set `DEMO_DB_PATH` to an isolated `.db` file in your development environment; database files are excluded by `.gitignore`.

To check the browser-only deployment path locally, open **http://127.0.0.1:3000/?offline=1**. It uses localStorage and does not call the API. The **Reset sample data** control clears only demo records.

> The local API is deliberately bound to `127.0.0.1` and has **no authentication**. Do not expose it to the public Internet or use it for real beekeeping data. `node:sqlite` is marked experimental in Node.js 22; pin and reassess Node support before treating this as a production template.

## Publish a no-cost interactive demonstration

1. Review the entire contents and create a **new public** GitHub repository, suggested name `beekeeping-operations-demo` (do not publish the private production repository).
2. Push these files to its `main` branch, including the `docs` folder and `.github/workflows/ci.yml`.
3. In GitHub repository **Settings → Pages**, select **Deploy from a branch → `main` → `/docs`**, then save.
4. The public interactive demo should be available at `https://<your-username>.github.io/beekeeping-operations-demo/` after GitHub finishes publishing. Verify this URL in a fresh browser session rather than assuming deployment success.
5. Inspect **Actions → CI** for the automated Node 22 and 24 test runs; verify both after push. Use only standard GitHub-hosted runners, not billable larger runners.

GitHub's public-repository Pages hosting and standard Actions runners are available without additional usage charges under its published pricing rules. Avoid private-repository CI if maintaining a strict no-incremental-charge policy.

## Quality and validation

Run `npm test` to exercise:

- Domain validation and unknown-versus-zero preservation
- Create/edit/complete follow-ups and auditable before/after changes
- Consistent relocations, invalid destinations and chronology rejection
- SQLite foreign-key enforcement, persistence and rollback
- Idempotent retry after uncertain writes and optimistic concurrency conflicts
- HTTP request/response integration and static asset boundary checks

`npm run audit:public` scans authored implementation and workflow sources for recognised credential patterns and production references, and rejects common accidentally included secret files. This is **not** a complete secret-scanning certification. Also review commit history, GitHub secret-scanning alerts and any added images/dependencies before making the repository public.

A GitHub Actions CI workflow runs syntax checks, all Node tests and publication checks on pushes and pull requests. Tests were run locally before publication; a green remote CI run and public Pages availability must be verified separately.

## Repository structure

```text
.github/workflows/ci.yml      Node 22 / Node 24 checks and tests
docs/                         Static public demo for GitHub Pages
  index.html, styles.css      Responsive accessible UI
  app.js                      Browser workflows and storage adapter
  domain.js                   Shared pure domain rules
  seed.js                     Synthetic fixture generator
src/server.js                 Loopback-only Node HTTP API
src/sqlite-store.js           Normalized, transactional SQLite implementation
test/                         Domain, database and HTTP integration tests
scripts/publication-check.js  Basic public-source safeguard
LICENSE                       MIT for this demo repository only
```

## Deliberate limitations

- This is a **portfolio demo**, not an accounting system, production beekeeping diary or regulatory record.
- The public version has **no shared accounts or sync**, so every visitor has independent local data.
- The API is **local-only** and unauthenticated, with no production-grade rate limits or deployment hardening.
- No real queen lineage, treatments, grafting, finance, commercial analytics, private schema or Supabase RPCs are present.
- No controlled live browser acceptance or production deployment is implied by unit/integration tests alone.

## Further work worth demonstrating

Browser end-to-end tests (Playwright), an accessible keyboard/form review, property-based chronology tests, data export/import, a versioned SQLite migration runner, and API auth/authorization would make sense if this were expanded. Avoid extra features that obscure the four core workflows.

## Licence and separation

**MIT licence applies only to this independent demo repository.** The underlying private beekeeping application and its implementation, schemas, data, domain operations, assets and business features are **not** licensed or included here. This project was built separately with generic domain concepts and entirely invented examples.
