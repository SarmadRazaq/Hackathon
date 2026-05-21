# CIRO — Final Delivery Plan

**Owner:** Sarmad Razaq
**Target submission:** Hackathon deliverables (working prototype + 3–5 min demo + Antigravity traces + README)
**Plan date:** 2026-05-20
**Starting state:** ~85% complete per [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md). Structural coverage of every mandatory challenge requirement is in place. This plan closes the finishing gaps and packages the submission.

---

## 0. Snapshot of what is already done

These are **not** in this plan — they are already implemented and verified by code inspection. Listed here so we don't re-do them.

- 9-agent orchestration pipeline ([backend/agents/orchestrator.py](backend/agents/orchestrator.py))
- Google Antigravity runtime guardrails ([backend/antigravity_runtime.py](backend/antigravity_runtime.py))
- Multi-crisis coordinator ([backend/agents/multi_coordinator.py](backend/agents/multi_coordinator.py))
- Rule-based baseline scorer ([backend/baseline/rule_based.py](backend/baseline/rule_based.py))
- 25+ REST endpoints + SSE streaming in [backend/main.py](backend/main.py)
- Mobile: 14 screens, GPS, offline queue, bilingual UI, drawer nav
- Admin: 9 Next.js routes with Firestore `onSnapshot` + SSE
- Antigravity trace bundle: [../antigravity_project_traces.zip](../antigravity_project_traces.zip) (59 MB)
- Trace narratives: [antigravity_chat_history.md](antigravity_chat_history.md), [antigravity_coordination_logs.md](antigravity_coordination_logs.md)

---

## 1. Gap inventory (single source of truth)

Pulled from [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md) and [TEST_REPORT.md](TEST_REPORT.md), de-duplicated and ranked.

| # | Gap | Severity | Effort | Blocks demo? |
|---|---|---|---|---|
| G1 | `admin_panel/.env.local` missing — admin can't talk to Firestore | 🔴 Critical | 10 min | YES |
| G2 | `mobile/.env` & `backend/.env` may not point to the same Firebase project | 🔴 Critical | 15 min | YES |
| G3 | `AppShell.tsx` still reads `DEMO_CRISES` — live crises don't surface on admin home | 🔴 Critical | 2 h | YES |
| G4 | Demo video (3–5 min) not yet recorded | 🔴 Critical | 1.5 h | YES (deliverable) |
| G5 | Antigravity trace zip unverified — contents not inspected | 🟠 High | 20 min | YES (deliverable) |
| G6 | Admin `/comparison` page still on mock data | 🟡 Medium | 30 min | No |
| G7 | CommsScreen drafts but cannot "send" — no audit log entry | 🟡 Medium | 1 h | No |
| G8 | SettingsScreen has no test-mode scenario loader (judges' shortcut) | 🟡 Medium | 1 h | No |
| G9 | Stress-test scenarios from brief not scripted end-to-end | 🟡 Medium | 1.5 h | No (but boosts score) |
| G10 | NASA FIRMS / PMD / NDMA tools return mocked payloads | 🟢 Low | 2 h | No |
| G11 | Before/after traffic panel on ResultScreen | 🟢 Low | 1 h | No |
| G12 | Public advisories endpoint `/api/public-advisories` | 🟢 Low | 1 h | No |

**Critical path total:** ~4.5 h (G1–G5). **Full polish:** ~11 h.

---

## 2. Phase plan

### Phase A — Unblock live data (must do first, ~2.5 h)

**Goal:** every screen reads real Firestore data instead of `DEMO_*` constants.

#### A1. Reconcile Firebase project across all three apps (G1, G2)
- Confirm canonical project ID (likely `ciro-…` from `mobile/google-services.json`).
- Create [admin_panel/.env.local](admin_panel/.env.local) with `NEXT_PUBLIC_FIREBASE_*` keys matching `mobile/src/services/firebaseConfig.ts`.
- Diff `mobile/.env` ↔ `backend/.env` ↔ new admin env. All three must share `projectId`, `databaseURL`, and Firebase Admin service-account hash.
- Run smoke test:
  - Submit one report from mobile.
  - Confirm it appears in Firestore console.
  - Confirm admin home picks it up via `onSnapshot`.

**Done when:** a single report submitted from mobile is visible in both admin and Firestore within 5 s.

#### A2. AppShell live-wiring (G3)
- File: `admin_panel/src/components/AppShell.tsx` (or equivalent — verify path).
- Remove `DEMO_CRISES` import and any `useState(DEMO_CRISES)` seed.
- Subscribe to `collection(db, "incidents")` via `onSnapshot`, ordered by `createdAt desc`, limit 50.
- Map Firestore doc shape → existing `Crisis` TS type (write an adapter if fields differ).
- Empty state: show "No active incidents — submit one from mobile or use Test Mode."
- Error state: surface Firestore error in a toast, keep last-known list.

**Done when:** killing Firestore writes shows empty state; submitting a mobile report makes it appear within 2 s without page refresh.

#### A3. Verify SSE event stream end-to-end
- Start backend (`uvicorn main:app --reload`).
- Open admin → confirm `EventSource('/api/events')` connects (Network tab).
- Trigger `/api/analyze` with a sample payload; confirm agent-by-agent events stream into the Live Agent Stream overlay.

**Done when:** running an analyze call produces ≥9 visible events in the admin overlay in real time.

---

### Phase B — Demo readiness (must do, ~3 h)

#### B1. Inspect & re-package Antigravity traces (G5)
- Unzip `antigravity_project_traces.zip` into `ciro/demo/antigravity_traces/` (gitignored).
- Confirm it contains, at minimum:
  - Signal fusion trace (Ingestor + Credibility Verifier)
  - Confidence scoring trace (Crisis Detector)
  - Resource trade-off trace (Rescue Advocate ⇄ Infra Advocate ⇄ Planner)
  - False-positive recovery trace (Report Verifier flipping a flood → water-main)
- If any of those four are missing, generate them by running [demo/sample_run_trace.json](demo/sample_run_trace.json) through the orchestrator and saving the SSE log.
- Produce a single `ANTIGRAVITY_TRACES.md` index pointing to each trace with a one-paragraph description of what it shows.

**Done when:** judges can open one file and navigate to every required trace category.

#### B2. Script the four stress-test scenarios (G9)
Add deterministic Firestore seed scripts under `backend/scenarios/`:

1. `scenario_dual_crisis.py` — G-10 flood + F-7 heat emergency within 30 min, contending for ambulances.
2. `scenario_conflicting_signals.py` — social posts say flood, PMD sensor offline, field report says water main.
3. `scenario_api_failure.py` — force `get_pmd_weather` to raise; show fallback to cached + manual escalation toast.
4. `scenario_false_alarm.py` — initial flood detected, then field verification arrives and triggers retraction + utility notification.

Each script:
- Writes the seed documents to Firestore.
- Prints the curl/`http` command to kick off the pipeline.
- Prints the expected agent flow so the demoer knows what to point at.

**Done when:** `python backend/scenarios/scenario_dual_crisis.py` produces a runnable demo state in < 10 s.

#### B3. Record the demo video (G4)
Follow the existing [DEMO_RECORDING_GUIDE.md](DEMO_RECORDING_GUIDE.md), shooting in this order (target: 4:30):

| Time | Beat | Screen |
|---|---|---|
| 0:00–0:20 | Problem framing + Antigravity callout | Title slide |
| 0:20–0:50 | Citizen submits Urdu flood report w/ photo | Mobile HomeScreen |
| 0:50–1:20 | Signal fusion: NASA + PMD + traffic agree | Admin live agent stream |
| 1:20–1:50 | Severity + T+24h projection | Admin Impact tab |
| 1:50–2:30 | Second crisis arrives → resource contention | Admin Resources Conflicts tab |
| 2:30–3:00 | Planner trade-off + stakeholder messages | Admin Comms |
| 3:00–3:30 | False-alarm recovery (scenario 4) | Mobile retraction toast + admin log |
| 3:30–4:00 | Baseline-vs-agent comparison | Admin Comparison |
| 4:00–4:30 | Antigravity trace export + summary | Admin Logs export |

Output: `demo/CIRO_DEMO.mp4`, plus a thumbnail and a captions file for accessibility.

**Done when:** video is < 5 min, ≥ 1080p, and demonstrates each evaluation-criterion category at least once.

---

### Phase C — Score-boosting polish (nice-to-have, ~5 h)

These don't gate the submission but lift specific scoring rubric lines.

#### C1. Wire admin `/comparison` to live data (G6, lifts "Innovation & UX 10%")
- Replace `mockComparisonData` with `fetch('/api/comparison/{crisisId}')`.
- Add a "Refresh against latest run" button.

#### C2. CommsScreen send + audit log (G7, lifts "Impact simulation and stakeholder coordination 15%")
- Add `POST /api/comms/send` — writes to `audit_logs/{auto-id}` with `{ stakeholderType, channel, body, sentAt, crisisId, sentBy }`.
- Mobile: turn the existing "Send" button live; show success toast and log link.

#### C3. Test-mode scenario loader (G8, lifts demo flow)
- SettingsScreen → "Demo / Test Mode" section with four buttons, one per scenario in B2.
- Each button hits a new `POST /api/test-mode/load?scenario=…` that runs the corresponding seed script.
- Add a confirmation modal so judges don't trigger it accidentally on live data.

#### C4. NASA FIRMS / PMD live feeds (G10, lifts "Robustness 10%")
- Replace mocks in `backend/agents/tools.py` with real HTTP calls using `httpx.AsyncClient` + 5 s timeout + retry.
- On failure, return the existing mock with `source: "fallback_cache"` flag so the Antigravity runtime can downgrade confidence.

#### C5. Before/after traffic panel (G11) and `/api/public-advisories` (G12)
- ResultScreen → new "Simulation" sub-tab showing congestion heat before/after rerouting.
- Backend: `GET /api/public-advisories?lat=&lng=&radius=` returning active retractable advisories for the public dashboard.

---

### Phase D — Submission packaging (~1 h)

#### D1. README final pass
- Confirm every section listed in the brief is present in [README.md](README.md):
  - architecture, data stream schemas, **Antigravity usage**, APIs/tools, assumptions, privacy/safety, **cost/latency**, baseline comparison, scalability, limitations.
- Add a one-screen "How to run for judges" block at the top (3 commands max).

#### D2. Cost & latency table
Add measured numbers to README using a 20-run benchmark:
- p50 / p95 latency per `/api/analyze` call.
- Token cost per run at gpt-4o-mini list price.
- Throughput at 10 concurrent crises (locust or a 10-line `asyncio.gather` script).

#### D3. Repo hygiene
- Move `antigravity_project_traces.zip` → `ciro/demo/` (it's currently at repo root).
- `.gitignore` adds: `**/.env`, `**/.env.local`, `ciro/demo/antigravity_traces/`, `backend/venv/`, `node_modules/`.
- `git status` should show a clean tree before tagging.

#### D4. Tag and submit
- `git tag v1.0-submission`
- Push tag + final commit.
- Submission checklist:
  - [ ] Working mobile prototype (APK link or Expo Go QR)
  - [ ] Optional admin panel (Vercel link)
  - [ ] Demo video link
  - [ ] Antigravity trace bundle link
  - [ ] README in repo root of `ciro/`

---

## 3. Evaluation-criteria mapping

How each phase moves the rubric:

| Criterion | Weight | Plan items that lift it |
|---|---|---|
| Antigravity integration | 20% | B1, A3, README Antigravity section (D1) |
| Crisis detection & severity | 25% | A2, B2 scenarios 1 & 2, C4 |
| Resource optimization & multi-crisis | 20% | B2 scenario 1, C1, C3 |
| Impact simulation & stakeholder coord | 15% | B2 scenario 4, C2, C5 |
| Robustness, scalability, cost & latency | 10% | B2 scenario 3, C4, D2 |
| Innovation & UX | 10% | C3, C5, B3 (video production quality) |

---

## 4. Risk register

| Risk | Likelihood | Mitigation |
|---|---|---|
| Firebase project mismatch wastes hours of "why doesn't this sync" debugging | Med | Phase A1 first; lock project ID in a single `firebase.shared.json` |
| `gpt-4o-mini` rate limit during recording | Low | Pre-warm with the 4 scenarios; keep a cached SSE log to replay if live call fails |
| Antigravity trace zip is from an older run and doesn't match current agent names | Med | B1 verification step; regenerate via current orchestrator if mismatched |
| Demo video runs over 5 min | Med | Storyboard in B3 caps each beat; rehearse once before recording |
| Last-minute prompt-injection regression | Low | `backend/tests/test_tools.py` runs in CI ([.github/workflows/ci.yml](.github/workflows/ci.yml)) |

---

## 5. Execution order (recommended)

1. **A1 → A2 → A3** (live data working end-to-end)
2. **B1** (verify trace zip before anything else needs it)
3. **B2** (scenarios — these power both the video and Test Mode)
4. **C3** (Test Mode buttons — depends on B2)
5. **B3** (record video — depends on A, B1, B2, C3)
6. **C1, C2, C4, C5** in any order if time permits
7. **D1 → D2 → D3 → D4** (package and ship)

**Hard stop:** if Phase A or B1/B2/B3 isn't done, do not start Phase C. Ship the critical path first.

---

## 6. Definition of done

The submission is ready when **all** of the following are true:

- [ ] One mobile report flows end-to-end to admin in < 5 s without code changes.
- [ ] Four stress-test scenarios are runnable from the SettingsScreen Test Mode panel.
- [ ] `demo/CIRO_DEMO.mp4` exists, ≤ 5 min, covers all six rubric categories.
- [ ] `ANTIGRAVITY_TRACES.md` indexes traces for signal fusion, confidence scoring, resource trade-offs, and false-alarm recovery.
- [ ] README has cost/latency numbers from a real benchmark, not estimates.
- [ ] `git status` is clean; `v1.0-submission` tag pushed.
- [ ] Submission form filled with: APK, admin URL, demo video, trace bundle, repo URL.
