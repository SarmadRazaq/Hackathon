import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, doc, setDoc } from "firebase/firestore";
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
  {
    email: "dispatcher@ndma.gov.pk",
    password: "ciro2026",
    role: "dispatcher",
    name: "NDMA Dispatcher",
  },
  {
    email: "reporter@citizen.pk",
    password: "ciro2026",
    role: "reporter",
    name: "Citizen Reporter",
  },
  {
    email: "admin@ndma.gov.pk",
    password: "ciro2026",
    role: "dispatcher",
    name: "Admin Officer",
  },
];

// ── Mock Incidents ─────────────────────────────
const INCIDENTS = [
  {
    type: "flash_flood",
    location: "G-10, Islamabad",
    severity: "CRITICAL",
    duration: 45,
  },
  {
    type: "heat_emergency",
    location: "Saddar, Karachi",
    severity: "HIGH",
    duration: 32,
  },
  {
    type: "traffic_accident",
    location: "Gulberg, Lahore",
    severity: "MEDIUM",
    duration: 25,
  },
  {
    type: "flash_flood",
    location: "George Town, Karachi",
    severity: "HIGH",
    duration: 55,
  },
  {
    type: "fire",
    location: "I-8, Islamabad",
    severity: "CRITICAL",
    duration: 40,
  },
];

const seedAccounts = async () => {
  console.log("\n=== Creating Test Accounts ===\n");

  for (const account of TEST_ACCOUNTS) {
    try {
      // Try to create the account
      const cred = await createUserWithEmailAndPassword(auth, account.email, account.password);

      // Save role document in Firestore
      await setDoc(doc(db, "users", cred.user.uid), {
        email: account.email,
        role: account.role,
        name: account.name,
        createdAt: new Date().toISOString(),
      });

      console.log(`  ✅ Created: ${account.email} (${account.role})`);
    } catch (e) {
      if (e.code === "auth/email-already-in-use") {
        console.log(`  ⏭️  Already exists: ${account.email} — skipping`);
        // Sign in to get UID and ensure Firestore doc exists
        try {
          const cred = await signInWithEmailAndPassword(auth, account.email, account.password);
          await setDoc(doc(db, "users", cred.user.uid), {
            email: account.email,
            role: account.role,
            name: account.name,
            createdAt: new Date().toISOString(),
          }, { merge: true });
        } catch (_) { /* ignore */ }
      } else {
        console.error(`  ❌ Failed: ${account.email} — ${e.message}`);
      }
    }
  }
};

const seedIncidents = async () => {
  console.log("\n=== Seeding Mock Incidents ===\n");

  for (const inc of INCIDENTS) {
    try {
      await addDoc(collection(db, "incidents"), {
        input: {
          social_media_text: `Mock report for ${inc.type} at ${inc.location}`,
          weather_location: inc.location,
          traffic_location: inc.location,
        },
        agent_outputs: {
          ingested_signals: JSON.stringify({ crisis_type: inc.type, confidence: 0.98 }),
          crisis_assessment: `SEVERITY: ${inc.severity}. Immediate response initiated for ${inc.type}.`,
          situation_report: "Automated analysis completed.",
          verified_plan: "Resources dispatched.",
          simulation_results: "Simulation shows 85% containment.",
        },
        pipeline_status: "completed",
        pipeline_duration_seconds: inc.duration,
        createdAt: new Date().toISOString(),
        dispatcherId: "seed_script",
      });
      console.log(`  ✅ Added: ${inc.type} at ${inc.location}`);
    } catch (e) {
      console.error(`  ❌ Failed to add ${inc.type}: ${e.message}`);
    }
  }
};

const main = async () => {
  console.log("╔══════════════════════════════════════════╗");
  console.log("║        CIRO Database Seed Script         ║");
  console.log("╚══════════════════════════════════════════╝");

  await seedAccounts();
  await seedIncidents();

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
  console.log("\n✨ Seeding complete!\n");
  process.exit(0);
};

main();
