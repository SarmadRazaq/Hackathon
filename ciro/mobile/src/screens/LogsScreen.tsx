import React, { useState, useRef, useEffect } from "react";
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, Animated, Platform, Share,
  StatusBar as RNStatusBar
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

const copyToClipboard = async (text: string) => {
  try {
    await Share.share({ message: text, title: "Session ID" });
  } catch {
    // user cancelled share sheet — that's fine
  }
};

const C = {
  bg: "#181B22", surface: "#222731", surfaceEl: "#2E3442",
  primary: "#FFAE00", danger: "#FF5252", warning: "#FF9F0A",
  info: "#0A84FF", low: "#30D158",
  text: "#F8FAFC", textSec: "#94A3B8", border: "#384152aa",
};

const AGENT_META: Record<string, { icon: string; color: string; desc: string }> = {
  multimodal_ingestor: { icon: "radio", color: "#00D4AA", desc: "Fuses 5 sources: text, image, sensors, calls, weather" },
  signal_ingestor: { icon: "radio", color: "#00D4AA", desc: "Fuses 5 sources: text, image, sensors, calls, weather" },
  crisis_detector: { icon: "warning", color: "#FFA502", desc: "Verifies crisis + credibility scoring + evolution prediction" },
  situation_analyst: { icon: "analytics", color: "#3742FA", desc: "Queries historical incident DB + danger polygons" },
  safe_response_planner: { icon: "list", color: "#FF6B81", desc: "Constrained resource allocation + action planning" },
  response_planner: { icon: "list", color: "#FF6B81", desc: "Constrained resource allocation + action planning" },
  execution_simulator: { icon: "flask", color: "#7C4DFF", desc: "Runs 6 tools + stakeholder coordination + false alarm recovery" },
  antigravity_supervisor: { icon: "shield-checkmark", color: "#00E5FF", desc: "Safety audit validation + hallucination checks" },
};

const AGENT_ORDER = [
  "multimodal_ingestor", "crisis_detector", "situation_analyst",
  "safe_response_planner", "execution_simulator", "antigravity_supervisor",
];

export default function LogsScreen({ route, navigation }: any) {
  const { logs = [], metadata = {} } = route.params;
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, []);

  const agentLogs: Record<string, any[]> = {};
  const systemLogs: any[] = [];

  for (const log of logs) {
    const author = log.author || "system";
    if (AGENT_ORDER.includes(author)) {
      if (!agentLogs[author]) agentLogs[author] = [];
      agentLogs[author].push(log);
    } else {
      systemLogs.push(log);
    }
  }

  const toggleExpand = (agent: string) => {
    setExpanded((prev) => ({ ...prev, [agent]: !prev[agent] }));
  };

  const renderLogEntry = (log: any, i: number) => (
    <View key={i} style={styles.logEntry}>
      <Text style={styles.logTime}>
        {log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : "--"}
      </Text>

      {log.tool_call && (
        <View style={styles.toolCallBox}>
          <View style={styles.toolCallHeader}>
            <Ionicons name="construct-outline" size={12} color={C.warning} />
            <Text style={styles.toolCallName}> {log.tool_call.name}()</Text>
          </View>
          <Text style={styles.toolCallArgs}>
            {JSON.stringify(log.tool_call.args, null, 2)}
          </Text>
        </View>
      )}

      {log.tool_response && (
        <View style={[styles.toolCallBox, { borderColor: C.low + "33" }]}>
          <View style={styles.toolCallHeader}>
            <Ionicons name="checkmark-circle-outline" size={12} color={C.low} />
            <Text style={[styles.toolCallName, { color: C.low }]}> {log.tool_response.name} response</Text>
          </View>
        </View>
      )}

      {log.content && (
        <Text style={[styles.logContent, log.error && { color: C.danger }]}>
          {log.content.length > 500 ? log.content.substring(0, 500) + "..." : log.content}
        </Text>
      )}

      {log.is_final && (
        <LinearGradient colors={[C.primary + "22", "transparent"]} style={styles.finalBadge}>
          <Ionicons name="checkmark-done" size={10} color={C.primary} />
          <Text style={styles.finalBadgeText}> FINAL OUTPUT</Text>
        </LinearGradient>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" backgroundColor="transparent" translucent={true} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color={C.text} />
        </TouchableOpacity>
        <View style={{ alignItems: "center" }}>
          <Text style={styles.headerTitle}>Agent Trace</Text>
          <Text style={styles.headerSub}>Pipeline Execution Logs</Text>
        </View>
        <View style={styles.logCount}>
          <Text style={styles.logCountText}>{logs.length}</Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Animated.View style={{ opacity: fadeAnim }}>
          {/* Pipeline Metadata Card */}
          <View style={styles.pipelineInfo}>
            <TouchableOpacity
              style={styles.pipelineRow}
              onPress={() => copyToClipboard(metadata.session_id || "N/A")}
              activeOpacity={0.7}
            >
              <View style={styles.metaItem}>
                <Ionicons name="finger-print-outline" size={14} color={C.primary} />
                <Text style={styles.pipelineLabel}> Session</Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text style={styles.pipelineValue}>{(metadata.session_id || "N/A").slice(0, 12)}…</Text>
                <Ionicons name="share-outline" size={13} color={C.textSec} />
              </View>
            </TouchableOpacity>
            <View style={[styles.pipelineRow, { borderTopWidth: 1, borderTopColor: C.border }]}>
              <View style={styles.metaItem}>
                <Ionicons name="hardware-chip-outline" size={14} color={C.warning} />
                <Text style={styles.pipelineLabel}> Model</Text>
              </View>
              <Text style={styles.pipelineValue}>{metadata.model || "N/A"}</Text>
            </View>
            <View style={[styles.pipelineRow, { borderTopWidth: 1, borderTopColor: C.border }]}>
              <View style={styles.metaItem}>
                <Ionicons name="git-network-outline" size={14} color={C.info} />
                <Text style={styles.pipelineLabel}> Agents</Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text style={[styles.pipelineValue, { color: C.primary }]}>{metadata.agents_count || 5}</Text>
                <Text style={[styles.pipelineLabel, { marginLeft: 4 }]}>active</Text>
              </View>
            </View>
          </View>

          {/* Agent Sections */}
          {AGENT_ORDER.map((agent, idx) => {
            const meta = AGENT_META[agent];
            const entries = agentLogs[agent] || [];
            const isExpanded = expanded[agent];
            const toolCalls = entries.filter((e) => e.tool_call).length;
            const hasContent = entries.some((e) => e.content);

            return (
              <View key={agent} style={styles.agentSection}>
                <TouchableOpacity style={styles.agentHeader} onPress={() => toggleExpand(agent)} activeOpacity={0.7}>
                  <View style={styles.agentLeft}>
                    <View style={[styles.agentIconBg, { backgroundColor: meta.color + "15" }]}>
                      <Ionicons name={meta.icon as any} size={16} color={meta.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.agentName}>
                        {idx + 1}. {agent.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                      </Text>
                      <Text style={styles.agentDesc} numberOfLines={1}>{meta.desc}</Text>
                    </View>
                  </View>
                  <View style={styles.agentRight}>
                    {entries.length > 0 ? (
                      <View style={styles.statusBadge}>
                        <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: C.low, marginRight: 4 }} />
                        <Text style={styles.statusText}>{entries.length}</Text>
                      </View>
                    ) : (
                      <View style={[styles.statusBadge, { borderColor: C.textSec + "22" }]}>
                        <Text style={[styles.statusText, { color: C.textSec }]}>--</Text>
                      </View>
                    )}
                    <Ionicons
                      name={isExpanded ? "chevron-up" : "chevron-down"}
                      size={14} color={C.textSec}
                      style={{ marginLeft: 6 }}
                    />
                  </View>
                </TouchableOpacity>

                {/* Summary chips */}
                {entries.length > 0 && !isExpanded && (
                  <View style={styles.summaryBar}>
                    {toolCalls > 0 && (
                      <View style={styles.summaryChip}>
                        <Ionicons name="construct-outline" size={10} color={C.warning} />
                        <Text style={styles.summaryChipText}> {toolCalls} tools</Text>
                      </View>
                    )}
                    {hasContent && (
                      <View style={styles.summaryChip}>
                        <Ionicons name="chatbox-outline" size={10} color={C.primary} />
                        <Text style={styles.summaryChipText}> reasoning</Text>
                      </View>
                    )}
                  </View>
                )}

                {isExpanded && (
                  <View style={styles.agentEntries}>
                    {entries.length > 0 ? (
                      entries.map((entry, i) => renderLogEntry(entry, i))
                    ) : (
                      <Text style={styles.noLogs}>No log entries captured</Text>
                    )}
                  </View>
                )}
              </View>
            );
          })}

          {/* System logs */}
          {systemLogs.length > 0 && (
            <View style={styles.agentSection}>
              <TouchableOpacity style={styles.agentHeader} onPress={() => toggleExpand("system")} activeOpacity={0.7}>
                <View style={styles.agentLeft}>
                  <View style={[styles.agentIconBg, { backgroundColor: C.textSec + "15" }]}>
                    <Ionicons name="server-outline" size={16} color={C.textSec} />
                  </View>
                  <View>
                    <Text style={styles.agentName}>System / Orchestrator</Text>
                    <Text style={styles.agentDesc}>Pipeline coordination events</Text>
                  </View>
                </View>
                <View style={styles.agentRight}>
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusText}>{systemLogs.length}</Text>
                  </View>
                  <Ionicons name={expanded["system"] ? "chevron-up" : "chevron-down"} size={14} color={C.textSec} style={{ marginLeft: 6 }} />
                </View>
              </TouchableOpacity>
              {expanded["system"] && (
                <View style={styles.agentEntries}>
                  {systemLogs.map((entry, i) => renderLogEntry(entry, i))}
                </View>
              )}
            </View>
          )}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "android" ? (RNStatusBar.currentHeight || 24) + 12 : 48,
    paddingBottom: 14,
    backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  backBtn: { padding: 6, borderRadius: 10, backgroundColor: C.surfaceEl, borderWidth: 1, borderColor: C.border },
  headerTitle: { fontSize: 16, fontWeight: "800", color: C.text, letterSpacing: 0.5 },
  headerSub: { fontSize: 10, color: C.textSec, marginTop: 1 },
  logCount: {
    backgroundColor: C.primary + "15", width: 32, height: 32, borderRadius: 16,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: C.primary + "33",
  },
  logCountText: { fontSize: 11, color: C.primary, fontWeight: "800" },

  scroll: { flex: 1 },

  pipelineInfo: {
    backgroundColor: C.surface, borderRadius: 16, padding: 14,
    marginBottom: 16, borderWidth: 1, borderColor: C.border,
  },
  pipelineRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8 },
  metaItem: { flexDirection: "row", alignItems: "center" },
  pipelineLabel: { fontSize: 11, color: C.textSec, fontWeight: "600" },
  pipelineValue: { fontSize: 11, color: C.text, fontFamily: "monospace", fontWeight: "600" },

  agentSection: {
    backgroundColor: C.surface, borderRadius: 16, marginBottom: 10,
    borderWidth: 1, borderColor: C.border, overflow: "hidden",
  },
  agentHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    padding: 14,
  },
  agentLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  agentIconBg: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center", marginRight: 10 },
  agentName: { fontSize: 12, fontWeight: "700", color: C.text },
  agentDesc: { fontSize: 9, color: C.textSec, marginTop: 1 },
  agentRight: { flexDirection: "row", alignItems: "center" },
  statusBadge: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: C.surfaceEl, paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 10, borderWidth: 1, borderColor: C.low + "22",
  },
  statusText: { fontSize: 10, color: C.low, fontWeight: "700" },

  summaryBar: { flexDirection: "row", paddingHorizontal: 14, paddingBottom: 10, gap: 10 },
  summaryChip: { flexDirection: "row", alignItems: "center" },
  summaryChipText: { fontSize: 9, color: C.textSec },

  agentEntries: { borderTopWidth: 1, borderTopColor: C.border, padding: 12 },
  noLogs: { fontSize: 11, color: C.textSec, fontStyle: "italic", textAlign: "center", padding: 12 },

  logEntry: { marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  logTime: { fontSize: 9, color: C.textSec + "88", fontFamily: "monospace", marginBottom: 4 },

  toolCallBox: {
    backgroundColor: C.bg, borderRadius: 10, padding: 10,
    marginBottom: 6, borderWidth: 1, borderColor: C.warning + "22",
  },
  toolCallHeader: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  toolCallName: { fontSize: 11, fontWeight: "700", color: C.warning, fontFamily: "monospace" },
  toolCallArgs: { fontSize: 9, color: C.textSec, fontFamily: "monospace", lineHeight: 16 },

  logContent: { fontSize: 11, color: C.textSec, lineHeight: 18 },

  finalBadge: {
    marginTop: 6, alignSelf: "flex-start", flexDirection: "row", alignItems: "center",
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 10, borderWidth: 1, borderColor: C.primary + "33",
  },
  finalBadgeText: { fontSize: 9, fontWeight: "800", color: C.primary, letterSpacing: 0.5 },
});
