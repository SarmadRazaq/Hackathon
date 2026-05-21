# CIRO — Video Scripts

Two videos are required for submission:

1. **Solution Demo** — 3–5 min — overall workflow, how agency is achieved, what makes it innovative.
2. **Antigravity Usage** — 2–3 min — screen recording of how the team used Google Antigravity.

> Bracketed `[…]` lines are stage directions. Quoted `"…"` lines are the exact voiceover.

---
---

# SCRIPT 1 — Solution Demo (target 4:30)

## Pre-flight checklist (before recording)

- [ ] Backend running. For an instant demo, set `CIRO_ENABLE_PREWARM=true` in `backend/.env`, restart, and wait for the log line **"Scenario pre-warm complete (5 cached / 5 total)"**.
- [ ] `node seed_db.mjs` has been run once — Firestore has 5 crises, 5 incidents, 6 citizen reports.
- [ ] Mobile: `npx expo start --clear`, emulator on the login screen.
- [ ] Have **two** logins ready: `reporter@citizen.pk / ciro2026` and `dispatcher@ndma.gov.pk / ciro2026`.
- [ ] Notification permission already granted (tap Dispatch once before recording).
- [ ] Emulator: no Metro red box, dev overlays off, 1080p / 30 fps capture, mic on.

---

## Scene 1 — The problem & CIRO (0:00 → 0:25, 25 s)

**Screen:** Title card → login screen.

**Voiceover:**

> "Every monsoon, cities like Islamabad and Karachi face flooding, heatwaves, accidents, and infrastructure failures — frequently several at the same time. The warning signs exist: social media, weather sensors, traffic feeds, emergency calls. But they're scattered, and response stays slow and reactive.
>
> CIRO — the Crisis Intelligence and Response Orchestrator — is a nine-agent system coordinated by Google Antigravity. It fuses those signals, detects and classifies crises on its own, allocates limited resources across simultaneous emergencies, and coordinates every stakeholder — autonomously."

---

## Scene 2 — A citizen reports a crisis (0:25 → 1:00, 35 s)

**Screen:** Mobile, logged in as **reporter** → "Report Incident" tab.

**Action:**
1. Tap **Report Incident**.
2. Tap **Auto-detect location** — GPS fills the field.
3. Toggle language to **اردو**.
4. Dictate or type: `G-10 mein pani 3 feet tak aa gaya hai, gaariyan phans gayi hain`.
5. Attach a photo.
6. Tap **Submit Report**.
7. Switch to **My Reports** — the report appears instantly.

**Voiceover:**

> "It starts with the public. A citizen in G-10 Islamabad files a flood report — in Urdu, with a photo, geo-tagged automatically. CIRO's mobile app works offline, queues reports if the network drops, and de-duplicates repeated sightings.
>
> This is signal source one of three: citizen reports — fused alongside weather sensors and traffic data."

---

## Scene 3 — Autonomous signal fusion & detection (1:00 → 1:40, 40 s)

**Screen:** Log out → log in as **dispatcher** → "Crises" tab + Crisis Intelligence Map.

**Action:**
1. Show the dispatcher dashboard — header stats (active crises, projected impact).
2. Scroll the live crisis cards — each severity-colored.
3. Open the Crisis Intelligence Map — markers across Pakistan.
4. Tap a marker → detail drawer.

**Voiceover:**

> "On the command side, CIRO has already done the work. Without anyone touching it, the system cross-referenced the citizen report against PMD weather data and NASA satellite hotspots, classified it as a flash flood, scored its confidence, estimated the affected population — 45,000 people — and placed it on the live map.
>
> **This is where agency begins.** No dispatcher classified this crisis. No rule decided its severity. The agents did — by reasoning over conflicting, real-world signals."

---

## Scene 4 — The 9-agent pipeline & the advocacy model (1:40 → 2:25, 45 s)

**Screen:** Test Scenarios → tap a **⚡ Pre-warmed** scenario → Result screen tabs.

**Action:**
1. Open **Test Scenarios** — point at the ⚡ Pre-warmed badges.
2. Tap **Flash Flood — G-10, Islamabad**.
3. Result screen opens. Cycle: **Overview → The Council → Action Plan**.
4. Pause on **The Council** tab — show the two advocate agents.

**Voiceover:**

> "Behind every crisis runs a nine-agent pipeline. An ingestor fuses the signals. A credibility verifier screens for misinformation and prompt injection. A detector classifies. An analyst contextualizes against historical data.
>
> Then the innovation: **two agents argue.** The Rescue Advocate fights for ambulances and rescue teams to save lives. The Infrastructure Advocate fights for generators and pumps to contain damage. They compete for the same limited pool. A third agent — the Safe Response Planner — arbitrates between them and produces a single verified plan.
>
> That's genuine agency: agents with conflicting objectives, negotiating a decision no single rule could reach."

---

## Scene 5 — The agent executes the plan, live (2:25 → 3:05, 40 s)

**Screen:** Response Action Plan screen.

**Action:**
1. Open **Response Action Plan**.
2. Tap **Execute Playbook Live**.
3. Let the camera hold while the 5 phases tick: each goes **▶ active** → **✓ completed**, progress bar filling.

**Voiceover (over the live execution):**

> "Once the plan is verified, CIRO executes it. Watch — the agent steps through the response playbook in real time: ingestion and analysis, safety verification, resource mobilization, public alert broadcast, evacuation coordination.
>
> Each phase activates, completes, and hands off to the next — autonomously. The dispatcher isn't doing this. They're supervising it. CIRO moves a crisis from detection to coordinated response without waiting on a human at every step."

---

## Scene 6 — Multi-crisis coordination & resource trade-offs (3:05 → 3:40, 35 s)

**Screen:** Impact Simulation → Resources screen.

**Action:**
1. Open **Impact Simulation** — scroll the crisis tabs ("five simultaneous crises").
2. Tap the **Heat Emergency** tab — show loss projections (economic, traffic, environmental, logistical).
3. Switch to **Resources** — show the constrained pool and contention.

**Voiceover:**

> "Real cities don't get one crisis at a time. CIRO is tracking five — a flood, a heat emergency, a fire, an accident, a nullah overflow — all competing for the same ambulances and rescue teams.
>
> The multi-crisis coordinator ranks them by severity, urgency, and travel time, and shows the trade-off explicitly: who gets the resource, who waits, and why. The Impact Simulator projects losses across four domains — and compares the agent plan against a no-action baseline: a 44 percent reduction in casualties at T-plus-2 hours."

---

## Scene 7 — Stakeholder coordination & false-alarm recovery (3:40 → 4:10, 30 s)

**Screen:** AI Stakeholder Comms.

**Action:**
1. Open **AI Stakeholder Comms**.
2. Select a crisis, pick **Citizen Broadcast**, toggle **اردو** then back to **English**.
3. Tap **Dispatch Message** — the local notification banner drops.
4. (Optional) Mention the false-alarm path verbally.

**Voiceover:**

> "For every crisis, CIRO drafts tailored, bilingual messages — for citizens, for WASA, for NDMA command — and dispatches them as live alerts.
>
> And when signals conflict — if a field report says the flooding is actually a burst water main — the verifier agent re-classifies the incident, retracts the public flood alert, and notifies the utility instead. CIRO recovers from its own false positives."

---

## Scene 8 — Innovation summary & close (4:10 → 4:30, 20 s)

**Screen:** Title card with headline points.

**Voiceover:**

> "What makes CIRO different: competing advocate agents instead of rigid rules. A live, self-executing response playbook. Bilingual, offline-first field reporting. And a Google Antigravity runtime that audits every decision for safety.
>
> One fused intelligence layer. Multiple crises. Autonomous, coordinated response. **CIRO.**"

**End on:** logo + repo URL.

---
---

# SCRIPT 2 — Antigravity Usage (target 2:45)

> This video proves the **mandatory Google Antigravity requirement**. It is a screen
> recording of your development environment + the runtime layer + the traces.
> Fill the `‹…›` placeholders with your actual Antigravity workspace footage.

## Pre-flight checklist

- [ ] Google Antigravity workspace open with the CIRO project loaded.
- [ ] These files open in tabs: `backend/antigravity_runtime.py`, `antigravity_chat_history.md`, `antigravity_coordination_logs.md`.
- [ ] `antigravity_project_traces.zip` extracted to a folder you can show.
- [ ] Backend running so you can show one live trace in the terminal.
- [ ] Screen capture 1080p, mic on.

---

## Scene 1 — What Antigravity is & why (0:00 → 0:25, 25 s)

**Screen:** Google Antigravity workspace, CIRO project visible.

**Voiceover:**

> "CIRO's multi-agent system is built and orchestrated with Google Antigravity. We used Antigravity in two ways: as our agentic development environment to plan and build the system, and as the runtime orchestration layer that supervises every agent decision in production.
>
> This recording walks through both."

---

## Scene 2 — Building CIRO with Antigravity agents (0:25 → 1:05, 40 s)

**Screen:** Antigravity workspace — show the agent task/chat history. Open `antigravity_chat_history.md`.

**Action:**
1. Scroll the Antigravity agent conversation / task history.
2. Point at ‹a specific task you gave an Antigravity agent — e.g. "build the 9-agent orchestrator", "design the resource allocation tool"›.
3. Show the agent's plan and the artifact it produced.

**Voiceover:**

> "During development, we tasked Antigravity agents with discrete build goals — the nine-agent orchestrator, the resource-allocation logic, the signal-fusion tools. For each, Antigravity produced a plan, executed it, and left a verifiable trace of its reasoning and the artifact it generated.
>
> ‹Describe one concrete task here — what you asked, how Antigravity broke it down, what it built.› This is the coordination history, preserved in `antigravity_chat_history.md`."

---

## Scene 3 — The Antigravity runtime guardrail layer (1:05 → 1:50, 45 s)

**Screen:** `backend/antigravity_runtime.py` open in the editor.

**Action:**
1. Scroll to the `AntigravityRuntime` class — `execute_pipeline()`.
2. Then `AntigravityOrchestrator.validate_pipeline_output()` — scroll its three audit steps.

**Voiceover:**

> "In production, Antigravity is the runtime that wraps the Google ADK agent pipeline. Every execution passes through `AntigravityRuntime.execute_pipeline`.
>
> Before the agents run, it validates the input. After they run, the `AntigravityOrchestrator` performs a three-step safety audit. **Step one** — confidence: any crisis assessment below a 50 percent confidence threshold is flagged for human review. **Step two** — severity: a CRITICAL incident with fewer than five resource units allocated is flagged as under-resourced. **Step three** — hallucination detection: every tool the agents called is checked against a registry of twenty-four approved tools; an unregistered tool call is caught and blocked.
>
> Every run is stamped with an Antigravity metadata block — execution policy STRICT_COMPLIANCE — and the result is persisted with its audit verdict."

---

## Scene 4 — A real Antigravity trace (1:50 → 2:25, 35 s)

**Screen:** Terminal with backend logs while a scenario runs, OR the extracted `antigravity_project_traces.zip` contents.

**Action:**
1. Trigger a scenario (mobile or `curl`).
2. Show the backend log lines: `[Antigravity Orchestration] Audit Step 1…`, `Step 2…`, `Step 3…`.
3. Open `antigravity_coordination_logs.md` and point at: signal interpretation, confidence scoring, priority ranking, resource trade-offs.

**Voiceover:**

> "Here's a live trace. As a crisis runs, Antigravity logs every audit step: it interprets the fused signals, scores confidence, ranks priority across competing crises, evaluates the resource trade-off the advocate agents negotiated, and confirms the action plan is safe to execute.
>
> When signals conflict or confidence drops, the trace shows the recovery path — re-classification and alert retraction. Every one of these traces is bundled in `antigravity_project_traces.zip` with the submission."

---

## Scene 5 — Close (2:25 → 2:45, 20 s)

**Screen:** Split — Antigravity workspace + the trace files.

**Voiceover:**

> "Google Antigravity coordinates CIRO end to end — from how we built the agents, to how it supervises and audits every decision they make at runtime. Planning, execution, and safety — all traceable. That's CIRO on Antigravity."

---
---

# Shared production notes

- **Record voice separately** from the screen capture — easier to re-time and clean.
- Calm, deliberate cadence. Pause one beat at every scene cut.
- Never apologize on camera ("ignore this error…"). If something breaks, cut and re-take.
- Only describe what the viewer can actually see happening — no vaporware claims.
- Demo video hard limit 5:00; Antigravity video hard limit 3:00. If over, cut Demo Scene 6 to 25 s.
- Urdu phrase for Demo Scene 2: `جی-10 میں پانی تین فٹ تک آ گیا ہے، گاڑیاں پھنس گئی ہیں` — rehearse twice.
- Export both at ≥1080p. Add captions if time allows — accessibility scores under UX.

## Evaluation-criteria coverage check

| Criterion | Weight | Covered by |
|---|---|---|
| Antigravity integration | 20% | Script 2 entirely; Demo Scene 1 & 8 |
| Crisis detection & severity | 25% | Demo Scenes 3, 4 |
| Resource optimization & multi-crisis | 20% | Demo Scenes 4, 6 |
| Impact simulation & stakeholder coord | 15% | Demo Scenes 6, 7 |
| Robustness, scalability, cost/latency | 10% | Demo Scene 5 (live exec), Script 2 Scene 3 (guardrails) |
| Innovation & UX | 10% | Demo Scenes 4, 5, 8 |
