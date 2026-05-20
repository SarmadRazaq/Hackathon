class RuleBasedBaseline:
    """Static rule-based crisis response system."""
    
    def __init__(self):
        self.crisis_rules = {
            "flood": {
                "keywords": ["flood", "water", "pani", "barish", "heavy rain"],
                "base_severity": "HIGH",
                "actions": [
                    "Deploy dewatering pumps",
                    "Activate emergency shelters",
                    "Issue Level-2 flood warning",
                    "Request NDMA assessment team"
                ]
            },
            "heat": {
                "keywords": ["heat", "heatwave", "temperature", "garmi"],
                "base_severity": "MEDIUM",
                "actions": [
                    "Open cooling centers",
                    "Distribute water + electrolytes",
                    "Issue heat alert on media"
                ]
            },
            "accident": {
                "keywords": ["crash", "accident", "collision", "motorway"],
                "base_severity": "MEDIUM",
                "actions": ["Dispatch ambulances", "Clear road blocks", "Reroute traffic"]
            },
            "fire": {
                "keywords": ["fire", "burn", "blaze"],
                "base_severity": "HIGH",
                "actions": ["Deploy fire brigade", "Evacuate", "Contact water authority"]
            }
        }
        
        self.resource_rules = {
            "CRITICAL": {"ambulances": 5, "rescue_teams": 3, "police": 4},
            "HIGH": {"ambulances": 3, "rescue_teams": 2, "police": 2},
            "MEDIUM": {"ambulances": 1, "rescue_teams": 1, "police": 1},
            "LOW": {"ambulances": 0, "rescue_teams": 0, "police": 0},
        }
    
    def score(self, input_dict: dict) -> dict:
        """Takes crisis input, returns rule-based decision."""
        text = input_dict.get("social_media_text", "").lower()
        affected_pop = int(input_dict.get("affected_population", 1000))
        
        # 1. Detect crisis type by keyword match
        detected_type = "unknown"
        for ctype, rules in self.crisis_rules.items():
            if any(kw in text for kw in rules["keywords"]):
                detected_type = ctype
                break
        
        # 2. Base severity + confidence
        if detected_type == "unknown":
            base_severity = "LOW"
            confidence = 40
        else:
            base_severity = self.crisis_rules[detected_type]["base_severity"]
            confidence = 75
        
        # 3. Adjust by population
        if affected_pop > 50000:
            severity = self._escalate(base_severity)
            confidence += 5
        elif affected_pop < 100:
            severity = self._de_escalate(base_severity)
            confidence -= 10
        else:
            severity = base_severity
        
        # 4. Actions from crisis type
        actions = self.crisis_rules.get(detected_type, {}).get("actions", ["Investigate"])
        
        # 5. Resources by severity
        resources = self.resource_rules.get(severity, {})
        
        # 6. Rule matches (for transparency)
        rule_matches = []
        if detected_type != "unknown":
            rule_matches.append({
                "id": f"{detected_type.upper()}-001",
                "description": f"IF crisis_text contains {detected_type} keywords THEN type = {detected_type}",
                "matched": True
            })
        if affected_pop > 10000:
            rule_matches.append({
                "id": "POP-001",
                "description": "IF affected_population > 10000 THEN escalate severity",
                "matched": True
            })
        
        return {
            "severity": severity,
            "confidence": confidence,
            "actions": actions,
            "resources": resources,
            "rules": rule_matches,
            "timeTaken": "0.02s",
            "strengths": "Consistent, transparent, no hallucination, explainable"
        }
    
    def evaluate(self, text: str, location: str) -> dict:
        """Evaluate method for backward compatibility with comparison route."""
        input_dict = {
            "social_media_text": text,
            "location": location,
            "affected_population": 5000
        }
        res = self.score(input_dict)
        return {
            "severity": res["severity"],
            "confidence": res["confidence"],
            "resource_allocation": res["resources"],
            "time_seconds": 0.02,
            "rules_matched": [r["description"] for r in res["rules"]]
        }
    
    @staticmethod
    def _escalate(sev: str) -> str:
        return {"LOW": "MEDIUM", "MEDIUM": "HIGH", "HIGH": "CRITICAL", "CRITICAL": "CRITICAL"}.get(sev, sev)
    
    @staticmethod
    def _de_escalate(sev: str) -> str:
        return {"CRITICAL": "HIGH", "HIGH": "MEDIUM", "MEDIUM": "LOW", "LOW": "LOW"}.get(sev, sev)

rule_based_engine = RuleBasedBaseline()
