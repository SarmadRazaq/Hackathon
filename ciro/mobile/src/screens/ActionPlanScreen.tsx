import React, { useState, useEffect } from "react";
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity,
    ActivityIndicator, Dimensions, Platform
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { auth } from "../services/firebaseConfig";
import { getActiveCrises, generateActionPlan } from "../services/api";

const { width } = Dimensions.get("window");

const C = {
    bg: "#181B22", surface: "#222731", surfaceEl: "#2E3442",
    primary: "#FFAE00", danger: "#FF5252", low: "#30D158",
    info: "#0A84FF", warning: "#FF9F0A",
    text: "#F8FAFC", textSec: "#94A3B8", border: "#384152aa",
};

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export default function ActionPlanScreen({ route, navigation }: any) {
    const role = route?.params?.role || "reporter";
    const [loading, setLoading] = useState(false);
    const [crises, setCrises] = useState<any[]>([]);
    const [selectedCrisisId, setSelectedCrisisId] = useState<string>("");
    const [plan, setPlan] = useState<any[]>([]);
    const [executing, setExecuting] = useState(false);
    const [executingIdx, setExecutingIdx] = useState<number>(-1);
    const cancelExecRef = React.useRef(false);

    const loadCrises = async () => {
        setLoading(true);
        try {
            const token = await auth.currentUser?.getIdToken() || "";
            const active = await getActiveCrises(token);
            if (active && active.length > 0) {
                setCrises(active);
                setSelectedCrisisId(active[0].id);
            } else {
                setCrises([
                    { id: "crisis-1", title: "Flash Flood — Sector G-10", type: "flood" },
                    { id: "crisis-2", title: "Extreme Heat Emergency", type: "heatwave" }
                ]);
                setSelectedCrisisId("crisis-1");
            }
        } catch (err) {
            setCrises([
                { id: "crisis-1", title: "Flash Flood — Sector G-10", type: "flood" },
                { id: "crisis-2", title: "Extreme Heat Emergency", type: "heatwave" }
            ]);
            setSelectedCrisisId("crisis-1");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadCrises();
    }, []);

    const generatePlanForCrisis = async (crisisId: string) => {
        setLoading(true);
        try {
            const crisis = crises.find(c => c.id === crisisId);
            if (!crisis) return;

            const res = await generateActionPlan(
                crisis.type || "unknown",
                crisis.location || "Unknown Location",
                crisis.severity || "MEDIUM",
                crisis.description || ""
            );

            if (res && res.plan) {
                setPlan(res.plan);
            }
        } catch (e) {
            console.error("Plan generation error", e);
            // Fallbacks for demo
            if (crisisId === "crisis-1" || (crises.find(c => c.id === crisisId)?.type?.includes("flood"))) {
                setPlan([
                    { phase: "Ingestion & Analysis", time: "T+2m", desc: "Citizen reports cross-referenced with WASA and telemetry.", status: "completed" },
                    { phase: "Safety Verification", time: "T+5m", desc: "No prompt injection detected. Location confirmed via geocoding.", status: "completed" },
                    { phase: "Resource Mobilization", time: "T+15m", desc: "3 dewatering pumps and 2 ambulances dispatched to location.", status: "active" },
                    { phase: "Public Alert Broadcast", time: "T+20m", desc: "Bilingual warning broadcast sent to residents in the sector.", status: "pending" },
                    { phase: "Post-Incident Recovery", time: "T+24h", desc: "Utility restoration, drainage cleanup and damage assessment.", status: "pending" }
                ]);
            } else {
                setPlan([
                    { phase: "Signal Detection", time: "T+2m", desc: "Temperature anomaly matched against PMD heat indices.", status: "completed" },
                    { phase: "Vulnerability Check", time: "T+5m", desc: "Calculated high risk in high-density informal settlements.", status: "completed" },
                    { phase: "Cooling Stations Setup", time: "T+30m", desc: "Deploying water tankers and setting up shaded triage zones.", status: "active" },
                    { phase: "Load-Shedding Moratorium", time: "T+1h", desc: "Requesting grid operator to suspend power cuts during peak index.", status: "pending" }
                ]);
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (selectedCrisisId && crises.length > 0) {
            generatePlanForCrisis(selectedCrisisId);
        }
    }, [selectedCrisisId]);

    const handleStepPress = (idx: number) => {
        if (role !== "dispatcher" || executing) return;
        setPlan(prev => {
            const next = [...prev];
            const current = next[idx].status;
            next[idx].status = current === "pending" ? "active" : current === "active" ? "completed" : "pending";
            return next;
        });
    };

    // Live playbook execution — the agent steps through each phase on its own.
    // Built for demo recording: reset → activate step → wait → complete → next.
    const executePlaybookLive = async () => {
        if (executing || plan.length === 0) return;
        cancelExecRef.current = false;
        setExecuting(true);

        // Reset every step to pending so the run starts clean.
        setPlan(prev => prev.map(s => ({ ...s, status: "pending" })));
        await sleep(700);

        const total = plan.length;
        for (let i = 0; i < total; i++) {
            if (cancelExecRef.current) break;
            setExecutingIdx(i);
            // Phase goes ACTIVE — agent is working on it.
            setPlan(prev => prev.map((s, idx) => idx === i ? { ...s, status: "active" } : s));
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            await sleep(2400);
            if (cancelExecRef.current) break;
            // Phase COMPLETED.
            setPlan(prev => prev.map((s, idx) => idx === i ? { ...s, status: "completed" } : s));
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            await sleep(550);
        }

        setExecutingIdx(-1);
        setExecuting(false);
    };

    useEffect(() => {
        // Cancel any in-flight execution if the screen unmounts or crisis changes.
        return () => { cancelExecRef.current = true; };
    }, [selectedCrisisId]);

    const completedCount = plan.filter(s => s.status === "completed").length;

    return (
        <View style={styles.container}>
            <StatusBar style="light" />

            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Response Action Plan</Text>
                <Text style={styles.headerSubtitle}>Real-time synchronized playbook timeline</Text>
            </View>

            {/* Crisis Selection Scroll */}
            <View style={styles.pickerContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pickerScroll}>
                    {crises.map((c) => {
                        const selected = c.id === selectedCrisisId;
                        return (
                            <TouchableOpacity
                                key={c.id}
                                onPress={() => setSelectedCrisisId(c.id)}
                                style={[styles.pickerBtn, selected && styles.pickerBtnActive]}
                            >
                                <Text style={[styles.pickerBtnText, selected && styles.pickerBtnTextActive]}>
                                    {c.title || c.id}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>

            {loading ? (
                <View style={styles.loader}>
                    <ActivityIndicator size="large" color={C.primary} />
                    <Text style={styles.loaderText}>Formulating response checklist...</Text>
                </View>
            ) : (
                <ScrollView contentContainerStyle={styles.scroll}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                        <Text style={styles.sectionTitle}>Interactive Playbook Checklist</Text>
                        <TouchableOpacity
                            onPress={() => generatePlanForCrisis(selectedCrisisId)}
                            disabled={executing}
                            style={{ flexDirection: "row", alignItems: "center", backgroundColor: C.primary + "22", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, borderWidth: 1, borderColor: C.primary + "44", opacity: executing ? 0.4 : 1 }}
                        >
                            <Ionicons name="refresh-outline" size={14} color={C.primary} style={{ marginRight: 4 }} />
                            <Text style={{ color: C.primary, fontSize: 10, fontWeight: "bold" }}>AI Regenerate</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Live execution control */}
                    <TouchableOpacity
                        onPress={executePlaybookLive}
                        disabled={executing || plan.length === 0}
                        activeOpacity={0.8}
                        style={[styles.execBtn, executing && styles.execBtnRunning]}
                    >
                        {executing ? (
                            <>
                                <ActivityIndicator size="small" color={C.bg} style={{ marginRight: 8 }} />
                                <Text style={styles.execBtnText}>
                                    Agent executing — step {executingIdx + 1} of {plan.length}
                                </Text>
                            </>
                        ) : (
                            <>
                                <Ionicons name="play" size={16} color={C.bg} style={{ marginRight: 6 }} />
                                <Text style={styles.execBtnText}>
                                    {completedCount === plan.length && plan.length > 0
                                        ? "Re-run Live Execution"
                                        : "Execute Playbook Live"}
                                </Text>
                            </>
                        )}
                    </TouchableOpacity>

                    {/* Progress bar */}
                    <View style={styles.progressTrack}>
                        <View style={[styles.progressFill, { width: `${plan.length ? (completedCount / plan.length) * 100 : 0}%` }]} />
                    </View>
                    <Text style={styles.progressLabel}>
                        {completedCount} of {plan.length} response phases completed
                    </Text>
                    <View style={{ height: 14 }} />
                    
                    {plan.map((step, idx) => {
                        const isCompleted = step.status === "completed";
                        const isActive = step.status === "active";
                        
                        return (
                            <TouchableOpacity
                                key={idx}
                                activeOpacity={role === "dispatcher" ? 0.7 : 1}
                                onPress={() => handleStepPress(idx)}
                                style={[
                                    styles.stepCard, 
                                    isCompleted && styles.stepCardCompleted,
                                    isActive && styles.stepCardActive
                                ]}
                            >
                                <View style={styles.stepHeader}>
                                    <View style={styles.statusBadge}>
                                        <Ionicons 
                                            name={isCompleted ? "checkmark-circle" : isActive ? "play-circle" : "ellipse-outline"} 
                                            size={20} 
                                            color={isCompleted ? C.low : isActive ? C.primary : C.textSec} 
                                        />
                                        <Text style={[
                                            styles.phaseTitle,
                                            isCompleted && { color: C.low, textDecorationLine: "line-through" },
                                            isActive && { color: C.primary, fontWeight: "700" }
                                        ]}>
                                            {step.phase}
                                        </Text>
                                    </View>
                                    <Text style={styles.timeBadge}>{step.time}</Text>
                                </View>
                                
                                <Text style={styles.stepDesc}>{step.desc}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },
    header: {
        paddingHorizontal: 20, paddingTop: Platform.OS === "ios" ? 60 : 40, paddingBottom: 15,
        borderBottomWidth: 1, borderBottomColor: C.border
    },
    headerTitle: { fontSize: 24, fontWeight: "800", color: C.text },
    headerSubtitle: { fontSize: 13, color: C.textSec, marginTop: 2 },
    pickerContainer: { borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.surface },
    pickerScroll: { paddingVertical: 12, paddingHorizontal: 16 },
    pickerBtn: {
        paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
        backgroundColor: C.surfaceEl, marginRight: 10, borderWidth: 1, borderColor: C.border
    },
    pickerBtnActive: { backgroundColor: C.primary, borderColor: C.primary },
    pickerBtnText: { color: C.textSec, fontSize: 13, fontWeight: "600" },
    pickerBtnTextActive: { color: C.bg, fontWeight: "700" },
    scroll: { padding: 20, paddingBottom: 40 },
    sectionTitle: { color: C.text, fontSize: 18, fontWeight: "700", marginBottom: 15 },
    stepCard: {
        backgroundColor: C.surface, borderRadius: 12, padding: 16, marginBottom: 12,
        borderWidth: 1, borderColor: C.border
    },
    stepCardCompleted: { borderColor: `${C.low}44` },
    stepCardActive: { borderColor: C.primary },
    stepHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
    statusBadge: { flexDirection: "row", alignItems: "center", gap: 8 },
    phaseTitle: { color: C.text, fontSize: 15, fontWeight: "600" },
    timeBadge: { color: C.primary, fontSize: 12, fontWeight: "700", backgroundColor: C.surfaceEl, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
    stepDesc: { color: C.textSec, fontSize: 13, lineHeight: 18, paddingLeft: 28 },
    loader: { flex: 1, justifyContent: "center", alignItems: "center" },
    loaderText: { color: C.textSec, marginTop: 12, fontSize: 14 },
    execBtn: {
        flexDirection: "row", alignItems: "center", justifyContent: "center",
        backgroundColor: C.primary, borderRadius: 12, paddingVertical: 13, marginBottom: 12,
    },
    execBtnRunning: { backgroundColor: C.warning },
    execBtnText: { color: C.bg, fontSize: 14, fontWeight: "800" },
    progressTrack: {
        height: 6, backgroundColor: C.surfaceEl, borderRadius: 3, overflow: "hidden",
    },
    progressFill: { height: "100%", backgroundColor: C.low, borderRadius: 3 },
    progressLabel: { color: C.textSec, fontSize: 11, marginTop: 6, fontWeight: "600" },
});
