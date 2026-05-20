#!/usr/bin/env python3
"""
Quick Firestore seeding script for CIRO demo data.
Run from backend directory: python seed_firestore.py
"""

import os
from datetime import datetime, timezone
from google.cloud import firestore

# Get Firebase project ID from environment or use default
PROJECT_ID = os.getenv("EXPO_PUBLIC_FIREBASE_PROJECT_ID") or "portfolio-website-cd2c6"

db = firestore.Client(project=PROJECT_ID)

# Test crisis data (without id field - will be used as document ID)
crisis_docs = {
    "crisis-1": {
        "title": "Flash Flood — G-10, Islamabad",
        "type": "flood",
        "severity": "CRITICAL",
        "status": "active",
        "location": "G-10, Islamabad",
        "affected_population": 45000,
        "coordinates": {"lat": 33.6844, "lng": 73.0479},
        "description": "Heavy rainfall causing severe waterlogging. Roads blocked, vehicles stranded.",
        "detected_at": datetime.now(timezone.utc).isoformat(),
        "source": "Citizen Reports",
        "resources_allocated": {
            "ambulances": 3,
            "rescue_teams": 2,
            "police": 2,
            "dewatering_pumps": 3,
        },
    },
    "crisis-2": {
        "title": "Heat Emergency — Saddar, Karachi",
        "type": "heatwave",
        "severity": "HIGH",
        "status": "active",
        "location": "Saddar, Karachi",
        "affected_population": 120000,
        "coordinates": {"lat": 24.8607, "lng": 67.0011},
        "description": "Heat index exceeding 52°C. Multiple heatstroke cases.",
        "detected_at": datetime.now(timezone.utc).isoformat(),
        "source": "PMD Weather Alert",
        "resources_allocated": {
            "ambulances": 2,
            "medical_outreach": 2,
            "water_tankers": 3,
        },
    },
    "crisis-3": {
        "title": "Multi-Vehicle Accident — M2 Motorway",
        "type": "accident",
        "severity": "MEDIUM",
        "status": "active",
        "location": "M2 Motorway, KM 245",
        "affected_population": 200,
        "coordinates": {"lat": 32.1877, "lng": 72.8397},
        "description": "12-vehicle pileup due to fog. Multiple injuries reported.",
        "detected_at": datetime.now(timezone.utc).isoformat(),
        "source": "Emergency Call 1122",
        "resources_allocated": {
            "ambulances": 2,
            "police": 3,
            "fire_brigade": 1,
        },
    },
}

# Test report data
test_reports = [
    {
        "id": "rpt-1",
        "reporter_id": "CIT-4821",
        "text": "G-10 mein pani bhar gaya hai, gaariyan phans gayi hain! Rescue ko bulao, bachay phanse hain.",
        "location": "G-10/2, Islamabad",
        "coordinates": {"lat": 33.6851, "lng": 73.0125},
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "images": [],
        "upvotes": 14,
        "verification_status": "verified",
        "confidence": 92,
        "crisis_type": "flood",
        "severity": "CRITICAL",
    },
    {
        "id": "rpt-2",
        "reporter_id": "CIT-7293",
        "text": "Multiple cars stuck in water near Jinnah Super Market. Water level is waist-high.",
        "location": "Jinnah Super, F-7, Islamabad",
        "coordinates": {"lat": 33.7109, "lng": 73.0577},
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "images": [],
        "upvotes": 8,
        "verification_status": "verified",
        "confidence": 88,
        "crisis_type": "flood",
        "severity": "HIGH",
    },
    {
        "id": "rpt-3",
        "reporter_id": "CIT-1056",
        "text": "Bohot garmi hai Saddar mein. Mere padosi ko heat stroke ho gaya. Ambulance nahi aa rahi.",
        "location": "Saddar, Karachi",
        "coordinates": {"lat": 24.8615, "lng": 67.0099},
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "images": [],
        "upvotes": 22,
        "verification_status": "verified",
        "confidence": 95,
        "crisis_type": "heatwave",
        "severity": "HIGH",
    },
]

def seed_crises():
    """Seed crisis data to Firestore."""
    print(f"[*] Seeding crises to Firestore project: {PROJECT_ID}")
    for crisis_id, crisis_data in crisis_docs.items():
        db.collection("crises").document(crisis_id).set(crisis_data)
        print(f"  [OK] Added crisis: {crisis_id}")
    print(f"[DONE] Seeded {len(crisis_docs)} crises\n")

def seed_reports():
    """Seed report data to Firestore."""
    print(f"[*] Seeding reports to Firestore project: {PROJECT_ID}")
    for report in test_reports:
        report_id = report.pop("id")
        db.collection("reports").document(report_id).set(report)
        print(f"  [OK] Added report: {report_id}")
    print(f"[DONE] Seeded {len(test_reports)} reports\n")

def seed_incidents():
    """Seed incident data to Firestore (mirror of crises for mobile AnalyticsScreen)."""
    print(f"[*] Seeding incidents to Firestore project: {PROJECT_ID}")
    for crisis_id, crisis_data in crisis_docs.items():
        db.collection("incidents").document(crisis_id).set(crisis_data)
        print(f"  [OK] Added incident: {crisis_id}")
    print(f"[DONE] Seeded {len(crisis_docs)} incidents\n")

if __name__ == "__main__":
    try:
        print("=" * 60)
        print("CIRO FIRESTORE SEEDING SCRIPT")
        print("=" * 60)
        print()

        seed_crises()
        seed_reports()
        seed_incidents()

        print("=" * 60)
        print("[SUCCESS] SEEDING COMPLETE!")
        print("=" * 60)
        print("\n[NEXT] Now restart your mobile app to see live data.")
        print("[NEXT] Admin panel should show crises in Command Center.")
        print("\n")

    except Exception as e:
        print(f"\n[ERROR] {e}")
        print("\nTroubleshooting:")
        print("1. Make sure you have Google Cloud credentials set up")
        print("2. Set GOOGLE_APPLICATION_CREDENTIALS env var")
        print("3. Or use: gcloud auth application-default login")
        exit(1)
