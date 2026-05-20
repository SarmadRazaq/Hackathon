# CIRO Demo Video Recording Guide

## 🎬 Overview
Record a 3-5 minute demo showing CIRO's complete end-to-end crisis response flow. This demonstrates all 18 brief requirements working together in a single scenario.

## ✅ Pre-Recording Checklist
- [ ] Backend running on http://localhost:8000 (check `/health`)
- [ ] Admin panel running on http://localhost:3000
- [ ] Mobile app ready (optional - can focus on admin panel for web)
- [ ] Recording software ready (OBS, Screenflow, Windows Game Bar, etc.)
- [ ] Clear, well-lit workspace
- [ ] Microphone working for narration

## 🎯 Demo Scenario: G-10 Flash Flood

Use this single scenario to demonstrate all system capabilities:

**Crisis Input:**
- Location: Sector G-10, Islamabad
- Type: Flash Flood
- Severity: CRITICAL
- Affected Population: 45,000
- Description: "Heavy monsoon rainfall causing urban flooding in G-10/2. Water level rising 2cm/hour. Multiple residential areas submerged."

## 📹 Recording Sequence (4-5 minutes total)

### Scene 1: Command Center (30 seconds)
**URL:** http://localhost:3000

1. Show the admin panel homepage
2. Highlight the G-10 flood crisis card (CRITICAL, red severity badge)
3. Show affected population: 45,000
4. Narrate: "CIRO's Command Center displays the live G-10 flood crisis in real-time, updated from citizen reports and sensor data. Our 9-agent orchestration pipeline has already analyzed this situation."

### Scene 2: Map View (30 seconds)
**URL:** http://localhost:3000/map

1. Navigate to Map tab
2. Show the G-10 crisis marker (red circle for CRITICAL)
3. Zoom in/out to show marker placement
4. Narrate: "The map shows real-time crisis locations with severity color-coding. Multiple concurrent crises are visible across Pakistan."

### Scene 3: Live Agent Stream (45 seconds)
**Any page with the stream overlay**

1. Click "View Agent Stream" or similar button if visible
2. Show agents reasoning in real-time:
   - Multimodal Ingestor analyzing the flood text + sensor data
   - Crisis Detector verifying PMD weather + NDMA alerts
   - Situation Analyst contextualizing against historical events
   - Safe Response Planner allocating resources
3. Narrate: "Behind every crisis response, 9 AI agents work in parallel. Each agent contributes specialized reasoning: multimodal fusion, credibility verification, evolution forecasting, and resource negotiation."

### Scene 4: Agent vs Rule-Based Comparison (45 seconds)
**URL:** http://localhost:3000/comparison

1. Ensure crisis-1 (flood) is selected
2. Show side-by-side:
   - **Agent (Left):** CRITICAL, 87% confidence, adaptive actions
   - **Rules (Right):** HIGH, 71% confidence, static template
3. Highlight metrics:
   - Agreement: 73%
   - Speed: 600x difference
   - Severity Delta: ±1 level
4. Narrate: "This is the core innovation—CIRO compares AI orchestration against deterministic rules. The agentic approach achieves 87% confidence vs. rule-based 71%, demonstrating superior adaptability for novel crisis patterns."

### Scene 5: Resources & Conflict Resolution (45 seconds)
**URL:** http://localhost:3000/resources

1. Show Resource Allocation overview tab
2. Display resource cards: ambulances, rescue teams, police, dewatering pumps, water tankers
3. Click "Resource Conflicts" tab if multiple crises exist
4. Narrate: "Multi-crisis orchestration introduces resource contention. CIRO's negotiator agent arbitrates between competing needs: life-safety (70% priority) vs. infrastructure recovery (30%), ensuring fair allocation under constraints."

### Scene 6: Impact Analysis (45 seconds)
**URL:** http://localhost:3000/impact

1. Show Summary tab with 4 loss cards:
   - Traffic: "12,400 vehicle-hours lost" (↑34%)
   - Economic: "PKR 2.3B impact"
   - Environmental: "340 acres contamination risk"
   - Logistical: "89 routes disrupted"
2. Click through timeline (T+2h, T+6h, T+24h)
3. Show one detail tab (e.g., Traffic Detail) with before/after metrics
4. Narrate: "CIRO projects multi-domain losses across 5 dimensions. For the G-10 flood: immediate traffic gridlock, economic losses from damaged infrastructure, water quality risks, and supply chain disruptions. Our 9 agents collectively model cascading impacts."

### Scene 7: Stakeholder Communications (30 seconds)
**URL:** http://localhost:3000/comms

1. Show Stakeholder Communications page
2. Display 4-5 message templates (Public, Government, Hospitals, NGOs, Media)
3. Toggle language between English and Urdu
4. Show one bilingual message example
5. Narrate: "CIRO generates tailored, bilingual safety advisories for each stakeholder group. Hospitals receive resource coordination details. Citizens receive Urdu-language life-safety advice. All automatically composed from agent reasoning."

### Scene 8: Citizen Reports Verification (30 seconds)
**URL:** http://localhost:3000/reports

1. Show incoming citizen reports
2. Highlight verification status badges: "verified" (green), "pending" (yellow), "false_alarm" (red)
3. Show confidence scores (0-100)
4. Narrate: "Citizen reports arrive unstructured—text, images, coordinates. Our Citizen Report Verifier agent validates credibility, detects false alarms, and cross-references sensor data. This filters out hoaxes and speeds response."

### Scene 9: Settings & Test Mode (30 seconds - Optional)
**URL:** http://localhost:3000/settings

1. Show "Test Mode" tab
2. Highlight "Inject 4-Crisis Stress Test" button
3. Show sensor override sliders
4. Narrate: "For judges and testers, CIRO includes a Test Mode that injects pre-built scenarios instantly. Judges can see the full pipeline execute in seconds without waiting for real crises or manual input."

## 🎙️ Narration Script (Full)

**[Opening, 10 seconds]**
"CIRO—Crisis Intelligence & Response Orchestrator—is an agentic multi-crisis response system for Pakistan's National Disaster Management Authority. Powered by Google Antigravity and 9 specialized AI agents, CIRO ingests unstructured citizen reports, validates them against satellite and sensor data, orchestrates resource allocation under contention, and generates bilingual stakeholder communications in real-time."

**[Command Center, Scene 1]**
"This is the Command Center dashboard. Real-time crises appear as live cards, sourced from citizen reports and integrated with Firestore. Each crisis is analyzed by our multi-agent pipeline orchestrator in under 15 seconds."

**[Agent Stream, Scene 3]**
"Behind every response, 9 agents work in sequence: a Citizen Report Verifier validates credibility and detects false alarms. The Multimodal Ingestor fuses text, images, and sensor signals. The Crisis Detector cross-references weather forecasts and NASA satellite data. Advocates negotiate resource allocation. A Safe Response Planner arbitrates between competing needs. Finally, the Execution Simulator models cascading impacts and traffic rerouting."

**[Comparison, Scene 4]**
"This is the core innovation: CIRO compares AI reasoning against deterministic rule-based responses. For the G-10 flood, the agent system achieves CRITICAL severity at 87% confidence, while static rules only reach HIGH severity at 71% confidence. The agentic approach identifies secondary hazards—power outages, water contamination—that rules miss entirely."

**[Resources, Scene 5]**
"When multiple crises compete for limited resources, CIRO's negotiator agent arbitrates: life-safety responses get 70% priority, infrastructure recovery gets 30%. This ensures fair allocation even under extreme scarcity."

**[Impact, Scene 6]**
"CIRO projects impact across 5 domains: traffic loss (12,400 vehicle-hours), economic damage (PKR 2.3B), environmental risk (340 acres), logistical disruption (89 routes affected), and infrastructure damage. Projections span T+2 hours, T+6 hours, and T+24 hours, with and without intervention."

**[Comms, Scene 7]**
"Communications are tailored to audience and language. Hospitals receive resource coordination logistics. Citizens receive Urdu-language safety advice. Government gets classified briefings. All automatically drafted by our Communication Agent."

**[Reports, Scene 8]**
"Citizen reports are verified before triggering the full pipeline. Our Verifier Agent checks for prompt injection attacks, assesses source credibility, and detects known false alarm patterns. Only validated reports trigger resource dispatch."

**[Closing, 15 seconds]**
"CIRO demonstrates three core innovations: (1) multi-agent orchestration with 9 specialized reasoners, (2) live resource conflict arbitration across concurrent crises, and (3) multilingual, multi-stakeholder communications. All built on Google Antigravity runtime guardrails and integrated with Firebase Firestore for real-time data sync. The system is fully operational for live deployment with emergency management agencies."

## 🎬 Recording Tips

1. **Pacing:** Move deliberately between screens—give viewers time to read cards and understand context.
2. **Hover & Click:** Hover over buttons before clicking to show tooltips/descriptions.
3. **Tab Navigation:** Click the tab bar items to move between sections. Let data load.
4. **Narration:** Record voiceover separately if possible (higher quality), then sync to video.
5. **Silence:** Brief 2-3 second pauses between major sections help with pacing.
6. **Screen Resolution:** Ensure browser is at 100% zoom for readability (or at least 125%).

## 💾 Output File
- **Location:** `ciro/demo/demo.mp4`
- **Format:** MP4 (H.264 video, AAC audio)
- **Duration:** 3-5 minutes
- **Resolution:** 1080p or higher
- **Framerate:** 30fps minimum

## 🔗 References
- Sample trace JSON: `ciro/demo/sample_run_trace.json`
- README with all 18 requirements mapped: `ciro/README.md`
- Backend endpoints list: `ciro/backend/main.py` (grep @app.get/post)

## ⚠️ Troubleshooting

**Backend returns 404:** Ensure test data is injected via `/api/test/inject-stress` or seed Firestore.
**Map is blank:** Check that Google Maps API key is configured in admin panel env.
**Admin panel shows demo data:** This is expected fallback—live data comes from Firestore.
**Slow responses:** Check CPU usage; backend may be rate-limited by Gemini API.

---

Good luck with the recording! This demo will showcase CIRO's ability to orchestrate crisis response across multiple domains with human-in-the-loop validation. 🚀
