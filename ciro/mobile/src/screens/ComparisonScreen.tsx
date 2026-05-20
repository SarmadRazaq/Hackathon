import React, { useState, useEffect } from "react";
import {
    View, Text, TouchableOpacity, ScrollView,
    StyleSheet, ActivityIndicator, Dimensions, Platform, StatusBar as RNStatusBar
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { auth } from "../services/firebaseConfig";
import { getActiveCrises, getComparison } from "../services/api";

const { width } = Dimensions.get("window");

const C = {
    bg: "#181B22", surface: "#222731", surfaceEl: "#2E3442",
    primary: "#FFAE00", danger: "#FF5252", low: "#30D158",
    info: "#0A84FF", warning: "#FF9F0A",
    text: "#F8FAFC", textSec: "#94A3B8", border: "#384152aa",
};

const SEV_COLOR: Record<string, string> = {
    CRITICAL: C.danger, HIGH: C.warning, MEDIUM: C.info, LOW: C.low,
};

const MOCK_CRISES = [
    { id: "crisis-1", title: "Flash Flood — G-10 Islamabad", type: "flood", severity: "CRITICAL", location: "G-10, Islamabad" },
    { id: "crisis-2", title: "Heat Emergency — Karachi", type: "heat", severity: "HIGH", location: "Saddar, Karachi" },
];

const MOCK_COMPARISONS: Record<string, any> = {
    "crisis-1": {
        crisisId: "crisis-1",
        agent: {
            severity: "CRITICAL",
            confidence: 87,
            actions: [
                "Deploy 3 dewatering pumps to G-10 sector",
                "Evacuate low-lying residential blocks (G-10/1 to G-10/4)",
                "Pre-position medical teams at Polyclinic Hospital",
                "Activate backup power generators for water treatment plant",
                "Issue public alert via SMS gateway for 45,000 residents",
            ],
            resources: {
                ambulances: 3,
                rescue_teams: 2,
                police: 2,
                dewatering_pumps: 3,
                generators: 2,
            },
            timeTaken: "12.4s",
            strengths: "Nuanced cascading risk detection (power grid failure & sewage contaminate risk)"
        },
        rules: {
            severity: "HIGH",
            confidence: 71,
            actions: [
                "Deploy standard flood response team",
                "Issue Level-2 flood warning",
                "Open emergency shelters in affected zone",
                "Request NDMA assessment team",
            ],
            resources: {
                ambulances: 2,
                rescue_teams: 1,
                police: 2,
                dewatering_pumps: 2,
            },
            rules: [
                { id: "FLOOD-001", description: "IF water_level > 30cm AND rising_rate > 1cm/hr THEN severity = HIGH", matched: true },
                { id: "FLOOD-002", description: "IF affected_population > 10000 THEN deploy rescue_teams >= 1", matched: true },
                { id: "FLOOD-003", description: "IF severity >= HIGH THEN activate emergency shelters", matched: true },
            ],
            timeTaken: "0.02s",
            strengths: "Deterministic threshold checking, explainable, execution instant"
        },
        agreement: 73,
        severityDelta: "±1 level",
        resourceDelta: "±5 units",
        speedRatio: "620x",
        recommendation: "AI Agent is recommended for Flash Flood — G-10 Islamabad due to nuanced cascading analysis, while the Rule-based engine serves as a fast safety check with low resource delta (5 units)."
    },
    "crisis-2": {
        crisisId: "crisis-2",
        agent: {
            severity: "HIGH",
            confidence: 82,
            actions: [
                "Deploy mobile cooling stations to 5 high-density areas",
                "Activate heat emergency protocol at hospitals",
                "Distribute water via municipal tanker network",
                "Set up shaded rest areas at intersections",
            ],
            resources: {
                ambulances: 2,
                medical_outreach: 3,
                water_tankers: 4,
            },
            timeTaken: "9.8s",
            strengths: "Analyzes real-time hospital admissions spikes and micro-climate temperatures"
        },
        rules: {
            severity: "HIGH",
            confidence: 80,
            actions: [
                "Issue city-wide heat advisory",
                "Pre-position 2 water tankers",
            ],
            resources: {
                ambulances: 1,
                water_tankers: 2,
            },
            rules: [
                { id: "HEAT-001", description: "IF temperature > 42°C THEN severity = HIGH", matched: true },
            ],
            timeTaken: "0.01s",
            strengths: "Direct temperature threshold match"
        },
        agreement: 85,
        severityDelta: "±0 level",
        resourceDelta: "±4 units",
        speedRatio: "980x",
        recommendation: "AI Agent response matches severity but optimizes target location distributions based on vulnerability indices."
    }
};

export default function ComparisonScreen({ navigation }: any) {
    const [crises, setCrises] = useState<any[]>(MOCK_CRISES);
    const [selectedCrisisId, setSelectedCrisisId] = useState("crisis-1");
    const [comparison, setComparison] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [subTab, setSubTab] = useState<"summary" | "resources" | "rules">("summary");

    useEffect(() => {
        const loadInitialData = async () => {
            try {
                let token = "";
                const user = auth.currentUser;
                if (user) {
                    token = await user.getIdToken();
                }
                const active = await getActiveCrises(token);
                if (Array.isArray(active) && active.length > 0) {
                    setCrises(active);
                    setSelectedCrisisId(active[0].id);
                }
            } catch (err) {
                console.warn("Failed to load active crises list, using mock", err);
            }
        };
        loadInitialData();
    }, []);

    useEffect(() => {
        const fetchComp = async () => {
            setLoading(true);
            try {
                let token = "";
                const user = auth.currentUser;
                if (user) {
                    token = await user.getIdToken();
                }
                const data = await getComparison(selectedCrisisId, token);
                if (data && data.agent) {
                    setComparison(data);
                } else {
                    throw new Error("Invalid structure");
                }
            } catch (err) {
                console.warn("Failed to fetch live comparison, using mock fallback", err);
                const mock = MOCK_COMPARISONS[selectedCrisisId] || MOCK_COMPARISONS["crisis-1"];
                setComparison(mock);
            } finally {
                setLoading(false);
            }
        };
        fetchComp();
    }, [selectedCrisisId]);

    const selectCrisis = (id: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSelectedCrisisId(id);
    };

    const getResourceChangeText = (agentVal: number, ruleVal: number) => {
        const diff = agentVal - ruleVal;
        if (diff > 0) return `+${diff}`;
        if (diff < 0) return `${diff}`;
        return "±0";
    };

    const activeCrisis = crises.find(c => c.id === selectedCrisisId) || crises[0];

    return (
        <View style={styles.container}>
            <StatusBar style="light" backgroundColor="transparent" translucent={true} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={20} color={C.text} />
                </TouchableOpacity>
                <View style={{ alignItems: "center" }}>
                    <Text style={styles.headerTitle}>Agent vs Rules</Text>
                    <Text style={styles.headerSub}>Decisions & Performance Metrics</Text>
                </View>
                <View style={{ width: 36 }} />
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
                {/* Crisis Horizontal Switcher */}
                <View style={{ marginVertical: 12 }}>
                    <Text style={styles.sectionLabel}>SELECT ACTIVE INCIDENT</Text>
                    <ScrollView horizontal={true} showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
                        {crises.map(c => {
                            const isSelected = c.id === selectedCrisisId;
                            return (
                                <TouchableOpacity
                                    key={c.id}
                                    onPress={() => selectCrisis(c.id)}
                                    style={[
                                        styles.crisisChip,
                                        isSelected && { borderColor: C.primary, backgroundColor: C.primary + "18" }
                                    ]}
                                >
                                    <Ionicons 
                                        name={c.type === "flood" ? "water-outline" : c.type === "heat" ? "flame-outline" : "alert-circle-outline"} 
                                        size={14} 
                                        color={isSelected ? C.primary : C.textSec} 
                                    />
                                    <Text style={[styles.crisisChipText, isSelected && { color: C.primary, fontWeight: "800" }]}>
                                        {c.title.split(" — ")[0] || c.title}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>

                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={C.primary} />
                        <Text style={styles.loadingText}>Comparing models...</Text>
                    </View>
                ) : !comparison ? (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="warning-outline" size={32} color={C.textSec} />
                        <Text style={styles.emptyText}>Comparison data unavailable</Text>
                    </View>
                ) : (
                    <View style={{ paddingHorizontal: 16 }}>
                        {/* Overall Metrics Grid */}
                        <View style={styles.metricsGrid}>
                            <View style={styles.metricCard}>
                                <Text style={styles.metricLabel}>AGREEMENT</Text>
                                <Text style={[styles.metricValue, { color: C.low }]}>{comparison.agreement}%</Text>
                                <Text style={styles.metricSub}>Decision overlap</Text>
                            </View>
                            <View style={styles.metricCard}>
                                <Text style={styles.metricLabel}>SEV DELTA</Text>
                                <Text style={[styles.metricValue, { color: C.warning }]}>{comparison.severityDelta}</Text>
                                <Text style={styles.metricSub}>Triage shift</Text>
                            </View>
                            <View style={styles.metricCard}>
                                <Text style={styles.metricLabel}>SPEED RATIO</Text>
                                <Text style={[styles.metricValue, { color: C.info }]}>{comparison.speedRatio}</Text>
                                <Text style={styles.metricSub}>Rules factor</Text>
                            </View>
                        </View>

                        {/* Side-by-side Severity Cards */}
                        <View style={styles.sideBySideRow}>
                            <View style={[styles.modelCard, { borderColor: C.primary + "33" }]}>
                                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
                                    <Ionicons name="pulse" size={16} color={C.primary} />
                                    <Text style={styles.modelHeader}>AI AGENTIC</Text>
                                </View>
                                <Text style={styles.modelLabel}>Severity Level</Text>
                                <Text style={[styles.modelSeverity, { color: SEV_COLOR[comparison.agent.severity] || C.text }]}>
                                    {comparison.agent.severity}
                                </Text>
                                <Text style={styles.modelTime}>Latency: {comparison.agent.timeTaken}</Text>
                            </View>

                            <View style={[styles.modelCard, { borderColor: C.warning + "33" }]}>
                                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
                                    <Ionicons name="code-working" size={16} color={C.warning} />
                                    <Text style={styles.modelHeader}>RULE BASE</Text>
                                </View>
                                <Text style={styles.modelLabel}>Severity Level</Text>
                                <Text style={[styles.modelSeverity, { color: SEV_COLOR[comparison.rules.severity] || C.text }]}>
                                    {comparison.rules.severity}
                                </Text>
                                <Text style={styles.modelTime}>Latency: {comparison.rules.timeTaken}</Text>
                            </View>
                        </View>

                        {/* Segment Tab Controls */}
                        <View style={styles.tabsContainer}>
                            {(["summary", "resources", "rules"] as const).map(t => (
                                <TouchableOpacity
                                    key={t}
                                    onPress={() => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        setSubTab(t);
                                    }}
                                    style={[styles.tabBtn, subTab === t && styles.tabBtnActive]}
                                >
                                    <Text style={[styles.tabBtnText, subTab === t && styles.tabBtnTextActive]}>
                                        {t.toUpperCase()}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Content Area */}
                        {subTab === "summary" && (
                            <View style={styles.contentCard}>
                                <Text style={styles.cardSectionLabel}>AI STRATEGY REASONING</Text>
                                <Text style={styles.reasoningText}>
                                    {comparison.recommendation}
                                </Text>

                                <Text style={[styles.cardSectionLabel, { marginTop: 16 }]}>AGENT ADVANTAGES / STRENGTHS</Text>
                                <View style={styles.bulletItem}>
                                    <Ionicons name="checkmark-circle" size={14} color={C.low} style={{ marginRight: 6 }} />
                                    <Text style={styles.bulletText}>{comparison.agent.strengths}</Text>
                                </View>

                                <Text style={[styles.cardSectionLabel, { marginTop: 16 }]}>BASELINE STRENGTHS</Text>
                                <View style={styles.bulletItem}>
                                    <Ionicons name="checkmark-circle" size={14} color={C.textSec} style={{ marginRight: 6 }} />
                                    <Text style={styles.bulletText}>{comparison.rules.strengths}</Text>
                                </View>
                            </View>
                        )}

                        {subTab === "resources" && (
                            <View style={styles.contentCard}>
                                <Text style={styles.cardSectionLabel}>SIDE-BY-SIDE ALLOCATIONS</Text>
                                <View style={styles.tableHeader}>
                                    <Text style={[styles.tableCol, { flex: 2 }]}>RESOURCE TYPE</Text>
                                    <Text style={[styles.tableCol, { textAlign: "center" }]}>AI</Text>
                                    <Text style={[styles.tableCol, { textAlign: "center" }]}>RULES</Text>
                                    <Text style={[styles.tableCol, { textAlign: "right" }]}>SHIFT</Text>
                                </View>
                                {(() => {
                                    const allKeys = Array.from(new Set([
                                        ...Object.keys(comparison.agent.resources),
                                        ...Object.keys(comparison.rules.resources)
                                    ]));
                                    if (allKeys.length === 0) {
                                        return <Text style={styles.emptyTableText}>No resources allocated</Text>;
                                    }
                                    return allKeys.map((key, index) => {
                                        const agentQty = comparison.agent.resources[key] || 0;
                                        const ruleQty = comparison.rules.resources[key] || 0;
                                        const shift = getResourceChangeText(agentQty, ruleQty);
                                        const isMore = agentQty > ruleQty;
                                        const isLess = agentQty < ruleQty;

                                        return (
                                            <View key={index} style={[styles.tableRow, index > 0 && styles.tableRowBorder]}>
                                                <Text style={[styles.tableCell, { flex: 2, textTransform: "capitalize" }]}>
                                                    {key.replace(/_/g, " ")}
                                                </Text>
                                                <Text style={[styles.tableCell, { textAlign: "center", fontWeight: "bold", color: C.text }]}>{agentQty}</Text>
                                                <Text style={[styles.tableCell, { textAlign: "center", color: C.textSec }]}>{ruleQty}</Text>
                                                <Text style={[
                                                    styles.tableCell, 
                                                    { 
                                                        textAlign: "right", 
                                                        fontWeight: "bold",
                                                        color: isMore ? C.low : isLess ? C.danger : C.textSec 
                                                    }
                                                ]}>
                                                    {shift}
                                                </Text>
                                            </View>
                                        );
                                    });
                                })()}
                            </View>
                        )}

                        {subTab === "rules" && (
                            <View style={styles.contentCard}>
                                <Text style={styles.cardSectionLabel}>EVALUATED RULES ENGINE MATCHES</Text>
                                {comparison.rules.rules.map((rule: any, idx: number) => (
                                    <View key={idx} style={[styles.ruleItem, idx > 0 && { borderTopWidth: 1, borderTopColor: C.border, paddingTop: 10 }]}>
                                        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                                            <Text style={styles.ruleId}>{rule.id}</Text>
                                            <View style={[styles.statusBadge, rule.matched ? styles.statusBadgeMatch : styles.statusBadgeMiss]}>
                                                <Text style={[styles.statusBadgeText, rule.matched ? { color: C.low } : { color: C.textSec }]}>
                                                    {rule.matched ? "MATCHED" : "UNMATCHED"}
                                                </Text>
                                            </View>
                                        </View>
                                        <Text style={styles.ruleDesc}>{rule.description}</Text>
                                    </View>
                                ))}
                            </View>
                        )}
                    </View>
                )}
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

    sectionLabel: { fontSize: 9, fontWeight: "800", color: C.textSec, letterSpacing: 1.2, marginBottom: 8, paddingHorizontal: 16 },

    crisisChip: {
        flexDirection: "row", alignItems: "center", gap: 6,
        paddingHorizontal: 12, paddingVertical: 8,
        borderRadius: 20, backgroundColor: C.surface,
        borderWidth: 1, borderColor: C.border
    },
    crisisChipText: { fontSize: 11, color: C.textSec, fontWeight: "600" },

    loadingContainer: { padding: 48, alignItems: "center", gap: 12 },
    loadingText: { color: C.textSec, fontSize: 13, fontWeight: "600" },
    emptyContainer: { padding: 48, alignItems: "center", gap: 8 },
    emptyText: { color: C.textSec, fontSize: 13, fontWeight: "600" },

    metricsGrid: { flexDirection: "row", gap: 8, marginBottom: 12 },
    metricCard: {
        flex: 1, backgroundColor: C.surface, padding: 10, borderRadius: 12,
        borderWidth: 1, borderColor: C.border, alignItems: "center"
    },
    metricLabel: { fontSize: 8, fontWeight: "800", color: C.textSec, letterSpacing: 0.8 },
    metricValue: { fontSize: 18, fontWeight: "900", marginVertical: 4 },
    metricSub: { fontSize: 8, color: C.textSec + "88" },

    sideBySideRow: { flexDirection: "row", gap: 8, marginBottom: 14 },
    modelCard: {
        flex: 1, backgroundColor: C.surface, padding: 12, borderRadius: 14,
        borderWidth: 1, borderLeftWidth: 3
    },
    modelHeader: { fontSize: 10, fontWeight: "800", color: C.text },
    modelLabel: { fontSize: 8, color: C.textSec, marginTop: 6 },
    modelSeverity: { fontSize: 15, fontWeight: "900", marginVertical: 2 },
    modelTime: { fontSize: 9, color: C.textSec, marginTop: 4 },

    tabsContainer: {
        flexDirection: "row", backgroundColor: C.surface, borderRadius: 10,
        padding: 4, borderWidth: 1, borderColor: C.border, marginBottom: 14
    },
    tabBtn: { flex: 1, paddingVertical: 8, alignItems: "center", borderRadius: 8 },
    tabBtnActive: { backgroundColor: C.surfaceEl },
    tabBtnText: { fontSize: 10, color: C.textSec, fontWeight: "700", letterSpacing: 0.5 },
    tabBtnTextActive: { color: C.primary },

    contentCard: {
        backgroundColor: C.surface, borderRadius: 16, padding: 16,
        borderWidth: 1, borderColor: C.border, marginBottom: 20
    },
    cardSectionLabel: { fontSize: 9, fontWeight: "800", color: C.primary, letterSpacing: 0.8, marginBottom: 8 },
    reasoningText: { fontSize: 12, color: C.text, lineHeight: 18, fontWeight: "500" },
    bulletItem: { flexDirection: "row", alignItems: "flex-start", marginTop: 6 },
    bulletText: { fontSize: 11, color: C.textSec, flex: 1, lineHeight: 16 },

    tableHeader: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: C.border, paddingBottom: 6 },
    tableCol: { fontSize: 9, fontWeight: "800", color: C.textSec, flex: 1 },
    tableRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10 },
    tableRowBorder: { borderTopWidth: 1, borderTopColor: C.border + "44" },
    tableCell: { fontSize: 12, color: C.textSec, flex: 1 },
    emptyTableText: { fontSize: 11, color: C.textSec, fontStyle: "italic", textAlign: "center", paddingVertical: 12 },

    ruleItem: { marginBottom: 10 },
    ruleId: { fontSize: 10, fontWeight: "800", color: C.primary },
    ruleDesc: { fontSize: 11, color: C.text, lineHeight: 16, marginTop: 2 },
    statusBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
    statusBadgeMatch: { backgroundColor: C.low + "18" },
    statusBadgeMiss: { backgroundColor: C.surfaceEl },
    statusBadgeText: { fontSize: 8, fontWeight: "800" }
});
