import React, { useState, useEffect } from "react";
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity,
    ActivityIndicator, Dimensions, Platform, StatusBar as RNStatusBar
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { auth } from "../services/firebaseConfig";
import { getResourcePool } from "../services/api";

const { width } = Dimensions.get("window");

const C = {
    bg: "#181B22", surface: "#222731", surfaceEl: "#2E3442",
    primary: "#FFAE00", danger: "#FF5252", low: "#30D158",
    info: "#0A84FF", warning: "#FF9F0A",
    text: "#F8FAFC", textSec: "#94A3B8", border: "#384152aa",
};

const MOCK_RESOURCE_POOL = {
    resources: {
        ambulances: { allocated: 5, total: 10, label: "Ambulances" },
        rescue_teams: { allocated: 3, total: 6, label: "Rescue Teams" },
        police_units: { allocated: 4, total: 12, label: "Police Patrol Units" },
        dewatering_pumps: { allocated: 6, total: 8, label: "Dewatering Pumps" },
        generators: { allocated: 2, total: 5, label: "Backup Generators" },
        water_tankers: { allocated: 3, total: 6, label: "Water Tankers" }
    },
    conflicts: [
        {
            id: "conf-1",
            crisis_index: 0,
            crisis_title: "Flash Flood — Sector G-10",
            message: "Contention on Dewatering Pumps: Sector G-10 requested 3 but Zero Point flood containment has locked 3.",
            timestamp: new Date().toISOString()
        }
    ]
};

export default function ResourcesScreen() {
    const [loading, setLoading] = useState(false);
    const [pool, setPool] = useState<any>(MOCK_RESOURCE_POOL);
    const [error, setError] = useState<string | null>(null);

    const loadData = async () => {
        setLoading(true);
        setError(null);
        try {
            const token = await auth.currentUser?.getIdToken() || "";
            const data = await getResourcePool(token);

            // Handle backend response format: {pool: {...}} or {resources: {...}}
            if (data) {
                const poolData = data.pool || data.resources || data;
                if (poolData && typeof poolData === 'object') {
                    // Transform backend format to mobile format
                    const transformedPool = {
                        resources: poolData,
                        conflicts: data.conflicts || []
                    };
                    setPool(transformedPool);
                } else {
                    console.warn("Unexpected resource pool format, using mock data");
                }
            }
        } catch (err: any) {
            console.warn("Could not load real-time resource pool, using mock data.", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const triggerRefresh = () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        loadData();
    };

    return (
        <View style={styles.container}>
            <StatusBar style="light" />
            
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>Resource Pool</Text>
                    <Text style={styles.headerSubtitle}>Real-time emergency inventory triage</Text>
                </View>
                <TouchableOpacity onPress={triggerRefresh} style={styles.refreshBtn}>
                    <Ionicons name="refresh" size={20} color={C.primary} />
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.loader}>
                    <ActivityIndicator size="large" color={C.primary} />
                    <Text style={styles.loaderText}>Syncing inventory metrics...</Text>
                </View>
            ) : (
                <ScrollView contentContainerStyle={styles.scroll}>
                    {/* Conflict Warnings */}
                    {pool.conflicts && pool.conflicts.length > 0 && (
                        <View style={styles.warningCard}>
                            <View style={styles.warningHeader}>
                                <Ionicons name="alert-circle" size={24} color={C.danger} />
                                <Text style={styles.warningTitle}>Resource Contention</Text>
                            </View>
                            {pool.conflicts.map((conf: any, idx: number) => (
                                <Text key={conf.id || idx} style={styles.warningText}>
                                    ⚠️ {conf.message}
                                </Text>
                            ))}
                            <Text style={styles.warningFooter}>Negotiator Agent actively arbitrating priorities.</Text>
                        </View>
                    )}

                    {/* Inventory Grid */}
                    <Text style={styles.sectionTitle}>Global Allocation Status</Text>
                    
                    {Object.entries(pool.resources || {}).map(([key, val]: [string, any]) => {
                        const pct = val.total > 0 ? (val.allocated / val.total) * 100 : 0;
                        const isCritical = pct >= 80;
                        
                        return (
                            <View key={key} style={styles.poolCard}>
                                <View style={styles.poolCardHeader}>
                                    <Text style={styles.poolLabel}>{val.label || key.toUpperCase()}</Text>
                                    <Text style={[styles.poolQty, isCritical && { color: C.danger }]}>
                                        {val.allocated}/{val.total}
                                    </Text>
                                </View>
                                
                                {/* Progress Bar */}
                                <View style={styles.progressBarBg}>
                                    <View style={[
                                        styles.progressBarFill, 
                                        { width: `${pct}%` },
                                        isCritical ? { backgroundColor: C.danger } : pct > 50 ? { backgroundColor: C.warning } : { backgroundColor: C.low }
                                    ]} />
                                </View>
                                
                                <View style={styles.poolCardFooter}>
                                    <Text style={styles.pctText}>{Math.round(pct)}% Allocated</Text>
                                    <Text style={styles.availableText}>{val.total - val.allocated} Available</Text>
                                </View>
                            </View>
                        );
                    })}

                    <View style={styles.safetyBuffer}>
                        <Ionicons name="shield-checkmark" size={16} color={C.low} />
                        <Text style={styles.safetyBufferText}>
                            20% emergency reserve is locked for national security contingency.
                        </Text>
                    </View>
                </ScrollView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },
    header: {
        flexDirection: "row", justifyContent: "space-between", alignItems: "center",
        paddingHorizontal: 20, paddingTop: Platform.OS === "ios" ? 60 : 40, paddingBottom: 15,
        borderBottomWidth: 1, borderBottomColor: C.border
    },
    headerTitle: { fontSize: 24, fontWeight: "800", color: C.text },
    headerSubtitle: { fontSize: 13, color: C.textSec, marginTop: 2 },
    refreshBtn: {
        width: 40, height: 40, borderRadius: 20, backgroundColor: C.surface,
        alignItems: "center", justifyContent: "center"
    },
    loader: { flex: 1, justifyContent: "center", alignItems: "center" },
    loaderText: { color: C.textSec, marginTop: 12, fontSize: 14 },
    scroll: { padding: 20, paddingBottom: 40 },
    warningCard: {
        backgroundColor: "#FF525215", borderWidth: 1, borderColor: C.danger,
        borderRadius: 12, padding: 16, marginBottom: 20
    },
    warningHeader: { flexDirection: "row", alignItems: "center", marginBottom: 8, gap: 8 },
    warningTitle: { color: C.danger, fontWeight: "700", fontSize: 16 },
    warningText: { color: C.text, fontSize: 13, lineHeight: 18, marginVertical: 4 },
    warningFooter: { color: C.textSec, fontSize: 11, fontStyle: "italic", marginTop: 6 },
    sectionTitle: { color: C.text, fontSize: 18, fontWeight: "700", marginBottom: 15 },
    poolCard: {
        backgroundColor: C.surface, borderRadius: 12, padding: 16, marginBottom: 12,
        borderWidth: 1, borderColor: C.border
    },
    poolCardHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
    poolLabel: { color: C.text, fontSize: 15, fontWeight: "600" },
    poolQty: { color: C.primary, fontSize: 16, fontWeight: "700" },
    progressBarBg: { height: 8, backgroundColor: C.surfaceEl, borderRadius: 4, overflow: "hidden" },
    progressBarFill: { height: "100%", borderRadius: 4 },
    poolCardFooter: { flexDirection: "row", justifyContent: "space-between", marginTop: 10 },
    pctText: { color: C.textSec, fontSize: 12 },
    availableText: { color: C.low, fontSize: 12, fontWeight: "500" },
    safetyBuffer: {
        flexDirection: "row", alignItems: "center", gap: 8, marginTop: 20,
        backgroundColor: C.surface, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: C.border
    },
    safetyBufferText: { color: C.textSec, fontSize: 12, flex: 1, lineHeight: 16 }
});
