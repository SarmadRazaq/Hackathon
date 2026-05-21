import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, doc, setDoc, getDocs, query, where, deleteDoc } from "firebase/firestore";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDTLrtl9xzdEQXBAzpCKoTldcPtKimaT_I",
  authDomain: "portfolio-website-cd2c6.firebaseapp.com",
  projectId: "portfolio-website-cd2c6",
  storageBucket: "portfolio-website-cd2c6.firebasestorage.app",
  messagingSenderId: "504328760312",
  appId: "1:504328760312:web:6239fc0c04febab088c40d",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// ── Test Accounts ──────────────────────────────
const TEST_ACCOUNTS = [
  { email: "dispatcher@ndma.gov.pk", password: "ciro2026", role: "dispatcher", name: "NDMA Dispatcher" },
  { email: "reporter@citizen.pk",    password: "ciro2026", role: "reporter",   name: "Citizen Reporter" },
  { email: "admin@ndma.gov.pk",      password: "ciro2026", role: "dispatcher", name: "Admin Officer" },
];

const INCIDENTS = [
  { type: "flash_flood",      location: "G-10, Islamabad",       severity: "CRITICAL", duration: 45, coords: { lat: 33.6688, lng: 73.0124 }, affected: 45000, title: "Flash Flood — G-10, Islamabad",          description: "Major urban flooding due to heavy monsoon rainfall in G-10 sector." },
  { type: "heatwave",         location: "Saddar, Karachi",       severity: "HIGH",     duration: 32, coords: { lat: 24.8556, lng: 67.0283 }, affected: 120000, title: "Heat Emergency — Saddar, Karachi",      description: "Heat index exceeding 52°C. Multiple heatstroke cases reported." },
  { type: "accident",         location: "Gulberg, Lahore",       severity: "MEDIUM",   duration: 25, coords: { lat: 31.5131, lng: 74.3485 }, affected: 200,    title: "Multi-Vehicle Accident — Gulberg",      description: "12-vehicle pileup on Main Boulevard." },
  { type: "flash_flood",      location: "George Town, Karachi",  severity: "HIGH",     duration: 55, coords: { lat: 24.85,   lng: 66.99 },   affected: 18000,  title: "Flash Flood — George Town, Karachi",    description: "Nullah overflow flooding residential apartments." },
  { type: "fire",             location: "I-8, Islamabad",        severity: "CRITICAL", duration: 40, coords: { lat: 33.6651, lng: 73.0726 }, affected: 5000,   title: "Industrial Fire — I-8 Markaz",          description: "High tension line snapped; commercial fire spread risk." },
];

// ── Pipeline payloads for deep-link Result view ─
const g10Pipeline = {
  input: { social_media_text: "⚠️ CRITICAL: Massive flooding in G-10 sector Islamabad after 180mm rain cloudburst!", weather_location: "G-10, Islamabad", traffic_location: "G-10, Islamabad" },
  agent_outputs: {
    ingested_signals: JSON.stringify({ crisis_type: "flash_flood", confidence: 0.98, urgency: "IMMEDIATE" }),
    crisis_assessment: "SEVERITY: CRITICAL. Cloudburst has overwhelmed Islamabad's drainage. Evacuation required.",
    situation_report: 'Massive flash flood in G-10 sector. Water depth exceeding 4 feet.\n\n__POLYGON__: [{"latitude":33.6791,"longitude":73.0104},{"latitude":33.6821,"longitude":73.0144},{"latitude":33.6761,"longitude":73.0164},{"latitude":33.6731,"longitude":73.0114}]',
    rescue_advocacy: '__RESCUE_REQUEST__: {"Ambulances":12,"Rescue Teams":8,"Fire Engines":5}',
    infra_advocacy:  '__INFRA_REQUEST__: {"Police Patrols":10,"Dewatering Pumps":6,"Generators":4}',
    verified_plan: "Mobilized 8 rescue boats and 12 medical response vans to G-10. Active routes mapped.",
    simulation_results: 'Dewatering reduced waterlogging by 35%.\n\n__RESCUE_DISPATCH__: {"route":[{"latitude":33.6781,"longitude":73.0104},{"latitude":33.6795,"longitude":73.0125},{"latitude":33.6810,"longitude":73.0140}]}\n\n__IMPACT_METRICS__: {"congestion_reduced_pct":42,"response_time_saved_mins":18}',
  },
  pipeline_status: "completed", pipeline_duration_seconds: 42, dispatcherId: "ndma_auto_agent",
};

const saddarPipeline = {
  input: { social_media_text: "🔥 Severe heatwave in Saddar, Karachi. 45°C, hospitals overflowing.", weather_location: "Saddar, Karachi", traffic_location: "Saddar, Karachi" },
  agent_outputs: {
    ingested_signals: JSON.stringify({ crisis_type: "heat_emergency", confidence: 0.94, urgency: "HIGH" }),
    crisis_assessment: "SEVERITY: HIGH. Extreme urban heat island; heat-exhaustion index over critical threshold.",
    situation_report: 'Surface temps exceeding 45°C. Triage centres at max capacity.\n\n__POLYGON__: [{"latitude":24.8587,"longitude":67.0182},{"latitude":24.8617,"longitude":67.0212},{"latitude":24.8557,"longitude":67.0242},{"latitude":24.8527,"longitude":67.0192}]',
    rescue_advocacy: '__RESCUE_REQUEST__: {"Ambulances":15,"Medical Tents":10,"Water Bowsers":8}',
    infra_advocacy:  '__INFRA_REQUEST__: {"Power Grid Backup":6,"Cooling Fans":20,"Volunteers":50}',
    verified_plan: "Erecting 10 medical cooling relief tents in Saddar Commercial Hub.",
    simulation_results: 'Cooling stations reduced heat-exhaustion indexes by 20%.\n\n__RESCUE_DISPATCH__: {"route":[{"latitude":24.8587,"longitude":67.0182},{"latitude":24.8598,"longitude":67.0200},{"latitude":24.8610,"longitude":67.0210}]}\n\n__IMPACT_METRICS__: {"congestion_reduced_pct":25,"response_time_saved_mins":12}',
  },
  pipeline_status: "completed", pipeline_duration_seconds: 35, dispatcherId: "ndma_auto_agent",
};

const georgeTownPipeline = {
  input: { social_media_text: "🌧️ Nullah overflow in George Town. Residential sector flooded.", weather_location: "George Town, Karachi", traffic_location: "George Town, Karachi" },
  agent_outputs: {
    ingested_signals: JSON.stringify({ crisis_type: "flash_flood", confidence: 0.96, urgency: "HIGH" }),
    crisis_assessment: "SEVERITY: HIGH. Nullah breach due to tidal backflow. High urgency dewatering required.",
    situation_report: 'Water has breached ground floors. Evacuations in progress.\n\n__POLYGON__: [{"latitude":24.8607,"longitude":67.0011},{"latitude":24.8637,"longitude":67.0041},{"latitude":24.8577,"longitude":67.0071},{"latitude":24.8547,"longitude":67.0021}]',
    rescue_advocacy: '__RESCUE_REQUEST__: {"Evacuation Boats":6,"Rescue Teams":4,"Ambulances":5}',
    infra_advocacy:  '__INFRA_REQUEST__: {"Dewatering Pumps":8,"Sandbags":200,"Generators":3}',
    verified_plan: "Dewatering pumps deployed for residential basement clearance.",
    simulation_results: 'Pump deployments cleared basement zones with 85% success.\n\n__RESCUE_DISPATCH__: {"route":[{"latitude":24.8607,"longitude":67.0011},{"latitude":24.8618,"longitude":67.0030},{"latitude":24.8630,"longitude":67.0040}]}\n\n__IMPACT_METRICS__: {"congestion_reduced_pct":50,"response_time_saved_mins":25}',
  },
  pipeline_status: "completed", pipeline_duration_seconds: 50, dispatcherId: "ndma_auto_agent",
};

const seedAccounts = async () => {
  console.log("\n=== Creating Test Accounts ===\n");
  const uidMap = {};
  for (const account of TEST_ACCOUNTS) {
    try {
      const cred = await createUserWithEmailAndPassword(auth, account.email, account.password);
      await setDoc(doc(db, "users", cred.user.uid), {
        email: account.email, role: account.role, name: account.name, createdAt: new Date().toISOString(),
      });
      uidMap[account.email] = cred.user.uid;
      console.log(`  ✅ Created: ${account.email} (${account.role}) — UID: ${cred.user.uid}`);
    } catch (e) {
      if (e.code === "auth/email-already-in-use") {
        console.log(`  ⏭️  Already exists: ${account.email} — signing in to fetch UID`);
        try {
          const cred = await signInWithEmailAndPassword(auth, account.email, account.password);
          await setDoc(doc(db, "users", cred.user.uid), {
            email: account.email, role: account.role, name: account.name, createdAt: new Date().toISOString(),
          }, { merge: true });
          uidMap[account.email] = cred.user.uid;
        } catch (_) { /* ignore */ }
      } else {
        console.error(`  ❌ Failed: ${account.email} — ${e.message}`);
      }
    }
  }
  return uidMap;
};

// Delete previously seeded docs so re-running this script is idempotent.
const clearSeeded = async (collName, predicate) => {
  try {
    const snap = await getDocs(collection(db, collName));
    let deleted = 0;
    for (const d of snap.docs) {
      if (predicate(d.data(), d.id)) {
        await deleteDoc(d.ref);
        deleted++;
      }
    }
    if (deleted > 0) console.log(`  🧹 Cleared ${deleted} old seeded doc(s) from "${collName}"`);
  } catch (e) {
    console.warn(`  ⚠️  Could not clear "${collName}": ${e.message}`);
  }
};

const seedIncidents = async () => {
  console.log("\n=== Seeding Mock Incidents ===\n");
  // Wipe prior seed-script incidents so the count doesn't balloon on re-runs.
  await clearSeeded("incidents", (d) => d.dispatcherId === "seed_script");
  for (const inc of INCIDENTS) {
    try {
      await addDoc(collection(db, "incidents"), {
        input: { social_media_text: `Mock report for ${inc.type} at ${inc.location}`, weather_location: inc.location, traffic_location: inc.location },
        agent_outputs: {
          ingested_signals: JSON.stringify({ crisis_type: inc.type, confidence: 0.98 }),
          crisis_assessment: `SEVERITY: ${inc.severity}. Immediate response initiated for ${inc.type}.`,
          situation_report: "Automated analysis completed.",
          verified_plan: "Resources dispatched.",
          simulation_results: "Simulation shows 85% containment.",
        },
        pipeline_status: "completed", pipeline_duration_seconds: inc.duration,
        createdAt: new Date().toISOString(), dispatcherId: "seed_script",
      });
      console.log(`  ✅ Added incident: ${inc.type} at ${inc.location}`);
    } catch (e) {
      console.error(`  ❌ Failed incident ${inc.type}: ${e.message}`);
    }
  }
};

const seedCrises = async () => {
  console.log("\n=== Seeding Active Crises (powers /api/crises/active) ===\n");
  for (let i = 0; i < INCIDENTS.length; i++) {
    const inc = INCIDENTS[i];
    const docId = `crisis-${inc.type}-${i + 1}`;
    try {
      await setDoc(doc(db, "crises", docId), {
        id: docId,
        type: inc.type,
        title: inc.title,
        location: inc.location,
        severity: inc.severity,
        status: "active",
        detected_at: new Date(Date.now() - (i + 1) * 30 * 60_000).toISOString(),
        source: "Citizen Reports + Sensors",
        affected_population: inc.affected,
        coordinates: { lat: inc.coords.lat, lng: inc.coords.lng },
        description: inc.description,
        resources_allocated: {},
      });
      console.log(`  ✅ Added active crisis: ${inc.title}`);
    } catch (e) {
      console.error(`  ❌ Failed crisis ${inc.title}: ${e.message}`);
    }
  }
};

const seedReports = async (uidMap) => {
  console.log("\n=== Seeding Citizen Reports (My Reports + Nearby) ===\n");

  // Wipe prior seed-script reports so re-runs don't pile up duplicates.
  // Seeded reports are tagged with a `seededBy: "seed_script"` marker below.
  await clearSeeded("reports", (d) => d.seededBy === "seed_script");

  // Collect all reporter UIDs: seeded ones + any other reporter users in Firestore.
  const reporterUids = new Set();
  if (uidMap["reporter@citizen.pk"]) reporterUids.add(uidMap["reporter@citizen.pk"]);
  try {
    const usersSnap = await getDocs(query(collection(db, "users"), where("role", "==", "reporter")));
    usersSnap.forEach((d) => reporterUids.add(d.id));
    console.log(`  ℹ️  Found ${reporterUids.size} reporter user(s) in Firestore`);
  } catch (e) {
    console.warn("  ⚠️  Could not scan users collection:", e.message);
  }
  if (reporterUids.size === 0) {
    console.warn("  ⚠️  No reporter users found — falling back to mock_ndma_reporter");
    reporterUids.add("mock_ndma_reporter");
  }

  const now = Date.now();
  const minutesAgo = (m) => new Date(now - m * 60_000).toISOString();
  const hoursAgo = (h) => new Date(now - h * 3_600_000).toISOString();

  // "My Reports" — seed one set per reporter UID so whichever account the user
  // logs in with, they see their own reports.
  const myReportTemplates = [
    {
      social_media_text: "⚠️ G-10 Islamabad Cloudburst Flooding! Water level rising fast.",
      weather_location: "G-10, Islamabad", traffic_location: "G-10, Islamabad",
      additional_context: "Drains blocked, water entering basement shops.",
      createdAt: minutesAgo(45), status: "dispatched", upvotes: 42,
      pipelineResult: JSON.stringify(g10Pipeline),
    },
    {
      social_media_text: "🔥 Extreme Heat Emergency in Saddar Karachi — cooling tents needed!",
      weather_location: "Saddar, Karachi", traffic_location: "Saddar, Karachi",
      additional_context: "No power, humidity extremely high. Elderly vulnerable.",
      createdAt: hoursAgo(2), status: "processing", upvotes: 18,
      pipelineResult: JSON.stringify(saddarPipeline),
    },
    {
      social_media_text: "🚨 Traffic road block on Main Boulevard Gulberg Lahore.",
      weather_location: "Gulberg, Lahore", traffic_location: "Gulberg, Lahore",
      additional_context: "Multiple cars blocked near underpass, oil spill reported.",
      createdAt: minutesAgo(15), status: "pending", upvotes: 5,
      pipelineResult: null,
    },
  ];

  for (const reporterUid of reporterUids) {
    for (const tpl of myReportTemplates) {
      try {
        await addDoc(collection(db, "reports"), { ...tpl, reporterId: reporterUid, seededBy: "seed_script" });
        console.log(`  ✅ My Report for ${reporterUid.slice(0, 8)}…: ${tpl.weather_location} (${tpl.status})`);
      } catch (e) {
        console.error(`  ❌ Failed: ${tpl.weather_location} — ${e.message}`);
      }
    }
  }

  // Community/Nearby — tied to other UIDs
  const nearbyReports = [
    {
      social_media_text: "🌧️ Nullah overflow near George Town Karachi — breaching ground floors!",
      weather_location: "George Town, Karachi", traffic_location: "George Town, Karachi",
      additional_context: "Tidal backflow blocking estuary, water rising in apartments.",
      createdAt: hoursAgo(3), status: "resolved", upvotes: 56,
      reporterId: "mock_ndma_reporter", pipelineResult: JSON.stringify(georgeTownPipeline),
    },
    {
      social_media_text: "⚡ High tension line snapped near I-8 Markaz Islamabad!",
      weather_location: "I-8, Islamabad", traffic_location: "I-8, Islamabad",
      additional_context: "Wire sparking on wet pavement, main intersection blocked.",
      createdAt: hoursAgo(1), status: "dispatched", upvotes: 31,
      reporterId: "mock_ndma_reporter", pipelineResult: null,
    },
    {
      social_media_text: "🏥 Hospital overflow reported in Rawalpindi — heatstroke surge.",
      weather_location: "Rawalpindi", traffic_location: "Rawalpindi",
      additional_context: "Patients triaged in corridors; need backup ambulances.",
      createdAt: hoursAgo(5), status: "pending", upvotes: 22,
      reporterId: "mock_community_2", pipelineResult: null,
    },
  ];

  for (const rep of nearbyReports) {
    try {
      await addDoc(collection(db, "reports"), { ...rep, seededBy: "seed_script" });
      console.log(`  ✅ Nearby Report: ${rep.weather_location} (${rep.status})`);
    } catch (e) {
      console.error(`  ❌ Failed: ${rep.weather_location} — ${e.message}`);
    }
  }
};

const main = async () => {
  console.log("╔══════════════════════════════════════════╗");
  console.log("║        CIRO Database Seed Script         ║");
  console.log("╚══════════════════════════════════════════╝");

  const uidMap = await seedAccounts();
  await seedIncidents();
  await seedCrises();
  await seedReports(uidMap);

  console.log("\n=== Login Credentials ===\n");
  console.log("  ┌────────────────────────────┬────────────┬────────────┐");
  console.log("  │ Email                      │ Password   │ Role       │");
  console.log("  ├────────────────────────────┼────────────┼────────────┤");
  for (const a of TEST_ACCOUNTS) {
    const email = a.email.padEnd(26);
    const pass = a.password.padEnd(10);
    const role = a.role.padEnd(10);
    console.log(`  │ ${email} │ ${pass} │ ${role} │`);
  }
  console.log("  └────────────────────────────┴────────────┴────────────┘");
  console.log("\n👉 To see My Reports populated, log into the mobile app as:");
  console.log("   reporter@citizen.pk / ciro2026");
  console.log("\n✨ Seeding complete!\n");
  process.exit(0);
};

main();
