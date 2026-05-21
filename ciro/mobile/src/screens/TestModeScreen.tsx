import React, { useState, useEffect } from "react";
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity,
    ActivityIndicator, Dimensions, Platform, Alert
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Haptics from "expo-haptics";
import { auth } from "../services/firebaseConfig";
import { getScenarios, analyzeScenarioStream, getScenarioCacheStatus, Scenario, AgentLog } from "../services/api";

const { width } = Dimensions.get("window");

const C = {
    bg: "#181B22", surface: "#222731", surfaceEl: "#2E3442",
    primary: "#FFAE00", danger: "#FF5252", low: "#30D158",
    info: "#0A84FF", warning: "#FF9F0A",
    text: "#F8FAFC", textSec: "#94A3B8", border: "#384152aa",
};

export default function TestModeScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<any>>();
    const [scenarios, setScenarios] = useState<Scenario[]>([]);
    const [cachedIds, setCachedIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [runningId, setRunningId] = useState<string | null>(null);
    const [liveLog, setLiveLog] = useState<string>("");
    const abortStreamRef = React.useRef<(() => void) | null>(null);

    const refreshCacheStatus = async () => {
        try {
            const status = await getScenarioCacheStatus();
            setCachedIds(new Set(status.cached_scenarios));
        } catch { /* ignore */ }
    };

    useEffect(() => {
        const fetchScenarios = async () => {
            try {
                const data = await getScenarios();
                setScenarios(data);
                await refreshCacheStatus();
            } catch (err) {
                console.error("Failed to fetch scenarios", err);
            } finally {
                setLoading(false);
            }
        };
        fetchScenarios();
        // Poll cache status every 10 s so the pre-warm indicator becomes accurate as
        // the background warm-up populates the cache.
        const interval = setInterval(refreshCacheStatus, 10_000);
        return () => clearInterval(interval);
    }, []);

    const handleStreamLog = (log: AgentLog) => {
        if (log.tool_call) {
            setLiveLog(`${log.author} calling ${log.tool_call.name}...`);
        } else if (log.tool_response) {
            setLiveLog(`${log.author} received ${log.tool_response.name} data.`);
        } else if (log.content) {
            const short = log.content.split('\n')[0].substring(0, 50);
            setLiveLog(`${log.author}: ${short}...`);
        } else if (log.error) {
            setLiveLog(`Error: ${log.content}`);
        }
    };

    const handleRunScenario = (id: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setRunningId(id);
        setLiveLog("Initializing pipeline...");
        abortStreamRef.current = analyzeScenarioStream(id, handleStreamLog, (report) => {
            setRunningId(null);
            abortStreamRef.current = null;
            navigation.navigate("Result", { report, role: "dispatcher" });
        }, (err) => {
            setRunningId(null);
            abortStreamRef.current = null;
            Alert.alert("Scenario failed", err);
        });
    };

    return (
        <View style={styles.container}>
            <StatusBar style="light" />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={C.text} />
                </TouchableOpacity>
                <View>
                    <Text style={styles.headerTitle}>Test Scenarios</Text>
                    <Text style={styles.headerSubtitle}>Run pre-configured multi-agent pipelines</Text>
                </View>
            </View>

            {loading ? (
                <View style={styles.centerBox}>
                    <ActivityIndicator size="large" color={C.primary} />
                </View>
            ) : (
                <ScrollView contentContainerStyle={styles.scroll}>
                    {scenarios.map((s) => (
                        <TouchableOpacity
                            key={s.id}
                            style={styles.card}
                            onPress={() => handleRunScenario(s.id)}
                            disabled={!!runningId}
                        >
                            <View style={styles.cardIcon}>
                                <Text style={{ fontSize: 24 }}>{s.icon}</Text>
                            </View>
                            <View style={styles.cardContent}>
                                <Text style={styles.cardTitle}>{s.title}</Text>
                                <Text style={styles.cardDesc} numberOfLines={2}>{s.description}</Text>
                                <View style={styles.badgeContainer}>
                                    <View style={styles.severityBadge}>
                                        <Text style={styles.severityText}>{s.severity_hint}</Text>
                                    </View>
                                    {cachedIds.has(s.id) && (
                                        <View style={[styles.severityBadge, { backgroundColor: C.low + "22", borderColor: C.low, marginLeft: 6 }]}>
                                            <Text style={[styles.severityText, { color: C.low }]}>⚡ Pre-warmed</Text>
                                        </View>
                                    )}
                                </View>
                            </View>
                            <View style={styles.cardAction}>
                                {runningId === s.id ? (
                                    <View style={{ alignItems: 'flex-end' }}>
                                        <ActivityIndicator size="small" color={C.primary} />
                                        <Text style={{ fontSize: 9, color: C.textSec, marginTop: 4, width: 80, textAlign: 'right' }} numberOfLines={2}>{liveLog}</Text>
                                    </View>
                                ) : (
                                    <Ionicons name="play-circle" size={28} color={C.primary} />
                                )}
                            </View>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },
    header: {
        flexDirection: "row", alignItems: "center",
        paddingHorizontal: 20, paddingTop: Platform.OS === "ios" ? 60 : 40, paddingBottom: 15,
        borderBottomWidth: 1, borderBottomColor: C.border
    },
    backBtn: { padding: 5, marginRight: 15 },
    headerTitle: { fontSize: 22, fontWeight: "800", color: C.text },
    headerSubtitle: { fontSize: 13, color: C.textSec, marginTop: 2 },
    centerBox: { flex: 1, justifyContent: "center", alignItems: "center" },
    scroll: { padding: 20, paddingBottom: 40 },
    card: {
        flexDirection: "row", alignItems: "center", backgroundColor: C.surface,
        borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: C.border
    },
    cardIcon: {
        width: 50, height: 50, borderRadius: 25, backgroundColor: C.surfaceEl,
        justifyContent: "center", alignItems: "center", marginRight: 16
    },
    cardContent: { flex: 1 },
    cardTitle: { fontSize: 16, fontWeight: "700", color: C.text, marginBottom: 4 },
    cardDesc: { fontSize: 13, color: C.textSec, lineHeight: 18, marginBottom: 8 },
    badgeContainer: { flexDirection: "row" },
    severityBadge: {
        backgroundColor: "rgba(255, 174, 0, 0.15)", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4,
    },
    severityText: { color: C.primary, fontSize: 10, fontWeight: "800" },
    cardAction: { paddingLeft: 16, justifyContent: "center", alignItems: "center" }
});
