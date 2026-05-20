# Enterprise Crisis Integration Walkthrough

This walkthrough details the 5-point strategic integrations implemented to link our Expo Mobile first-responder application, Next.js Command Dashboard, and FastAPI backend into a single unified crisis orchestration ecosystem.

---

## Implemented Features

### 1. 📄 Native PDF Sharing & Printing
*   **Added UI Action**: Integrated a premium "Share PDF Ticket" action directly below the emergency dispatch ticket card on the mobile app.
*   **How it Works**: It calls an optimized PDF compiler utilizing `expo-print` to output a high-fidelity formatted document containing situation reports, verified actions, and simulator outputs, then launches the native platform sharing sheet via `expo-sharing`.

### 2. 📡 Real-Time Dual-App Firestore Sync
*   **Mobile-to-Dashboard Loop**: Connected mobile response actions directly to the live Firestore `"reports"` database collection.
*   *   **Acknowledge Dispatch**: Clicking this action on the mobile ticket updates the document state to `"dispatched"` in Firestore.
    *   **Resolve Incident**: Marking the emergency resolved and rating the outcome updates the document state to `"resolved"` in Firestore.
*   **Real-Time Hot Reload**: The Next.js dashboard detects these changes through its 5-second polling loop, immediately updating live KPI cards (Active Emergencies count drops, Deployed Responders shifts, and table histories change status).

### 3. 🛡️ Dynamic Guardrail Auditor
*   **On-Device Inspection**: Programmed a client-side validator `guardrailResult` that parses incoming ingested signals from the FastAPI pipeline.
*   **Validation Parameters**:
    1.  **Ingestion Confidence Check**: Verifies that the model confidence score remains above 85%.
    2.  **Safety Token Scan**: Ensures that situation reports are free of any restricted safety or toxic tokens.
*   **Visual Status**: Renders a reactive audit badge directly on the ticket, showing a glowing green `PASSED (100% GUARDRAILS)` or warning-orange `WARNING (Validation Flags)`.

### 4. 🔊 Bilingual Emergency Audio Briefings (English/Urdu)
*   **Bilingual Speech Synthesizer**: Added an interactive Audio Playbook briefing panel inside the Mobile Overview tab.
*   **Accents & Narration**:
    *   **English Audio**: Uses `en-US` standard text-to-speech to narrate the parsed situation report.
    *   **Urdu Playbook**: Uses `ur-PK` localized speech profiles to read out the verified emergency action plan to native first responders.

### 5. 🚨 Expo Push Notification Broadcasting
*   **FastAPI Background Tasks**: Integrated Expo Push Delivery inside our backend [main.py](file:///f:/Hackathon/ciro/backend/main.py).
*   **Geo-Fenced Alerts**: When a new custom scenario or crisis report executes, the backend grabs geofenced vertices, fetches all users from Firestore with a registered `pushToken`, and broadcasts instant, high-priority push notifications with system sound and warning haptics.
