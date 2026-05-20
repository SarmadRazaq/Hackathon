# Implementation Plan — 5-Point Enterprise Crisis Orchestration Integration

This plan details the implementation of our 5 key strategic integrations across the CIRO Next.js Admin Panel, FastAPI Backend, and Expo Mobile Application. This ties the entire crisis lifecycle together with live state updates, automated guardrail verification, PDF sharing, and bilingual TTS narration.

---

## Proposed Changes

### 1. Mobile Client Integration (Expo / React Native)

#### [MODIFY] [ResultScreen.tsx](file:///f:/Hackathon/ciro/mobile/src/screens/ResultScreen.tsx)
*   **Ticket Actions (PDF Printing & Sharing)**: Add direct visual actions at the bottom of the Dispatch Ticket (`renderTicket` tab). Pressing the download button will trigger the existing `exportPDF` function with clean Haptics, utilizing `expo-print` to output a high-fidelity PDF, and `expo-sharing` to launch the native share sheet.
*   **Dual-App Live State Synchronization**: Connect the mobile state actions directly to the live Firestore `"reports"` database collection. When a first responder clicks **"Acknowledge Dispatch"** or **"Resolve Incident"**, the mobile app will issue an `updateDoc` call directly to Firestore, which instantly updates the document status.
*   **Real Guardrails Audit**: Implement a dynamic, client-side accuracy audit parser. It will check:
    1.  **Ingestion Confidence**: Ensure `confidence` inside `ingested_signals` is > 0.85.
    2.  **Geospatial Boundaries**: Validate that situation report coordinate vertices are within valid numeric scales.
    3.  **Language Safety**: Verify no restricted tokens are present in input texts.
    If all checks pass, render a green `PASSED (100% GUARDRAILS)` status; if warnings exist, display a warning-orange `WARNING (Confidence < 85%)` tag on the dispatch ticket.
*   **Spoken Playbook (Bilingual TTS)**: Add an interactive, high-fidelity briefing speaker row. Responders can click:
    *   🔊 **English Briefing**: Narrates the parsed situation report via `expo-speech` in a clean professional accent.
    *   📢 **Urdu Playbook Narration**: Narrates the verified action plan in `ur-PK` via local voice profiles, allowing localized dispatchers to listen to instructions in their native language.

---

### 2. Backend API & Push Services (FastAPI)

#### [MODIFY] [main.py](file:///f:/Hackathon/ciro/backend/main.py)
*   **Dynamic Geofencing & Expo Push Notifications**: Add a push alert trigger to our backend. When a new custom simulation or citizen report executes:
    1.  Extract coordinate boundaries from the pipeline's generated geofenced `__POLYGON__`.
    2.  Query Firestore for all active citizens/first-responders registered with an Expo `pushToken`.
    3.  Broadcast a real-time, high-priority geo-alert warning them of an active danger zone matching their location.

---

## Verification Plan

### Manual Verification
1.  **Mobile Ticket Print**: Navigate to the Ticket tab inside a crisis scenario on the mobile app, click the PDF Print icon, and confirm the native iOS/Android sharing sheet appears.
2.  **Live State Syncing**: Select the "Heat Emergency Saddar Karachi" scenario. Click "Resolve Incident" on the mobile device. Look at the Next.js Analytics dashboard on the web browser and confirm:
    *   The "Active Emergencies" counter instantly drops.
    *   The status badge for "Saddar, Karachi" in the Incident History table dynamically updates from `Processing` to `Resolved` within 5 seconds.
3.  **Guardrail Indicators**: Verify that the Accuracy Audit badge updates its status dynamically depending on whether a scenario has high or low confidence.
4.  **Bilingual Briefings**: Click the speaker buttons and verify clear audio playback in both English and Urdu.
5.  **Geofenced Push Alerts**: Trigger a simulation and verify that the target push notifications are received on the mobile screen with system sound.
