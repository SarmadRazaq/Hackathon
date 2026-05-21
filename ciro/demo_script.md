# CIRO — Complete Video Demo Script
### 🎥 4–5 Minute Recording Guide (Roman Urdu Voiceover)

> **Recording Plan:** Pehle Role 1 (Citizen) poora record karo, phir Role 2 (NDMA Dispatcher) poora record karo. Dono ko ek video mein combine kar lo.

---

## 📌 Pre-Recording Setup

1. **Backend:** Terminal mein `cd f:\Hackathon\ciro\backend` → `.\venv\Scripts\activate` → `uvicorn main:app --host 0.0.0.0 --port 8000 --reload`
2. **Mobile:** Doosri terminal mein `cd f:\Hackathon\ciro\mobile` → `npx expo start` → Android emulator launch karo
3. **Accounts:**
   - Citizen Account: apna test citizen email/password se login
   - Dispatcher Account: dispatcher role wala account (settings mein role "dispatcher" set hona chahiye)
4. **Emulator:** Portrait mode mein rakho. Screen recording ON karo.

---

## 🎬 ACT 1: CITIZEN ROLE (Awam ka Nazariya)
*⏱ Duration: ~1.5 min*

---

### Scene 1.1 — App Introduction (15 sec)

**Screen:** App kholo, Login screen dikhai de.

**Action:** Citizen account se login karo.

**Voiceover:**
> "Assalam-o-Alaikum! Yeh hai CIRO — Crisis Intelligence and Response Orchestrator. Aaj hum aapko dikhayenge ke kaise ek aam shehri ek emergency report karta hai, aur kaise NDMA ke AI agents us par foran amal karte hain."

---

### Scene 1.2 — Report Incident (30 sec)

**Screen:** Home screen aa jayega. **"Report Incident"** section dikhai dega.

**Action:**
1. Location icon tap karo → Auto-detect hoga (ya Islamabad fallback)
2. Image upload karo (gallery se flood ki tasveer select karo)
3. Text mein likho: **"Severe flooding on Main Street near G-10 Markaz. Water level rising. Multiple cars stranded."**
4. **Submit** button dabao

**Voiceover:**
> "Citizen ko sirf teen cheezein karni hain — location detect karo, ek tasveer upload karo, aur chand alfaaz mein haalaat bayaan karo. Submit karte hi, CIRO ka AI pipeline background mein is report ko process karna shuru kar deta hai. Yeh tasveer analyze hoti hai, PMD ka weather data check hota hai, aur severity calculate hoti hai — sab kuch automatically."

---

### Scene 1.3 — My Reports & Tracking (15 sec)

**Screen:** **"My Reports"** tab par jao.

**Action:** Apni abhi submit ki hui report dikhao. **"Submitted"** status badge highlight karo.

**Voiceover:**
> "Submit karne ke baad, citizen apni report ka status real-time mein track kar sakta hai. Abhi status 'Submitted' hai. Jab NDMA is par action legi, toh yeh status 'Escalated' mein badal jayega — jis se citizen ko tasalli milegi ke uski awaaz suni gayi hai."

---

## 🎬 ACT 2: NDMA DISPATCHER ROLE (Hukumat ka Control Room)
*⏱ Duration: ~3 min*

---

### Scene 2.1 — Login as Dispatcher (10 sec)

**Action:** Pehle citizen account se logout karo. Phir Dispatcher account se login karo.

**Voiceover:**
> "Ab hum NDMA ke Emergency Operations Center mein daakhil hote hain — Dispatcher ke nazariye se. Yahan se poore mulk ki crises control hoti hain."

---

### Scene 2.2 — Citizen Reports & Escalation (30 sec)

**Screen:** Dispatcher ka Home screen khulega with map aur crises.

**Action:**
1. Side drawer kholo (hamburger menu)
2. **"Citizen Reports"** section dikhao — citizen wali reports yahan nazar aayengi
3. Apni abhi submit ki hui report ("Severe flooding on Main Street") dhundho
4. Us par tap karo → **"Escalate Cluster"** button dabao

**Voiceover:**
> "Dispatcher ko sab se pehle awam ki reports nazar aati hain. Yahan meri abhi submit ki hui flood report bhi hai. Dispatcher is report ki details dekhta hai — AI ne pehle se credibility score de diya hai. Ab Dispatcher 'Escalate Cluster' button dabata hai, jis se yeh report ek official national-level Crisis ban jaati hai aur poore dashboard par aa jaati hai."

---

### Scene 2.3 — Active Crises Dashboard & Map (20 sec)

**Screen:** Main map view par wapas jao.

**Action:**
1. Map par active crises ke markers dikhao
2. Apni escalate ki hui crisis ka pin point karo
3. Severity indicators aur affected population numbers dikhao

**Voiceover:**
> "Escalate hone ke baad, yeh crisis poore mulk ke real-time Crises Map par aa jaati hai. Har marker ki severity, affected population, aur resources dikhai dete hain. Dispatcher yahan se har crisis ka overview dekh sakta hai."

---

### Scene 2.4 — Test Mode: Live AI Agent Processing (45 sec) ⭐

**Screen:** Side drawer kholo → **"Test Mode"** (⚡ flash icon) tap karo.

**Action:**
1. Koi bhi scenario select karo (e.g., "Flash Flood — G-10")
2. **"Play"** button dabao
3. Live loading stream dekhao — agents ka naam aur unka kaam real-time mein dikhai dega
4. Stream complete hone tak wait karo → Result screen automatically khulegi

**Voiceover:**
> "CIRO ka sabse powerful feature yeh hai ke yeh koi black box nahi hai. Test Mode mein hum live dekh sakte hain ke AI agents kis tarah soch rahe hain. Dekhiye — pehle Multimodal Ingestor ne sab data sources ko merge kiya, phir Crisis Detector ne severity calculate ki, Situation Analyst ne historical data se compare kiya, Rescue Advocate ne life-saving resources maangi, Infrastructure Advocate ne logistics plan banaya, aur finally Response Arbiter ne sab ka analysis kar ke final action plan diya."

---

### Scene 2.5 — Agent Comms: Text-Based Agent Transcript (30 sec) ⭐ NEW

**Screen:** Result screen par **"Agent Comms"** tab tap karo (yeh doosra tab hai).

**Action:**
1. Agent-by-agent chat bubbles scroll karo
2. Har agent ka naam, role, aur output dikhao
3. Bottom par **"Pipeline Execution Timeline"** bhi dikhao

**Voiceover:**
> "Agent Comms tab mein aap har agent ki communication text form mein padh sakte hain — jaise ek group chat. Multimodal Ingestor ne kya data fuse kiya, Crisis Detector ne kya severity di, Rescue Advocate ne kaunse resources maangay — sab kuch yahan transparently likha hai. Neeche Pipeline Execution Timeline mein agents ke chronological activation ka record hai."

---

### Scene 2.6 — The Council: Multi-Agent Debate (20 sec)

**Screen:** **"The Council"** tab tap karo.

**Action:**
1. Rescue Advocate vs Infrastructure Advocate ka debate dikhao
2. Arbiter ka final decision dikhao
3. Resource allocation tug-of-war bar highlight karo

**Voiceover:**
> "The Council mein Rescue Advocate aur Infrastructure Advocate aapas mein negotiate karte hain — ek jaan bachane ki priority rakhta hai, doosra infrastructure repair ki. Arbiter dono ki baat sun kar resources ka final allocation tay karta hai. Yeh multi-agent debate system hai jo ensure karta hai ke koi bhi perspective miss na ho."

---

### Scene 2.7 — AI-Driven Action Plan (30 sec) ⭐ NEW

**Screen:** Side drawer kholo → **"Action Plan"** tap karo.

**Action:**
1. Ek crisis select karo (top scrollbar se)
2. AI loading animation dikhao — "Formulating response checklist..."
3. AI-generated plan steps dikhao
4. **"AI Regenerate"** button dikhao (top-right)
5. Pehle pending step ko tap kar ke Active (yellow) banao
6. Phir dobara tap kar ke Completed (green) banao

**Voiceover:**
> "Action Plan ab hardcoded nahi hai — Gemini AI agent har crisis ke liye specific plan generate karta hai. Flood ke liye alag, heatwave ke liye alag, earthquake ke liye alag. Dispatcher in steps ko manage kar sakta hai — pending se active, active se completed. Aur agar plan pasand nahi, toh 'AI Regenerate' button se naya plan bana sakte hain. Yeh ek living, AI-driven command system hai."

---

### Scene 2.8 — Additional Features Quick Showcase (20 sec)

**Action:** Tezi se yeh dikhao:
1. **"Simulation"** tab → Monte Carlo simulation results
2. **"Stakeholders"** tab → Auto-drafted messages (Public, Government, Media, NGO)
3. **"Impact"** tab → Economic loss projections
4. **"Resources"** tab → Resource pool allocation

**Voiceover:**
> "CIRO mein aur bhi bohut kuch hai — Monte Carlo simulation future scenarios predict karti hai, auto-drafted stakeholder messages Urdu aur English dono mein, economic impact analysis, aur resource pool management. Sab kuch ek jagah, ek dashboard mein."

---

### Scene 2.9 — Conclusion (15 sec)

**Screen:** Wapas main map view par jao.

**Voiceover:**
> "CIRO zameeni halaat aur hukumat ke response ke darmiyan ka farq khatam karta hai. Ek shehri ki ek report se le kar, AI agents ki transparent analysis, aur NDMA ke action plan tak — sab kuch real-time, data-driven, aur accountable hai. Pakistan ki pehli multi-agent AI crisis management platform. Shukriya."

---

## 💡 Pro Tips for Recording

| Tip | Detail |
|-----|--------|
| **Pacing** | Har screen par 2-3 second ruko pehle action lene se. Judges ko samajhne ka waqt do. |
| **Errors** | Agar emulator mein glitch aaye toh ghabrao mat. Confidently bolte raho! |
| **Transitions** | Jab role switch karo (Citizen → Dispatcher), clear break do — "Ab hum Dispatcher ke role mein..." |
| **Highlight** | New features (Agent Comms, AI Action Plan) par zyada waqt do — yeh differentiators hain. |
| **Audio** | Emulator ka volume mute karo taake voiceover clear rahe. |
| **Screen Recording** | OBS ya built-in recorder use karo. 1080p minimum. |

---

## 📋 Feature Checklist for Demo

- [ ] Citizen: Login
- [ ] Citizen: Auto-detect location
- [ ] Citizen: Upload image + text report
- [ ] Citizen: Submit & see "Submitted" status
- [ ] Dispatcher: Login
- [ ] Dispatcher: View citizen reports
- [ ] Dispatcher: Escalate cluster
- [ ] Dispatcher: View crises on map
- [ ] Dispatcher: Test Mode — live AI agent stream
- [ ] Dispatcher: Agent Comms — text transcript ⭐
- [ ] Dispatcher: The Council — multi-agent debate
- [ ] Dispatcher: AI Action Plan — generate & manage ⭐
- [ ] Dispatcher: Simulation, Stakeholders, Impact, Resources (quick)
- [ ] Conclusion
