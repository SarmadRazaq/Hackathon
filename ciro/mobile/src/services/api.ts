// Fetch-based SSE streaming (no polyfill needed)

import { auth } from "./firebaseConfig";
import { Platform } from "react-native";

// Backend API URL — configured via .env for clean deployment
const BASE_URL = process.env.EXPO_PUBLIC_API_URL || (Platform.OS === "android" ? "http://10.0.2.2:8000" : "http://localhost:8000");

async function getIdToken(): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;
  try {
    return await user.getIdToken();
  } catch {
    return null;
  }
}

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getIdToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ─────────────────────────────────────────────
// TypeScript Interfaces
// ─────────────────────────────────────────────
export interface AnalyzeRequest {
  social_media_text: string;
  weather_location: string;
  traffic_location: string;
  additional_context?: string;
  pushToken?: string;
  language?: string;
}

export interface Scenario {
  id: string;
  title: string;
  description: string;
  icon: string;
  severity_hint: string;
}

export interface AgentLog {
  timestamp: string;
  author: string;
  content?: string;
  tool_call?: {
    name: string;
    args: Record<string, any>;
  };
  tool_response?: {
    name: string;
  };
  is_final: boolean;
  error?: boolean;
}

export interface CIROReport {
  status: string;
  input: AnalyzeRequest;
  pipeline_duration_seconds: number;
  agent_outputs: {
    ingested_signals: string;
    crisis_assessment: string;
    situation_report: string;
    action_plan: string;
    simulation_results: string;
  };
  final_response: string;
  agent_logs: AgentLog[];
  metadata: {
    user_id: string;
    session_id: string;
    model: string;
    agents_count: number;
    timestamp: string;
  };
  scenario?: {
    id: string;
    title: string;
  };
}

// ─────────────────────────────────────────────
// API Functions
// ─────────────────────────────────────────────
export async function checkHealth(): Promise<{ status: string; service: string }> {
  const res = await fetch(`${BASE_URL}/health`);
  if (!res.ok) throw new Error("Backend unreachable");
  return res.json();
}

export async function getScenarios(): Promise<Scenario[]> {
  const res = await fetch(`${BASE_URL}/api/scenarios`);
  if (!res.ok) throw new Error("Failed to fetch scenarios");
  const data = await res.json();
  return data.scenarios;
}

export async function generateTTS(text: string, language: string = "en-US"): Promise<string> {
  const headers = { "Content-Type": "application/json", ...(await authHeaders()) };
  const response = await fetch(`${BASE_URL}/api/tts`, {
    method: "POST",
    headers,
    body: JSON.stringify({ text, language }),
  });
  if (!response.ok) throw new Error("TTS generation failed");
  const data = await response.json();
  return data.audio_base64;
}

export async function syncPlaybookChecklist(docId: string, completedSteps: Record<number, boolean>): Promise<void> {
  const headers = { "Content-Type": "application/json", ...(await authHeaders()) };
  const response = await fetch(`${BASE_URL}/api/playbook/${docId}`, {
    method: "POST",
    headers,
    body: JSON.stringify({ completedSteps }),
  });
  if (!response.ok) throw new Error("Playbook sync failed");
}

/**
 * Stream custom analysis using SSE.
 */
export function analyzeCustomStream(
  request: AnalyzeRequest,
  onLog: (log: AgentLog) => void,
  onDone: (report: CIROReport) => void,
  onError: (error: string) => void
): () => void {
  const url = `${BASE_URL}/api/analyze/stream`;
  return startStream(url, request, onLog, onDone, onError);
}

/**
 * Stream scenario analysis using SSE (GET - no body needed).
 */
export function analyzeScenarioStream(
  scenarioId: string,
  onLog: (log: AgentLog) => void,
  onDone: (report: CIROReport) => void,
  onError: (error: string) => void
): () => void {
  const url = `${BASE_URL}/api/analyze/scenario/${scenarioId}/stream`;
  return startStream(url, undefined, onLog, onDone, onError);
}

function startStream(
  url: string,
  body: any | undefined,
  onLog: (log: AgentLog) => void,
  onDone: (report: CIROReport) => void,
  onError: (error: string) => void
): () => void {
  let cancelled = false;
  let activeXhr: XMLHttpRequest | null = null;

  getIdToken().then((token) => {
    if (cancelled) return;

    const xhr = new XMLHttpRequest();
    activeXhr = xhr;

    xhr.open(body ? "POST" : "GET", url, true);
    if (body) xhr.setRequestHeader("Content-Type", "application/json");
    xhr.setRequestHeader("Accept", "text/event-stream");
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);

    let lastIndex = 0;
    let finished = false;
    let buffer = "";

    const processLine = (line: string) => {
      if (!line.startsWith("data: ")) return;
      try {
        const parsed = JSON.parse(line.slice(6));
        if (parsed.type === "log") onLog(parsed.data);
        else if (parsed.type === "done") { finished = true; onDone(parsed.data); }
        else if (parsed.type === "error") { finished = true; onError(parsed.data); }
      } catch (e) {
        console.error("SSE parse error (length: " + line.length + "):", e);
      }
    };

    const flushBuffer = () => {
      let idx: number;
      while ((idx = buffer.indexOf("\n")) >= 0) {
        processLine(buffer.slice(0, idx).trim());
        buffer = buffer.slice(idx + 1);
      }
    };

    xhr.onprogress = () => {
      if (finished) return;
      buffer += xhr.responseText.substring(lastIndex);
      lastIndex = xhr.responseText.length;
      flushBuffer();
    };

    xhr.onload = () => {
      if (finished) return;
      buffer += xhr.responseText.substring(lastIndex);
      flushBuffer();
      if (buffer.trim()) { processLine(buffer.trim()); buffer = ""; }
      if (!finished) onError("Stream connection closed unexpectedly by server.");
    };

    xhr.onerror = () => { if (!finished) onError("Stream connection failed."); };
    xhr.ontimeout = () => { if (!finished) onError("Stream connection timed out."); };

    xhr.timeout = 120000;
    xhr.send(body ? JSON.stringify(body) : null);
  });

  return () => {
    cancelled = true;
    activeXhr?.abort();
  };
}

// ─────────────────────────────────────────────
// Multi-Crisis Management API Functions
// ─────────────────────────────────────────────
export async function getActiveCrises(token: string): Promise<any[]> {
  try {
    const headers: Record<string, string> = {};
    // Only add auth header if token is provided
    if (token && token.length > 0) {
      headers.Authorization = `Bearer ${token}`;
    }

    const res = await fetch(`${BASE_URL}/api/crises/active`, { headers });

    if (!res.ok) {
      console.warn(`getActiveCrises failed with status ${res.status}`);
      return [];
    }

    const data = await res.json();
    console.log("[getActiveCrises] Response:", data);

    // Handle different response formats
    if (Array.isArray(data)) {
      return data;
    } else if (data && Array.isArray(data.crises)) {
      return data.crises;
    } else if (data && typeof data === 'object') {
      console.warn("[getActiveCrises] Unexpected response format:", data);
      return [];
    }
    return [];
  } catch (err) {
    console.error("[getActiveCrises] Error:", err);
    return [];
  }
}

export async function getResourcePool(token: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/resources/pool`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

export async function getImpactAnalysis(crisisId: string, token: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/impact/${crisisId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

export async function getComparison(crisisId: string, token: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/comparison/${crisisId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

export async function verifyReport(reportId: string, token: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/reports/${reportId}/verify`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });
  return res.json();
}

export async function draftCommsMessage(stakeholderType: string, crisisId: string, language: string, token: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/comms/draft`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ stakeholder_type: stakeholderType, crisis_id: crisisId, language }),
  });
  return res.json();
}

export async function getPublicAdvisories(location?: string): Promise<any[]> {
  const url = location 
    ? `${BASE_URL}/api/public-advisories?location=${encodeURIComponent(location)}`
    : `${BASE_URL}/api/public-advisories`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch public advisories");
  const data = await res.json();
  return data.advisories;
}

