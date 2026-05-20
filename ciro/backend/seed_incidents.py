import os
import uuid
import json
from datetime import datetime, timedelta
from google.cloud import firestore
from dotenv import load_dotenv

load_dotenv()

def seed_data():
    project_id = "portfolio-website-cd2c6"
    db = firestore.Client(project=project_id)
    
    print(f"Seeding incidents to project: {project_id}")
    
    incidents = [
        {
            "id": "inc_001",
            "type": "flash_flood",
            "location": "G-10, Islamabad",
            "severity": "CRITICAL",
            "duration": 42
        },
        {
            "id": "inc_002",
            "type": "heat_emergency",
            "location": "Saddar, Karachi",
            "severity": "HIGH",
            "duration": 35
        },
        {
            "id": "inc_003",
            "type": "traffic_accident",
            "location": "Gulberg, Lahore",
            "severity": "MEDIUM",
            "duration": 28
        },
        {
            "id": "inc_004",
            "type": "flash_flood",
            "location": "George Town, Karachi",
            "severity": "HIGH",
            "duration": 50
        },
        {
            "id": "inc_005",
            "type": "fire",
            "location": "I-8, Islamabad",
            "severity": "CRITICAL",
            "duration": 38
        }
    ]
    
    for inc in incidents:
        doc_id = f"seed_{inc['id']}_{uuid.uuid4().hex[:4]}"
        
        # Build structure matching AnalyticsScreen.tsx requirements
        data = {
            "input": {
                "social_media_text": f"Mock report for {inc['type']} at {inc['location']}",
                "weather_location": inc['location'],
                "traffic_location": inc['location'],
            },
            "agent_outputs": {
                "ingested_signals": json.dumps({"crisis_type": inc['type'], "confidence": 0.95}),
                "crisis_assessment": f"SEVERITY: {inc['severity']}. This {inc['type']} is being monitored.",
                "situation_report": "Mock analysis of the situation.",
                "verified_plan": "Mock rescue plan dispatched.",
                "simulation_results": "Mock simulation successful."
            },
            "pipeline_status": "completed",
            "pipeline_duration_seconds": inc['duration'],
            "createdAt": (datetime.now() - timedelta(hours=inc['duration'])).isoformat(),
            "dispatcherId": "seed_system"
        }
        
        db.collection("incidents").document(doc_id).set(data)
        print(f"Added incident: {inc['type']} at {inc['location']}")

    print("\nDatabase seeding complete! Your Executive Dashboard should now be populated.")

if __name__ == "__main__":
    seed_data()
