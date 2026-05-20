import os
import json
import logging
import uuid
import re
from datetime import datetime
from agents.orchestrator import run_pipeline, stream_pipeline

logger = logging.getLogger("ciro.antigravity_runtime")

class AntigravityOrchestrator:
    """
    Antigravity Orchestration Layer.
    Performs confidence checks, severity validations, and hallucination detection
    on the pipeline's final structured outputs.
    """
    @staticmethod
    def validate_pipeline_output(result: dict) -> dict:
        logger.info("[Antigravity Orchestration] Intercepting pipeline output for safety audit.")
        validation_notes = []
        requires_review = False
        hallucination_detected = False
        
        # 1. Confidence threshold check
        logger.info("[Antigravity Orchestration] Audit Step 1: Evaluating confidence threshold...")
        confidence = 100
        agent_outputs = result.get("agent_outputs", {})
        
        # Attempt to extract confidence score
        assessment_str = str(agent_outputs.get("crisis_assessment", ""))
        conf_match = re.search(r'"confidence(?:_pct)?":\s*(\d+)', assessment_str)
        if conf_match:
            confidence = int(conf_match.group(1))
        else:
            confidence = result.get("confidence", 85)
            
        if confidence < 50:
            requires_review = True
            validation_notes.append(f"Confidence score {confidence}% is below safety threshold (50%).")
            logger.warning(f"[Antigravity Orchestration] Safety Warning: confidence ({confidence}%) is below 50%")
        else:
            logger.info(f"[Antigravity Orchestration] Confidence check passed: {confidence}%")
            
        # 2. Severity escalation validation
        logger.info("[Antigravity Orchestration] Audit Step 2: Evaluating severity and resource sufficiency...")
        severity = "MEDIUM"
        sev_match = re.search(r'"severity":\s*"(\w+)"', assessment_str.upper())
        if sev_match:
            severity = sev_match.group(1)
        else:
            severity = result.get("severity", "MEDIUM").upper()
            
        if severity == "CRITICAL":
            # Check resources_allocated in simulation_results or plan
            sim_results = str(agent_outputs.get("simulation_results", ""))
            res_match = re.findall(r'"(ambulances|rescue_teams|police_units|fire_brigade|shelters|generators|water_tankers|dewatering_pumps|medical_outreach_teams)":\s*(\d+)', sim_results.lower())
            total_units = sum(int(qty) for name, qty in res_match)
            if total_units < 5:
                requires_review = True
                validation_notes.append(f"Critical incident has inadequate resource allocation: {total_units} units (minimum 5 required).")
                logger.warning(f"[Antigravity Orchestration] Safety Warning: Critical incident has insufficient resources: {total_units} units")
            else:
                logger.info(f"[Antigravity Orchestration] Resource check passed: {total_units} units allocated for CRITICAL incident.")
        else:
            logger.info(f"[Antigravity Orchestration] Severity check: {severity} (no escalation required)")
                 
        # 3. Hallucination detection
        logger.info("[Antigravity Orchestration] Audit Step 3: Checking for hallucinated/unregistered tools...")
        registered_tools = {
            "parse_text_signal", "get_weather_data", "get_traffic_data", "search_incident_history",
            "simulate_traffic_rerouting", "simulate_emergency_dispatch", "simulate_public_alert",
            "create_emergency_ticket", "get_mock_sensor_data", "get_emergency_call_frequency",
            "score_source_credibility", "allocate_resources", "notify_stakeholders",
            "verify_and_reclassify", "detect_prompt_injection", "final_safety_check",
            "cross_verify_image_location", "negotiate_resource_allocation", "generate_evolution_projection",
            "estimate_image_damage", "get_nasa_firms_hotspots", "get_pmd_weather", "get_ndma_alerts",
            "aggregate_impact_losses"
        }
        
        logs = result.get("agent_logs", [])
        checked_tools_count = 0
        for log in logs:
            tool_call = log.get("tool_call")
            if tool_call:
                name = tool_call.get("name")
                if name:
                    checked_tools_count += 1
                    if name not in registered_tools:
                        hallucination_detected = True
                        validation_notes.append(f"Unregistered/hallucinated tool execution attempted: {name}")
                        logger.error(f"[Antigravity Orchestration] Hallucination Alert: Unregistered tool execution attempted: {name}")
        
        logger.info(f"[Antigravity Orchestration] Tool execution check complete. Checked {checked_tools_count} tool calls. Hallucinations: {hallucination_detected}")
                    
        result["validation"] = {
            "requires_review": requires_review,
            "hallucination_detected": hallucination_detected,
            "confidence_evaluated": confidence,
            "severity_evaluated": severity,
            "notes": validation_notes if validation_notes else ["Pipeline output meets all safety guidelines."]
        }
        logger.info(f"[Antigravity Orchestration] Safety audit completed. Passed: {not requires_review and not hallucination_detected}")
        return result

class AntigravityRuntime:
    """
    Antigravity Runtime Orchestration Layer.
    Provides execution safety, input/output validation, guardrails, and runtime tracing
    for the multi-agent Google ADK pipeline.
    """
    def __init__(self, sandbox_mode: bool = True):
        self.sandbox_mode = sandbox_mode
        self.version = "1.0.0"

    async def execute_pipeline(self, input_data: dict) -> dict:
        """
        Runs the ADK pipeline wrapped with runtime execution guardrails.
        """
        logger.info("[Antigravity Runtime] Intercepting execution request")
        
        # Pre-execution validation
        text = input_data.get("social_media_text", "").strip()
        if len(text) < 5:
            logger.warning("[Antigravity Runtime] Input validation failed: text too short")
            raise ValueError("Input text must be at least 5 characters.")
            
        logger.info(f"[Antigravity Runtime] Env: SANDBOX={self.sandbox_mode}")
        
        # Execute underlying Google ADK pipeline
        result = await run_pipeline(input_data)
        
        # Run validation orchestrator
        result = AntigravityOrchestrator.validate_pipeline_output(result)
        
        is_safe = result.get("is_safety_verified", False) and not result["validation"]["requires_review"]
        
        # Add Antigravity Runtime trace metadata
        result["antigravity_metadata"] = {
            "runtime_version": self.version,
            "sandbox_active": self.sandbox_mode,
            "safety_audit_passed": is_safe,
            "timestamp": datetime.now().isoformat(),
            "execution_policy": "STRICT_COMPLIANCE"
        }
        
        # Save to Firestore
        try:
            from google.cloud import firestore
            project_id = os.getenv("EXPO_PUBLIC_FIREBASE_PROJECT_ID") or "portfolio-website-cd2c6"
            db = firestore.Client(project=project_id)
            doc_id = f"inc_{uuid.uuid4().hex[:6]}"
            db.collection("incidents").document(doc_id).set({
                "id": doc_id,
                "input": input_data,
                "agent_outputs": result.get("agent_outputs", {}),
                "agent_logs": result.get("agent_logs", []),
                "pipeline_status": "completed",
                "pipeline_duration_seconds": result.get("pipeline_duration_seconds", 0),
                "createdAt": datetime.now().isoformat(),
                "dispatcherId": "system",
                "status": "active",
                "validation": result.get("validation", {})
            })
            logger.info(f"[Antigravity Runtime] Successfully saved non-streaming incident {doc_id} to Firestore")
        except Exception as fe:
            logger.error(f"[Antigravity Runtime] Failed to save non-streaming incident: {fe}")
            
        logger.info("[Antigravity Runtime] Verification complete. Attaching runtime metadata.")
        return result

    async def stream_pipeline(self, input_data: dict):
        """
        Yields events from the ADK pipeline stream.
        """
        logger.info("[Antigravity Runtime] Intercepting streaming execution request")
        async for chunk in stream_pipeline(input_data):
            try:
                if chunk.startswith("data: "):
                    cleaned_chunk = chunk[6:].strip()
                    payload = json.loads(cleaned_chunk)
                    if payload.get("type") == "done":
                        final_report = payload.get("data", {})
                        
                        # Validate the final report
                        final_report = AntigravityOrchestrator.validate_pipeline_output(final_report)
                        payload["data"] = final_report
                        chunk = f"data: {json.dumps(payload)}\n\n"
                        
                        from google.cloud import firestore
                        project_id = os.getenv("EXPO_PUBLIC_FIREBASE_PROJECT_ID") or "portfolio-website-cd2c6"
                        db = firestore.Client(project=project_id)
                        
                        doc_id = final_report.get("metadata", {}).get("session_id") or f"inc_{uuid.uuid4().hex[:6]}"
                        db.collection("incidents").document(doc_id).set({
                            "id": doc_id,
                            "input": input_data,
                            "agent_outputs": final_report.get("agent_outputs", {}),
                            "agent_logs": final_report.get("agent_logs", []),
                            "pipeline_status": "completed",
                            "pipeline_duration_seconds": final_report.get("pipeline_duration_seconds", 0),
                            "createdAt": datetime.now().isoformat(),
                            "dispatcherId": final_report.get("metadata", {}).get("user_id") or "system",
                            "status": "active",
                            "validation": final_report.get("validation", {})
                        })
                        logger.info(f"[Antigravity Runtime] Successfully saved streaming incident {doc_id} to Firestore")
            except Exception as fe:
                logger.error(f"[Antigravity Runtime] Failed to save streaming incident: {fe}")
            
            yield chunk

# Singleton runtime instance
runtime = AntigravityRuntime(sandbox_mode=os.getenv("CIRO_SANDBOX_MODE", "TRUE") == "TRUE")

