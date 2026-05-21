# CIRO — Crisis Intelligence & Response Orchestrator 🚨

<p align="center">
  <strong>An agentic, multi-crisis emergency response orchestration platform for Pakistan's National Disaster Management Authority (NDMA).</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Mobile-React_Native_%2F_Expo_51-blue?style=for-the-badge&logo=expo" alt="Expo" />
  <img src="https://img.shields.io/badge/Admin-Next.js_16-black?style=for-the-badge&logo=nextdotjs" alt="Next.js" />
  <img src="https://img.shields.io/badge/Backend-FastAPI-009688?style=for-the-badge&logo=fastapi" alt="FastAPI" />
  <img src="https://img.shields.io/badge/Agents-Google_ADK-4285F4?style=for-the-badge&logo=google" alt="Google ADK" />
  <img src="https://img.shields.io/badge/LLM-GPT--4o--mini-412991?style=for-the-badge&logo=openai" alt="GPT-4o-mini" />
  <img src="https://img.shields.io/badge/Database-Firebase_Firestore-FFCA28?style=for-the-badge&logo=firebase" alt="Firestore" />
</p>

---

## Table of Contents

1. [Overall Design](#1--overall-design)
2. [Architecture Overview](#2--architecture-overview)
3. [Repository Layout](#3--repository-layout)
4. [Agents Developed](#4--agents-developed)
5. [Tool Layer (24 Tools)](#5--tool-layer-24-tools)
6. [Mock vs. Real APIs](#6--mock-vs-real-apis)
7. [Integrations Implemented](#7--integrations-implemented)
8. [The Antigravity Safety Layer](#8--the-antigravity-safety-layer)
9. [Tech Stack](#9--tech-stack)
10. [Setup & Installation](#10--setup--installation)
11. [Notes, Assumptions & Limitations](#11--notes-assumptions--limitations)

---

## 1. 🎯 Overall Design

**CIRO** replaces a slow, brittle, rule-based emergency-dispatch process with a pipeline of **9 cooperative AI agents** that ingest messy real-world crisis signals, corroborate them against live data, arbitrate scarce resources across **multiple simultaneous crises**, forecast cascading losses, and produce a verified, auditable response plan in ~60–120 seconds.

### Design principles

| Principle | How it is realised |
|---|---|
| **Corroborate, don't trust** | Every citizen report is cross-checked against weather, traffic, satellite and historical data before any response is planned. |
| **Adversarial planning** | Instead of one planner, two *advocate* agents (Rescue vs. Infrastructure) argue for competing resources; an *arbiter* agent negotiates the final split. |
| **Finite resources are real** | A shared, finite resource pool (6 ambulances, 4 rescue teams, …) forces genuine trade-offs when crises overlap. |
| **Every datum is labelled** | All tool output carries a `data_label` — `LIVE - NASA`, `LIVE API (OpenWeather)`, `SYNTHETIC`, `SYNTHETIC FALLBACK` — so operators can audit provenance. |
| **Guardrails wrap the LLM** | An *Antigravity* runtime validates input before, and pipeline output after, every run — confidence floors, resource-sufficiency checks, and hallucinated-tool detection. |
| **Graceful degradation** | Every live API integration has a synthetic fallback, so a dead endpoint never breaks a run — it just downgrades the `data_label`. |

> **Scope:** CIRO is a hackathon **simulation** (Challenge 3). Dispatched units, tickets and public alerts are mock exercises, not real emergency actions.

---

## 2. 🏗️ Architecture Overview

CIRO is a three-tier system: two clients (a mobile app and an admin dashboard), a FastAPI gateway, and the agent orchestration engine — with Firebase Firestore as the shared real-time state store.

```
┌────────────────────┐      ┌────────────────────┐
│   📱 Mobile App     │      │  🖥️ Admin Panel    │
│  Expo / RN 0.74     │      │   Next.js 16        │
│  citizen reports +  │      │  dispatcher command │
│  field dispatcher   │      │  center + dashboards│
└─────────┬──────────┘      └──────────┬─────────┘
          │   REST + SSE  +  Firestore onSnapshot │
          └────────────────┬──────────────────────┘
                           ▼
              ┌─────────────────────────┐
              │   FastAPI Gateway        │   main.py
              │   REST + SSE endpoints   │   auth, rate limiting
              └────────────┬────────────┘
                           ▼
              ┌─────────────────────────┐
              │  Antigravity Runtime     │   antigravity_runtime.py
              │  • pre-exec input check  │
              │  • post-exec validation  │
              │  • hallucination guard   │
              └────────────┬────────────┘
                           ▼
        ┌──────────────────────────────────────┐
        │  Google ADK  SequentialAgent          │   orchestrator.py
        │  9 agents · output_key state passing  │
        │  LLM: openai/gpt-4o-mini (via LiteLLM) │
        │  24 callable tools                     │   tools.py
        └──────────────────┬────────────────────┘
                           ▼
   ┌───────────────────────────────────────────────────┐
   │ External services: OpenAI · Google Maps ·          │
   │ OpenWeather · NASA FIRMS · Firebase Firestore ·     │
   │ Expo Push · (Google Cloud Storage, optional)        │
   └───────────────────────────────────────────────────┘
```

### Request flow

1. A citizen submits an SOS report (text + photo + location) from the **mobile app**, or a dispatcher triggers analysis from the **admin panel**.
2. The **FastAPI gateway** receives it and hands it to the **Antigravity Runtime**, which validates the input (e.g. rejects text < 5 chars).
3. The runtime invokes the **Google ADK `SequentialAgent`** — 9 agents run in sequence, each writing its result to shared session state under a named `output_key` that downstream agents read.
4. Agents call **24 tools**; tools hit live external APIs where available and fall back to clearly-labelled synthetic data otherwise.
5. The **Antigravity Orchestrator** audits the final output (confidence ≥ 50 %, resource sufficiency for CRITICAL incidents, no hallucinated tools) and attaches a validation block.
6. The result is persisted to the Firestore `incidents` collection; clients receive it live via **Server-Sent Events** (agent-by-agent log streaming) and **Firestore `onSnapshot`**.

### Inter-agent communication

Agents do **not** talk directly. Each ADK `LlmAgent` declares an `output_key`; its output is written into the run's session state, and the next agent's instruction references that key by name. The chain of keys is:

```
verification_report → ingested_signals → crisis_assessment → situation_report
→ rescue_advocacy → infra_advocacy → verified_plan → evolution_projection → simulation_results
```

---

## 3. 📁 Repository Layout

```
Hackathon/
├── ciro/
│   ├── backend/                       FastAPI gateway + agent engine (Python)
│   │   ├── main.py                    REST + SSE API, baseline scorer, test mode
│   │   ├── antigravity_runtime.py     Safety runtime + post-run validation
│   │   ├── auth.py                    Firebase Auth verification
│   │   ├── agents/
│   │   │   ├── orchestrator.py        9-agent SequentialAgent pipeline
│   │   │   ├── verifier.py            Citizen Report Verifier (agent 1)
│   │   │   ├── multi_coordinator.py   Concurrent multi-crisis coordination
│   │   │   └── tools.py               24 tool functions (live APIs + synthetic)
│   │   ├── baseline/                  Rule-based comparison engine
│   │   ├── tests/                     pytest suite
│   │   └── seed_*.py                  Firestore seed scripts
│   ├── admin_panel/                   Next.js 16 dispatcher dashboard
│   │   └── src/app/                   map · reports · resources · impact ·
│   │                                  comparison · comms · analytics · settings
│   ├── mobile/                        Expo SDK 51 / React Native 0.74 app
│   │   └── src/screens/               15 screens (citizen + dispatcher views)
│   └── README.md                      Original deep-dive doc
├── firestore.rules                    Firestore security rules
└── README.md                          ← this file
```

---

## 4. 🤖 Agents Developed

Nine `LlmAgent` instances run as a Google ADK **`SequentialAgent`** ([orchestrator.py](ciro/backend/agents/orchestrator.py#L329)). All agents use the LLM `openai/gpt-4o-mini` routed through ADK's LiteLLM layer.

| # | Agent | Responsibility | Tools it calls | `output_key` |
|---|---|---|---|---|
| 1 | **Citizen Report Verifier** ([verifier.py](ciro/backend/agents/verifier.py)) | First line of defence — detects prompt injection, scores credibility, correlates the report against sensor readings, returns `VERIFIED` / `NEEDS_REVIEW` / `FALSE_ALARM`. | `detect_prompt_injection`, `parse_text_signal`, `get_mock_sensor_data`, `score_source_credibility` | `verification_report` |
| 2 | **Multimodal Ingestor** | Fuses every signal source: runs injection check, vision damage estimation on uploaded photos, image-location cross-verification, text parsing, IoT sensors, emergency-call frequency, and NASA FIRMS hotspots. | `detect_prompt_injection`, `parse_text_signal`, `get_mock_sensor_data`, `get_emergency_call_frequency`, `cross_verify_image_location`, `estimate_image_damage`, `get_nasa_firms_hotspots` | `ingested_signals` |
| 3 | **Crisis Detector** | Verifies and classifies the crisis; cross-references PMD weather, traffic and NDMA alerts; scores source credibility; flags contradictions (e.g. "flood reported but no rainfall → possible water-main burst"); assigns severity + evolution prediction. | `get_weather_data`, `get_traffic_data`, `score_source_credibility`, `get_pmd_weather`, `get_ndma_alerts` | `crisis_assessment` |
| 4 | **Situation Analyst** | Contextualises the incident against historical NDMA events, estimates affected population/infrastructure, and emits a geofenced danger polygon for the map. | `search_incident_history` | `situation_report` |
| 5 | **Rescue Advocate** | *Negotiation party A.* Argues aggressively for life-saving resources (ambulances, rescue teams, fire brigade); emits a `__RESCUE_REQUEST__` JSON block. | — (pure reasoning) | `rescue_advocacy` |
| 6 | **Infrastructure Advocate** | *Negotiation party B.* Argues for containment/recovery resources (police units, generators, water tankers, pumps); emits an `__INFRA_REQUEST__` JSON block. | — (pure reasoning) | `infra_advocacy` |
| 7 | **Safe Response Planner** | *The arbiter.* Mediates the two advocates' competing requests against the finite pool and produces a verified, negotiated action plan. | `negotiate_resource_allocation` | `verified_plan` |
| 8 | **Timeline Forecaster** | Projects crisis evolution at **T+2h / T+6h / T+24h** and flags potential secondary crises if the plan under-performs. | `generate_evolution_projection` | `evolution_projection` |
| 9 | **Execution Simulator** | Simulates traffic rerouting, dispatch, public alerts, ticketing and stakeholder notification; aggregates multi-domain losses; handles false-alarm reclassification; runs the final safety audit. | `simulate_traffic_rerouting`, `simulate_emergency_dispatch`, `simulate_public_alert`, `create_emergency_ticket`, `notify_stakeholders`, `verify_and_reclassify`, `final_safety_check`, `aggregate_impact_losses` | `simulation_results` |

A separate **Multi-Crisis Coordinator** ([multi_coordinator.py](ciro/backend/agents/multi_coordinator.py)) runs several pipelines concurrently, locks the shared resource pool, and surfaces allocation conflicts between simultaneous incidents.

### Why an advocate/arbiter design?

A single planner LLM tends to silently favour whatever it "thinks of first." By splitting planning into **two opposing advocates plus a neutral arbiter**, CIRO makes the resource trade-off *explicit and explainable* — the arbiter's `negotiate_resource_allocation` tool encodes a life-safety protocol (Rescue receives up to 70 % of any contested resource) and records a written justification for every conflict.

---

## 5. 🔧 Tool Layer (24 Tools)

Agents act through **24 deterministic Python tools** in [tools.py](ciro/backend/agents/tools.py). Keeping logic in tools (not prompts) makes behaviour testable and auditable. Tools fall into four classes:

| Class | Tools | Notes |
|---|---|---|
| **Live API integrations** | `get_weather_data`, `get_traffic_data`, `get_nasa_firms_hotspots`, `estimate_image_damage`, `get_pmd_weather`, `get_ndma_alerts` | Hit real external services; degrade to synthetic on failure (see §6). |
| **Synthetic simulations** | `parse_text_signal`, `search_incident_history`, `simulate_traffic_rerouting`, `simulate_emergency_dispatch`, `simulate_public_alert`, `create_emergency_ticket`, `get_mock_sensor_data`, `get_emergency_call_frequency`, `allocate_resources`, `notify_stakeholders`, `verify_and_reclassify`, `negotiate_resource_allocation`, `generate_evolution_projection`, `aggregate_impact_losses`, `cross_verify_image_location` | Realistic models labelled `SYNTHETIC`; some accept frontend "test mode" sensor overrides. |
| **Safety heuristics** | `detect_prompt_injection`, `final_safety_check`, `score_source_credibility` | Layered regex injection detection, plan-safety audit, source-credibility scoring. |
| **Vision** | `estimate_image_damage` | Calls OpenAI `gpt-4o-mini` multimodal to extract water height, structural integrity %, severity and equipment recommendations from a disaster photo. |

**Test-mode sensor overrides:** the mobile/admin UIs expose sliders that inject mock readings (water level, temperature, rainfall, AQI, emergency-call volume). These travel through a Python `contextvars` channel (`sensor_overrides_ctx`) so judges can deterministically drive any scenario without real sensors.

---

## 6. 🌐 Mock vs. Real APIs

CIRO is explicit about what is live and what is simulated. **Every live integration has a synthetic fallback** and re-labels its output (`SYNTHETIC FALLBACK`) when the real call fails — so the system never hard-fails on a dead endpoint.

### ✅ Real / live external APIs

| Service | Used by | Purpose | Auth (env var) | Fallback |
|---|---|---|---|---|
| **OpenAI API** (`gpt-4o-mini`) | Whole agent pipeline + `estimate_image_damage` | LLM reasoning for all 9 agents (via ADK LiteLLM) and multimodal disaster-photo analysis | `OPENAI_API_KEY` | Vision tool → heuristic estimate |
| **Google Maps Platform** | `get_traffic_data`, `_geocode_location` | Geocoding API + Routes API for live traffic congestion and incident coordinates | `GOOGLE_MAPS_API_KEY` | Synthetic congestion estimate |
| **OpenWeather API** | `get_weather_data`, `get_pmd_weather` | Live geocoding + current weather (temperature, humidity, rainfall, wind) | `OPENWEATHER_API_KEY` | Synthetic weather + `SYNTHETIC FALLBACK` label |
| **NASA FIRMS** | `get_nasa_firms_hotspots` | Real MODIS/VIIRS thermal-anomaly (fire) hotspots for a bounding box | Public MAP_KEY (in URL) | 2 mock Pakistan hotspots |
| **Firebase Firestore** | `get_ndma_alerts`, `antigravity_runtime` | Reads live NDMA alerts from the `ndma_alerts` collection; persists every run to `incidents` | Firebase Admin credentials | Hardcoded regional advisories |
| **Expo Push Service** | `stream_pipeline` | Sends a push notification to the reporting citizen once NDMA verifies their report | Expo push token | Silently skipped |
| **Google Cloud Storage** *(optional)* | `run_pipeline` | Uploads citizen images to GCS so the model reads them by URI instead of inline bytes | `GCS_BUCKET_NAME` | Inline base64 bytes |

> **Note on naming:** `get_pmd_weather` ("Pakistan Meteorological Department") and `get_ndma_alerts` are presented as PMD/NDMA feeds for realism, but are technically backed by OpenWeather and Firestore respectively — a deliberate stand-in for government APIs that have no public access.

### 🧪 Mock / synthetic data (clearly labelled `SYNTHETIC`)

These model real-world behaviour with realistic, Pakistan-specific data but do **not** call any external service:

- **`parse_text_signal`** — heuristic NLP: detects crisis type, location, urgency and language (English / Roman Urdu / mixed).
- **`search_incident_history`** — a curated database of real-looking past NDMA incidents (2023–2024 floods, heat emergencies, accidents).
- **`get_mock_sensor_data`** — simulated IoT gauges (water level, temperature, air quality) with random sensor-health states (`ONLINE` / `STALE` / `OFFLINE`).
- **`get_emergency_call_frequency`** — simulated 1122 call-volume spikes and trend detection.
- **`simulate_*`** — traffic rerouting, emergency dispatch, public alerts: realistic templated outcomes with before/after metrics.
- **`allocate_resources` / `negotiate_resource_allocation`** — deterministic optimisation over the finite resource pool.
- **`aggregate_impact_losses`** — analytical multi-domain loss model (traffic / economic / environmental / logistical, in PKR).
- **`create_emergency_ticket`, `notify_stakeholders`, `verify_and_reclassify`, `generate_evolution_projection`, `cross_verify_image_location`**.

---

## 7. 🔗 Integrations Implemented

| Integration | Where | What it does |
|---|---|---|
| **Google ADK orchestration** | [orchestrator.py](ciro/backend/agents/orchestrator.py) | `SequentialAgent` + `LlmAgent` + `Runner` + `InMemorySessionService`; `output_key` state passing between 9 agents. |
| **LiteLLM model routing** | ADK `LlmAgent(model="openai/gpt-4o-mini")` | Lets a Google-ADK pipeline run on an OpenAI model; Vertex AI mode is auto-enabled if `GOOGLE_CLOUD_PROJECT` is set. |
| **Server-Sent Events (SSE)** | `stream_pipeline` → FastAPI → Admin Panel | Streams every agent event and tool call live to the dashboard's agent-log view. |
| **Firestore real-time sync** | Admin Panel `onSnapshot`; backend writes | Incidents and citizen reports update on all clients without polling. |
| **Firebase Authentication** | [auth.py](ciro/backend/auth.py) | Verifies Firebase ID tokens on protected endpoints; mobile has Login/Register screens. |
| **Multimodal image pipeline** | `run_pipeline` | Citizen photo → base64 → (optional GCS upload) → `gpt-4o-mini` vision damage estimate. |
| **Push notifications** | Expo Push API | Citizen is notified when their report is verified and a response is dispatched. |
| **Multi-crisis coordination** | [multi_coordinator.py](ciro/backend/agents/multi_coordinator.py) | Runs concurrent pipelines, locks the shared resource pool, flags allocation conflicts. |
| **Rule-based baseline** | [baseline/](ciro/backend/baseline/), `main.py` | A deterministic scorer the agentic orchestrator is benchmarked against (`GET /api/comparison/{id}`). |
| **Bilingual output** | Pipeline prompt + alert tools | Agents generate reports/alerts in the target language; alerts always carry English + Urdu. |
| **Test mode** | `main.py` test endpoints + UI sliders | Scenario injection and sensor overrides for reproducible demos/grading. |

### Core API endpoints

| Endpoint | Purpose |
|---|---|
| `POST /api/analyze/multi` | Run the concurrent multi-crisis orchestration engine |
| `POST /api/reports/{id}/verify` | Run the Citizen Report Verifier on a report |
| `GET  /api/comparison/{id}` | Agentic orchestrator vs. rule-based baseline metrics |
| `GET  /api/impact` | Live multi-domain impact analysis |
| `POST /api/comms/draft` | Generate bilingual (EN/Urdu) stakeholder messages |
| `GET  /api/logs/export` | Export full execution traces for auditing/grading |

---

## 8. 🛡️ The Antigravity Safety Layer

[antigravity_runtime.py](ciro/backend/antigravity_runtime.py) wraps the raw ADK pipeline with guardrails — the LLM is never executed unchecked.

**`AntigravityRuntime`** — *pre-execution:*
- Validates input (rejects reports under 5 characters).
- Runs the pipeline in a sandbox-mode flag (`CIRO_SANDBOX_MODE`).
- Persists every completed run to the Firestore `incidents` collection.

**`AntigravityOrchestrator.validate_pipeline_output`** — *post-execution audit:*
1. **Confidence floor** — flags the run for human review if crisis confidence < 50 %.
2. **Resource-sufficiency check** — a `CRITICAL` incident with fewer than 5 allocated units is flagged as under-resourced.
3. **Hallucination detection** — every tool call in the logs is checked against a whitelist of 24 registered tools; any unknown tool name raises a hallucination alert.

The resulting `validation` block (`requires_review`, `hallucination_detected`, `confidence_evaluated`, `severity_evaluated`, `notes`) is attached to the response and saved with the incident. In-pipeline, the `detect_prompt_injection` and `final_safety_check` tools add input sanitisation and a plan-level safety score.

---

## 9. 🧰 Tech Stack

| Layer | Technology |
|---|---|
| Agent orchestration | Google ADK (`SequentialAgent`, `LlmAgent`, `Runner`), LiteLLM |
| LLM | OpenAI `gpt-4o-mini` (text + vision) |
| Backend | Python, FastAPI, Uvicorn, Pydantic, SlowAPI (rate limiting), Tenacity (retries) |
| Admin Panel | Next.js 16, React, TypeScript, Tailwind CSS |
| Mobile | Expo SDK 51, React Native 0.74.5, React Navigation |
| Data / Auth | Firebase Firestore, Firebase Admin SDK, Firebase Auth |
| External APIs | OpenAI · Google Maps Platform · OpenWeather · NASA FIRMS · Expo Push · Google Cloud Storage (optional) |

---

## 10. 🚀 Setup & Installation

> Prerequisites: **Python 3.10+**, **Node.js 18+**, an **OpenAI API key**, and a **Firebase project**. Google Maps / OpenWeather / NASA keys are optional — those tools fall back to synthetic data without them.

### Backend

```bash
cd ciro/backend
python -m venv venv
venv\Scripts\activate          # Windows  (macOS/Linux: source venv/bin/activate)
pip install -r requirements.txt
copy .env.example .env         # then edit .env — see variables below
uvicorn main:app --reload --port 8000
```

**Environment variables** (`ciro/backend/.env`):

| Variable | Required | Purpose |
|---|---|---|
| `OPENAI_API_KEY` | ✅ | LLM pipeline + vision damage estimation |
| Firebase Admin credentials | ✅ | Firestore read/write + Auth |
| `GOOGLE_MAPS_API_KEY` | optional | Live traffic + geocoding |
| `OPENWEATHER_API_KEY` | optional | Live weather |
| `GCS_BUCKET_NAME` | optional | Image upload to Google Cloud Storage |
| `CIRO_SANDBOX_MODE` | optional | Antigravity sandbox flag (default `TRUE`) |

### Admin Panel

```bash
cd ciro/admin_panel
npm install
npm run dev                    # http://localhost:3000
```

### Mobile App

```bash
cd ciro/mobile
npm install
npx expo start                 # scan QR with Expo Go
```

Standalone Android APK via EAS:

```bash
cd ciro/mobile
npx eas-cli build --platform android --profile preview
```

### Tests

```bash
cd ciro/backend
pytest                         # agent + heuristics test suite
python verify_guardrails.py    # Antigravity guardrail checks
```

---

## 11. ⚠️ Notes, Assumptions & Limitations

- **Simulation only** — dispatched units, tickets and public alerts are mock exercises, not real emergency actions.
- **Government APIs are stubbed** — Pakistan's PMD and NDMA expose no public APIs; `get_pmd_weather` is backed by OpenWeather and `get_ndma_alerts` by Firestore as realistic stand-ins.
- **Graceful degradation** — any live API failure downgrades that tool's output to `SYNTHETIC FALLBACK` rather than failing the run.
- **Data labelling** — every tool result carries a `data_label` so operators can audit whether a figure is live or simulated.
- **Privacy** — citizen images are used solely for model analysis; they are passed inline or to a private GCS bucket and not written to local disk.
- **Cost & latency** — a full 9-agent run is ~60–120 s of LLM time; `gpt-4o-mini` keeps per-run cost in the sub-cent range.
- **Stateless resource pool** — the finite resource pool resets per call (a hackathon simplification); production would persist pool state across concurrent incidents.

---

<p align="center"><sub>CIRO — built for Pakistan's NDMA · Hackathon Challenge 3</sub></p>
