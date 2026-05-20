# CIRO — Crisis Intelligence & Response Orchestrator

Implementation plan for a full-stack crisis management system using Google ADK, FastAPI, and React Native.

---

## Proposed Changes

### Component 1: Backend — Python / FastAPI / Google ADK

---

#### [NEW] [requirements.txt](file:///f:/Hackathon/ciro/backend/requirements.txt)

Dependencies:
```
google-adk>=0.4.0
fastapi
uvicorn[standard]
python-dotenv
pydantic
```

---

#### [NEW] [.env.example](file:///f:/Hackathon/ciro/backend/.env.example)

Template env file with `GOOGLE_API_KEY` placeholder.

---

#### [NEW] [tools.py](file:///f:/Hackathon/ciro/backend/agents/tools.py)

8 tool functions with **realistic mock data** for Pakistan crisis scenarios:

| Tool | Purpose | Returns |
|------|---------|---------|
| `parse_text_signal(text, source)` | NLP parsing of Urdu/English crisis text | `crisis_type`, `location`, `urgency_score`, `key_entities`, `original_language` |
| `get_weather_data(location)` | Weather for Pakistani cities | Temperature, humidity, rainfall, wind, alerts — context-aware per city |
| `get_traffic_data(location)` | Traffic congestion data | Road statuses, congestion levels, blocked routes, average speeds |
| `search_incident_history(crisis_type, location)` | NDMA historical DB lookup | Past incidents, resolution times, lessons learned |
| `simulate_traffic_rerouting(location, blocked_roads)` | Rerouting simulation | Alternate routes, signal timing changes, before/after congestion |
| `simulate_emergency_dispatch(crisis_type, location, severity)` | Dispatch simulation | Units dispatched (Rescue 1122, NDMA, etc.), ETAs, resource allocation |
| `simulate_public_alert(crisis_type, location, severity, population)` | Alert simulation | Bilingual EN/UR messages, delivery channels (SMS, app, radio), reach estimates |
| `create_emergency_ticket(crisis_type, location, severity, actions)` | Ticket creation | Ticket ID, timestamp, full audit trail, assigned agencies |

Each tool returns a Python `dict` — the ADK automatically serializes these for the LLM.

---

#### [NEW] [orchestrator.py](file:///f:/Hackathon/ciro/backend/agents/orchestrator.py)

Google ADK pipeline with **5 LlmAgents** inside a **SequentialAgent**:

```python
from google.adk.agents import SequentialAgent, LlmAgent

signal_ingestor = LlmAgent(
    name="signal_ingestor",
    model="gemini-2.0-flash",
    instruction="You are a crisis signal parser. Analyze raw text (Urdu/English/Roman Urdu)...",
    tools=[parse_text_signal],
    output_key="ingested_signals"
)

crisis_detector = LlmAgent(
    name="crisis_detector",
    model="gemini-2.0-flash",
    instruction="You are a crisis verification agent. Cross-reference social signals with weather and traffic...",
    tools=[get_weather_data, get_traffic_data],
    output_key="crisis_assessment"
)

situation_analyst = LlmAgent(
    name="situation_analyst",
    model="gemini-2.0-flash",
    instruction="You are a situation analyst. Query historical incident data...",
    tools=[search_incident_history],
    output_key="situation_report"
)

response_planner = LlmAgent(
    name="response_planner",
    model="gemini-2.0-flash",
    instruction="You are a crisis response planner. Generate an ordered, time-stamped action plan...",
    tools=[],  # Pure reasoning
    output_key="action_plan"
)

execution_simulator = LlmAgent(
    name="execution_simulator",
    model="gemini-2.0-flash",
    instruction="You are an execution simulator. Run all simulation tools...",
    tools=[simulate_traffic_rerouting, simulate_emergency_dispatch,
           simulate_public_alert, create_emergency_ticket],
    output_key="simulation_results"
)

ciro_orchestrator = SequentialAgent(
    name="ciro_orchestrator",
    sub_agents=[signal_ingestor, crisis_detector, situation_analyst,
                response_planner, execution_simulator]
)
```

Also provides:
- `run_pipeline(input_data)` — async function that creates a session, runs the pipeline, collects all events, and returns structured results + agent logs
- `format_ciro_report(events, state)` — extracts each agent's output from session state and assembles the final `CIROReport` JSON

---

#### [NEW] [main.py](file:///f:/Hackathon/ciro/backend/main.py)

FastAPI server with:

| Endpoint | Description |
|----------|-------------|
| `GET /health` | Returns `{"status": "healthy", "service": "ciro"}` |
| `GET /api/scenarios` | Returns 4 pre-built demo scenarios (flood-g10, flood-george-town, heatwave-karachi, accident-gulberg) |
| `POST /api/analyze` | Accepts `AnalyzeRequest` body, runs the full ADK pipeline, returns `CIROReport` |
| `POST /api/analyze/scenario/{scenario_id}` | Runs a pre-built scenario by ID |

CORS middleware enabled for mobile app access. Pydantic models for request/response validation.

**Pre-built scenarios** are hardcoded dicts matching the 4 demo scenarios from the spec (different `social_media_text`, `weather_location`, `traffic_location`, and `additional_context` for each).

---

#### [NEW] [\_\_init\_\_.py](file:///f:/Hackathon/ciro/backend/agents/__init__.py)

Package init — exports the orchestrator and run function.

---

### Component 2: Mobile App — React Native / Expo / TypeScript

---

#### [NEW] [package.json](file:///f:/Hackathon/ciro/mobile/package.json)

Expo ~51 project with dependencies:
- `expo`, `expo-status-bar`, `expo-linear-gradient`
- `@react-navigation/native`, `@react-navigation/bottom-tabs`, `@react-navigation/stack`
- `react-native-screens`, `react-native-safe-area-context`
- `@expo/vector-icons`

---

#### [NEW] [app.json](file:///f:/Hackathon/ciro/mobile/app.json)

Expo config with app name "CIRO", slug, and scheme.

---

#### [NEW] [tsconfig.json](file:///f:/Hackathon/ciro/mobile/tsconfig.json)

TypeScript config extending `expo/tsconfig.base` with path aliases.

---

#### [NEW] [api.ts](file:///f:/Hackathon/ciro/mobile/src/services/api.ts)

API client with:
- `BASE_URL` constant (configurable)
- TypeScript interfaces: `AnalyzeRequest`, `Scenario`, `CIROReport`, `AgentLog`
- Functions: `checkHealth()`, `getScenarios()`, `analyzeCustom(req)`, `analyzeScenario(id)`

---

#### [NEW] [App.tsx](file:///f:/Hackathon/ciro/mobile/App.tsx)

Navigation root using `@react-navigation/stack`:
- `HomeScreen` → `ResultScreen` (push navigation with params)
- `LogsScreen` accessible from results

---

#### [NEW] [HomeScreen.tsx](file:///f:/Hackathon/ciro/mobile/src/screens/HomeScreen.tsx)

Premium dark-themed input screen:
- **Header** with CIRO branding, glowing accent, and tagline
- **Scenario Cards** — 4 pre-built scenarios as tappable cards with crisis-type icons (🌊, 🔥, 🚗), location, description
- **Custom Input Section** — text inputs for social media text, weather location, traffic location, optional additional context
- **Analyze Button** with loading state and micro-animations
- Visual polish: glassmorphism cards, gradient backgrounds, subtle shadows

---

#### [NEW] [ResultScreen.tsx](file:///f:/Hackathon/ciro/mobile/src/screens/ResultScreen.tsx)

Tabbed results view with **4 tabs** (implemented as in-screen tab bar, not bottom navigation):

| Tab | Content |
|-----|---------|
| **Overview** | Crisis type badge, severity indicator (color-coded), confidence meter, impact stats (population, area, infrastructure) |
| **Action Plan** | Ordered timeline of response actions with agency assignments, timestamps, resource requirements |
| **Simulation** | Before/after state comparison, 4 key metrics cards, rerouting details, dispatch info, alert reach |
| **Ticket** | Formal incident ticket with ID, audit trail, assigned agencies, status |

Header shows a "View Agent Logs" button → navigates to LogsScreen.

---

#### [NEW] [LogsScreen.tsx](file:///f:/Hackathon/ciro/mobile/src/screens/LogsScreen.tsx)

Agent trace viewer:
- **5 collapsible sections**, one per agent
- Each section shows: agent name, status badge (✅), execution time
- Expandable to show: input received, tools called, reasoning steps, output produced
- Monospace font for raw data, syntax-highlighted JSON blocks

---

## Design System

| Token | Value |
|-------|-------|
| Background | `#0A0E1A` (deep navy-black) |
| Surface | `#131929` (dark card) |
| Surface Elevated | `#1A2236` |
| Primary Accent | `#00D4AA` (teal-green) |
| Danger/Critical | `#FF4757` |
| Warning/High | `#FFA502` |
| Info/Medium | `#3742FA` |
| Low | `#2ED573` |
| Text Primary | `#FFFFFF` |
| Text Secondary | `#8892B0` |
| Font | System default (San Francisco / Roboto) |

Severity colors are used consistently for badges, borders, and accent elements throughout the app.

---

## Open Questions

> [!IMPORTANT]
> **API Key**: You'll need a valid `GOOGLE_API_KEY` (from Google AI Studio) with Gemini 2.0 Flash access. The backend won't function without it. Should I set up a fallback mock mode that returns static responses when no API key is configured?

> [!NOTE]
> **Mobile vs Web**: The spec mentions React Native, but since we're in a hackathon setting, I'll build this as a **web-compatible Expo app** (runs in browser via `npx expo start --web`) so you can demo without needing a physical device. The same code runs on iOS/Android via Expo Go.

> [!NOTE]
> **Network Config**: The mobile app's `BASE_URL` will default to `http://localhost:8000`. For physical device testing, you'll need to change this to your machine's local IP.

---

## Verification Plan

### Automated Tests
1. **Backend health check**: `curl http://localhost:8000/health`
2. **Scenarios endpoint**: `curl http://localhost:8000/api/scenarios`
3. **Full pipeline test**: `POST /api/analyze/scenario/flood-g10` — verify complete CIROReport JSON structure
4. **Custom input test**: `POST /api/analyze` with Urdu text — verify crisis detection

### Manual Verification
1. Start backend: `uvicorn main:app --reload --port 8000`
2. Start mobile: `npx expo start --web`
3. Browser walkthrough: select a scenario → verify loading states → check all 4 result tabs → verify agent logs
4. Test all 4 pre-built scenarios for correct detection
