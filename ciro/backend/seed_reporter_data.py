import os
import uuid
import json
from datetime import datetime, timedelta
from google.cloud import firestore
from dotenv import load_dotenv

load_dotenv()

def seed_reporter_data():
    project_id = os.getenv("EXPO_PUBLIC_FIREBASE_PROJECT_ID") or "portfolio-website-cd2c6"
    db = firestore.Client(project=project_id)
    
    print(f"Connecting to Firestore project: {project_id}")
    
    # 1. Fetch existing reporter users
    users_ref = db.collection("users")
    reporters = list(users_ref.where("role", "==", "reporter").stream())
    
    reporter_uids = []
    if len(reporters) == 0:
        print("No reporter users found. Seeding a default citizen reporter account...")
        # Create a default reporter account document
        default_uid = "citizen_demo_uid"
        db.collection("users").document(default_uid).set({
            "email": "citizen@ndma.gov.pk",
            "role": "reporter",
            "createdAt": datetime.now().isoformat()
        })
        reporter_uids.append(default_uid)
        print(f"Created default reporter user: citizen@ndma.gov.pk with UID: {default_uid}")
    else:
        for rep in reporters:
            reporter_uids.append(rep.id)
            print(f"Found reporter user: {rep.to_dict().get('email')} (UID: {rep.id})")

    # Clear old reports to ensure clean seeding
    print("Clearing old seeded reports...")
    reports_ref = db.collection("reports")
    old_reports = reports_ref.stream()
    deleted_count = 0
    for doc in old_reports:
        # Only delete seeded ones to avoid wiping user's manual submissions
        if doc.id.startswith("seed_rep_") or doc.to_dict().get("reporterId") in reporter_uids or doc.to_dict().get("reporterId") == "mock_ndma_reporter":
            doc.reference.delete()
            deleted_count += 1
    print(f"Cleared {deleted_count} old reports.")

    # 2. Premium Simulation Results JSON structures for deep-link ResultScreen.tsx views
    g10_pipeline_result = {
        "input": {
            "social_media_text": "⚠️ CRITICAL: Massive flooding in G-10 sector Islamabad after 180mm rain cloudburst! Vehicles submerged, houses flooded. Relief teams needed immediately!",
            "weather_location": "G-10, Islamabad",
            "traffic_location": "G-10, Islamabad"
        },
        "agent_outputs": {
            "ingested_signals": json.dumps({
                "crisis_type": "flash_flood",
                "confidence": 0.98,
                "urgency": "IMMEDIATE",
                "vision_assessment": "Severe waterlogging, critical road blockage, risk to lives"
            }),
            "crisis_assessment": "SEVERITY: CRITICAL. Cloudburst has overwhelmed Islamabad's secondary drainage system. Immediate evacuation required in lower ground houses.",
            "situation_report": "Massive flash flood in G-10 sector. Streets are completely submerged with water depth exceeding 4 feet.\n\n__POLYGON__: [\n  {\"latitude\": 33.6791, \"longitude\": 73.0104},\n  {\"latitude\": 33.6821, \"longitude\": 73.0144},\n  {\"latitude\": 33.6761, \"longitude\": 73.0164},\n  {\"latitude\": 33.6731, \"longitude\": 73.0114}\n]",
            "rescue_advocacy": "__RESCUE_REQUEST__: {\"Ambulances\": 12, \"Rescue Teams\": 8, \"Fire Engines\": 5}",
            "infra_advocacy": "__INFRA_REQUEST__: {\"Police Patrols\": 10, \"Dewatering Pumps\": 6, \"Generators\": 4}",
            "verified_plan": "Mobilized 8 rescue boats and 12 medical response vans to G-10 Islamabad sector. Active routes mapped below.",
            "simulation_results": "Dewatering operations successfully reduced waterlogging levels by 35% in simulated time window.\n\n__RESCUE_DISPATCH__: {\n  \"route\": [\n    {\"latitude\": 33.6781, \"longitude\": 73.0104},\n    {\"latitude\": 33.6795, \"longitude\": 73.0125},\n    {\"latitude\": 33.6810, \"longitude\": 73.0140}\n  ]\n}\n\n__IMPACT_METRICS__: {\n  \"congestion_reduced_pct\": 42,\n  \"response_time_saved_mins\": 18\n}"
        },
        "pipeline_status": "completed",
        "pipeline_duration_seconds": 42,
        "createdAt": (datetime.now() - timedelta(hours=2)).isoformat(),
        "dispatcherId": "ndma_auto_agent"
    }

    saddar_pipeline_result = {
        "input": {
            "social_media_text": "🔥 Severe heatwave in Saddar, Karachi. Temp reached 45°C, hospital wards overflowing with heatstroke patients. Directing cooling relief tents.",
            "weather_location": "Saddar, Karachi",
            "traffic_location": "Saddar, Karachi"
        },
        "agent_outputs": {
            "ingested_signals": json.dumps({
                "crisis_type": "heat_emergency",
                "confidence": 0.94,
                "urgency": "HIGH",
                "vision_assessment": "Heavy urban heat island accumulation, high human vulnerability"
            }),
            "crisis_assessment": "SEVERITY: HIGH. Extreme urban heat island effect combined with humidity levels is causing heat exhaustion index to exceed critical threshold.",
            "situation_report": "Saddar area Karachi is recording surface temperatures exceeding 45°C. Hospital triage centers are operating at maximum capacity.\n\n__POLYGON__: [\n  {\"latitude\": 24.8587, \"longitude\": 67.0182},\n  {\"latitude\": 24.8617, \"longitude\": 67.0212},\n  {\"latitude\": 24.8557, \"longitude\": 67.0242},\n  {\"latitude\": 24.8527, \"longitude\": 67.0192}\n]",
            "rescue_advocacy": "__RESCUE_REQUEST__: {\"Ambulances\": 15, \"Medical Tents\": 10, \"Water Bowsers\": 8}",
            "infra_advocacy": "__INFRA_REQUEST__: {\"Power Grid Backup\": 6, \"Cooling Fans\": 20, \"Volunteers\": 50}",
            "verified_plan": "Erecting 10 medical cooling relief tents in Saddar Commercial Hub. Mapped locations below.",
            "simulation_results": "Simulated cooling station interventions successfully reduced heat exhaustion indexes by 20%.\n\n__RESCUE_DISPATCH__: {\n  \"route\": [\n    {\"latitude\": 24.8587, \"longitude\": 67.0182},\n    {\"latitude\": 24.8598, \"longitude\": 67.0200},\n    {\"latitude\": 24.8610, \"longitude\": 67.0210}\n  ]\n}\n\n__IMPACT_METRICS__: {\n  \"congestion_reduced_pct\": 25,\n  \"response_time_saved_mins\": 12\n}"
        },
        "pipeline_status": "completed",
        "pipeline_duration_seconds": 35,
        "createdAt": (datetime.now() - timedelta(hours=4)).isoformat(),
        "dispatcherId": "ndma_auto_agent"
    }

    george_town_pipeline_result = {
        "input": {
            "social_media_text": "🌧️ Nullah overflow near George Town apartments in Karachi. Residential sector flooded, community evacuations started. Teams working on dewatering.",
            "weather_location": "George Town, Karachi",
            "traffic_location": "George Town, Karachi"
        },
        "agent_outputs": {
            "ingested_signals": json.dumps({
                "crisis_type": "flash_flood",
                "confidence": 0.96,
                "urgency": "HIGH",
                "vision_assessment": "Nullah channel breached, high flood velocity, housing structural danger"
            }),
            "crisis_assessment": "SEVERITY: HIGH. George Town nullah has overflowed its embankments due to tidal backflow blockage. High urgency dewatering required.",
            "situation_report": "Water levels in George Town apartments have breached the ground floors. Evacuations in progress.\n\n__POLYGON__: [\n  {\"latitude\": 24.8607, \"longitude\": 67.0011},\n  {\"latitude\": 24.8637, \"longitude\": 67.0041},\n  {\"latitude\": 24.8577, \"longitude\": 67.0071},\n  {\"latitude\": 24.8547, \"longitude\": 67.0021}\n]",
            "rescue_advocacy": "__RESCUE_REQUEST__: {\"Evacuation Boats\": 6, \"Rescue Teams\": 4, \"Ambulances\": 5}",
            "infra_advocacy": "__INFRA_REQUEST__: {\"Dewatering Pumps\": 8, \"Sandbags\": 200, \"Generators\": 3}",
            "verified_plan": "Dewatering pumps deployed to clear residential basement garages. Mapped routes below.",
            "simulation_results": "Pump deployment simulated clearances achieved in basement zones with 85% success.\n\n__RESCUE_DISPATCH__: {\n  \"route\": [\n    {\"latitude\": 24.8607, \"longitude\": 67.0011},\n    {\"latitude\": 24.8618, \"longitude\": 67.0030},\n    {\"latitude\": 24.8630, \"longitude\": 67.0040}\n  ]\n}\n\n__IMPACT_METRICS__: {\n  \"congestion_reduced_pct\": 50,\n  \"response_time_saved_mins\": 25\n}"
        },
        "pipeline_status": "completed",
        "pipeline_duration_seconds": 50,
        "createdAt": (datetime.now() - timedelta(hours=6)).isoformat(),
        "dispatcherId": "ndma_auto_agent"
    }

    # 3. Seed Reports per Reporter User (Populates "My Reports")
    for reporter_uid in reporter_uids:
        print(f"Seeding 'My Reports' for UID: {reporter_uid}...")
        
        my_reports = [
            {
                "social_media_text": "⚠️ G-10 Islamabad Cloudburst Flooding! Water level rising fast, houses in danger!",
                "weather_location": "G-10, Islamabad",
                "traffic_location": "G-10, Islamabad",
                "additional_context": "Drains blocked near market, water entering basement shops.",
                "createdAt": (datetime.now() - timedelta(minutes=45)).isoformat(),
                "status": "dispatched",
                "upvotes": 42,
                "reporterId": reporter_uid,
                "pipelineResult": json.dumps(g10_pipeline_result)
            },
            {
                "social_media_text": "🔥 Extreme Heat Emergency in Saddar Karachi - Cooling tents needed immediately!",
                "weather_location": "Saddar, Karachi",
                "traffic_location": "Saddar, Karachi",
                "additional_context": "No power, humidity extremely high. Old citizens vulnerable.",
                "createdAt": (datetime.now() - timedelta(hours=2)).isoformat(),
                "status": "processing",
                "upvotes": 18,
                "reporterId": reporter_uid,
                "pipelineResult": json.dumps(saddar_pipeline_result)
            },
            {
                "social_media_text": "🚨 Traffic road block on Main Boulevard Gulberg Lahore after accident.",
                "weather_location": "Gulberg, Lahore",
                "traffic_location": "Gulberg, Lahore",
                "additional_context": "Multiple cars blocked near underpass, oil spill reported.",
                "createdAt": (datetime.now() - timedelta(minutes=15)).isoformat(),
                "status": "pending",
                "upvotes": 5,
                "reporterId": reporter_uid,
                "pipelineResult": None
            }
        ]

        for i, rep in enumerate(my_reports):
            doc_id = f"seed_rep_my_{i}_{uuid.uuid4().hex[:4]}"
            db.collection("reports").document(doc_id).set(rep)
            print(f"  Added My Report: {rep['weather_location']} ({rep['status']})")

    # 4. Seed Public Reports (Populates "Nearby Reports" with other UIDs to ensure they show up under community verification feed)
    print("Seeding 'Nearby Reports' for community feed...")
    nearby_reports = [
        {
            "social_media_text": "🌧️ Nullah overflow near George Town Karachi Nullah breaching ground floors!",
            "weather_location": "George Town, Karachi",
            "traffic_location": "George Town, Karachi",
            "additional_context": "Tidal backflow blocking estuary, water rising rapidly in apartments.",
            "createdAt": (datetime.now() - timedelta(hours=3)).isoformat(),
            "status": "resolved",
            "upvotes": 56,
            "reporterId": "mock_ndma_reporter",
            "pipelineResult": json.dumps(george_town_pipeline_result)
        },
        {
            "social_media_text": "⚡ High tension line snapped near I-8 Markaz Islamabad due to strong winds!",
            "weather_location": "I-8, Islamabad",
            "traffic_location": "I-8, Islamabad",
            "additional_context": "Wire is sparking on wet pavement, blocked main intersection.",
            "createdAt": (datetime.now() - timedelta(hours=1)).isoformat(),
            "status": "dispatched",
            "upvotes": 31,
            "reporterId": "mock_ndma_reporter",
            "pipelineResult": None
        }
    ]

    for i, rep in enumerate(nearby_reports):
        doc_id = f"seed_rep_near_{i}_{uuid.uuid4().hex[:4]}"
        db.collection("reports").document(doc_id).set(rep)
        print(f"  Added Nearby Public Report: {rep['weather_location']} ({rep['status']})")

    print("\nDatabase seeding for Reporter role complete! Both My Reports and Nearby feeds are fully populated.")

if __name__ == "__main__":
    seed_reporter_data()
