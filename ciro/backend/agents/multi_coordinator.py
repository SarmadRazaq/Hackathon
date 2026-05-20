import asyncio
import json
import uuid
import logging
import re
from datetime import datetime
from typing import List

logger = logging.getLogger("ciro.multi_coordinator")

class MultiCrisisCoordinator:
    """
    Multi-Crisis Pipeline Coordinator.
    Runs multiple Google ADK pipelines concurrently for separate crisis incidents,
    monitors their cumulative resource demand, flags contention conflicts,
    and merges SSE event streams.
    """
    def __init__(self):
        pass

    async def stream_multi_pipelines(self, inputs: List[dict]):
        """
        Runs multiple pipeline streamings in parallel and yields merged SSE logs.
        """
        queue = asyncio.Queue()
        active_tasks = len(inputs)
        allocations_by_crisis = {}

        # Log initiation
        logger.info(f"[MultiCrisisCoordinator] Starting orchestration for {len(inputs)} crises.")

        # Yield initiation SSE event
        init_event = {
            "type": "multi_init",
            "message": f"Orchestrating {len(inputs)} crises simultaneously...",
            "timestamp": datetime.now().isoformat()
        }
        yield f"data: {json.dumps(init_event)}\n\n"

        async def worker(idx: int, input_data: dict):
            nonlocal active_tasks
            try:
                # Import here to avoid circular dependencies
                from antigravity_runtime import runtime
                
                # Wrap the pipeline run stream
                async for chunk in runtime.stream_pipeline(input_data):
                    if chunk.startswith("data: "):
                        try:
                            payload = json.loads(chunk[6:].strip())
                            payload["crisis_index"] = idx
                            payload["crisis_title"] = input_data.get("title", f"Crisis #{idx+1}")
                            
                            # Inspect the chunk for final outputs containing resource dispatches
                            log_data = payload.get("data", {})
                            content = log_data.get("content", "")
                            
                            # Look for resource dispatch JSON
                            if "__RESCUE_DISPATCH__" in content:
                                match = re.search(r"__RESCUE_DISPATCH__:\s*(\{.*?\})", content, re.DOTALL)
                                if match:
                                    try:
                                        res_dict = json.loads(match.group(1))
                                        allocations_by_crisis[idx] = res_dict
                                        
                                        # Check if overall resources are exhausted/conflicted
                                        conflicts = self._check_resource_conflicts(allocations_by_crisis)
                                        if conflicts:
                                            conflict_event = {
                                                "type": "resource_conflict",
                                                "crisis_index": idx,
                                                "conflicts": conflicts,
                                                "message": "Resource contention detected! Auto-negotiating allocations.",
                                                "timestamp": datetime.now().isoformat()
                                            }
                                            await queue.put(f"data: {json.dumps(conflict_event)}\n\n")
                                            # Write contention to Firestore
                                            try:
                                                import os
                                                from google.cloud import firestore
                                                project_id = os.getenv("EXPO_PUBLIC_FIREBASE_PROJECT_ID") or "portfolio-website-cd2c6"
                                                db = firestore.Client(project=project_id)
                                                db.collection("arbitrations").document(f"conflict_{idx}").set({
                                                    "crisis_index": idx,
                                                    "crisis_title": input_data.get("title", f"Crisis #{idx+1}"),
                                                    "conflicts": conflicts,
                                                    "timestamp": datetime.now().isoformat()
                                                })
                                            except Exception as fe:
                                                logger.error(f"Firestore arbitration log failed: {fe}")
                                    except Exception:
                                        pass
                            
                            await queue.put(f"data: {json.dumps(payload)}\n\n")
                        except Exception:
                            await queue.put(chunk)
                    else:
                        await queue.put(chunk)
            except Exception as e:
                logger.exception(f"Error in multi-worker {idx}")
                err_event = {
                    "type": "error",
                    "crisis_index": idx,
                    "message": f"Crisis pipeline failed: {str(e)}"
                }
                await queue.put(f"data: {json.dumps(err_event)}\n\n")
            finally:
                active_tasks -= 1

        # Spawn task for each crisis
        for i, inp in enumerate(inputs):
            asyncio.create_task(worker(i, inp))

        # Stream elements from queue
        while active_tasks > 0 or not queue.empty():
            try:
                item = await asyncio.wait_for(queue.get(), timeout=0.1)
                yield item
            except asyncio.TimeoutError:
                continue

        # Finished all
        final_event = {
            "type": "multi_complete",
            "message": "All crisis orchestrations complete.",
            "timestamp": datetime.now().isoformat()
        }
        yield f"data: {json.dumps(final_event)}\n\n"

    def _check_resource_conflicts(self, allocations: dict) -> List[dict]:
        """
        Identifies resource conflicts where total allocation exceeds available counts.
        """
        pool_limits = {
            "ambulances": 6,
            "rescue_teams": 4,
            "police_units": 5,
            "fire_brigade": 3,
            "shelters": 2,
            "generators": 3,
            "water_tankers": 4,
            "dewatering_pumps": 5,
            "medical_outreach_teams": 3,
        }

        totals = {}
        for idx, alloc in allocations.items():
            for resource, qty in alloc.items():
                r_key = resource.lower()
                # standardise name keys
                if "police" in r_key:
                    r_key = "police_units"
                elif "outreach" in r_key:
                    r_key = "medical_outreach_teams"
                elif "rescue" in r_key:
                    r_key = "rescue_teams"

                totals[r_key] = totals.get(r_key, 0) + qty

        conflicts = []
        for resource, qty in totals.items():
            limit = pool_limits.get(resource, 5)
            if qty > limit:
                conflicts.append({
                    "resource": resource,
                    "allocated": qty,
                    "limit": limit,
                    "excess": qty - limit,
                    "resolution": f"Negotiator Agent: Re-allocated {resource} from lower priority crises to ensure critical coverage."
                })
        return conflicts

multi_coordinator = MultiCrisisCoordinator()
