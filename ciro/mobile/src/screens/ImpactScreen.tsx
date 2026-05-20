import React, { useState, useEffect } from "react";
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity,
    ActivityIndicator, Dimensions, Platform
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { auth } from "../services/firebaseConfig";
import { getActiveCrises, getImpactAnalysis } from "../services/api";

const { width } = Dimensions.get("window");

const C = {
    bg: "#181B22", surface: "#222731", surfaceEl: "#2E3442",
    primary: "#FFAE00", danger: "#FF5252", low: "#30D158",
    info: "#0A84FF", warning: "#FF9F0A",
    text: "#F8FAFC", textSec: "#94A3B8", border: "#384152aa",
};

export default function ImpactScreen() {
    const [loading, setLoading] = useState(false);
    const [crises, setCrises] = useState<any[]>([]);
    const [selectedCrisisId, setSelectedCrisisId] = useState<string>("");
    const [impact, setImpact] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    const loadCrises = async () => {
        try {
            const token = await auth.currentUser?.getIdToken() || "";
            const active = await getActiveCrises(token);
            if (active && active.length > 0) {
                setCrises(active);
                setSelectedCrisisId(active[0].id);
            } else {
                // Fallback mock crises
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
        }
    };

    const loadImpact = async (crisisId: string) => {
        if (!crisisId) return;
        setLoading(true);
        setError(null);
        try {
            const token = await auth.currentUser?.getIdToken() || "";
            const data = await getImpactAnalysis(crisisId, token);

            if (data && typeof data === 'object') {
                const mock = getMockImpact(crisisId);
                const impact = {
                    crisis_id: data.crisis_id || crisisId,
                    crisis_title: data.crisis_title || mock.crisis_title,
                    traffic: { ...mock.traffic, ...data.traffic },
                    economic: { ...mock.economic, ...data.economic },
                    environmental: { ...mock.environmental, ...data.environmental },
                    logistical: { ...mock.logistical, ...data.logistical },
                    infrastructure: { ...mock.infrastructure, ...data.infrastructure },
                    projections: data.projections || mock.projections,
                };
                setImpact(impact);
            } else {
                setImpact(getMockImpact(crisisId));
            }
        } catch (err) {
            console.warn("Could not load backend impact simulation, using fallback metrics.", err);
            setImpact(getMockImpact(crisisId));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadCrises();
    }, []);

    useEffect(() => {
        if (selectedCrisisId) {
            loadImpact(selectedCrisisId);
        }
    }, [selectedCrisisId]);

    const getMockImpact = (id: string) => {
        const isFlood = id === "crisis-1";
        return {
            crisis_id: id,
            crisis_title: isFlood ? "Flash Flood — Sector G-10" : "Extreme Heat Emergency",
            traffic: {
                vehicle_hours_lost: isFlood ? 12400 : 3400,
                road_closures: isFlood ? 8 : 1,
                estimated_cost_pkr: isFlood ? 45000000 : 8000000
            },
            economic: {
                property_damage_pkr: isFlood ? 1200000000 : 100000000,
                business_loss_pkr: isFlood ? 800000000 : 450000000,
                total_pkr: isFlood ? 2300000000 : 550000000
            },
            environmental: {
                contamination_risk_acres: isFlood ? 340 : 10,
                water_quality_affected_km: isFlood ? 12 : 0
            },
            logistical: {
                supply_routes_disrupted: isFlood ? 89 : 12,
                delayed_deliveries: isFlood ? 1240 : 250
            },
            infrastructure: {
                roads_damaged_km: isFlood ? 4.5 : 0.2,
                bridges_affected: isFlood ? 2 : 0,
                power_lines_down: isFlood ? 8 : 4
            },
            projections: {
                t2h: { with_intervention: 25, without_intervention: 45 },
                t6h: { with_intervention: 40, without_intervention: 75 },
                t24h: { with_intervention: 55, without_intervention: 95 }
            }
        };
    };

    const handleSelectCrisis = (id: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSelectedCrisisId(id);
    };

    return (
        <View style={styles.container}>
            <StatusBar style="light" />

            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Impact Simulation</Text>
                <Text style={styles.headerSubtitle}>Multi-domain AI casualty & loss forecasting</Text>
            </View>

            {/* Crisis Picker Scroll */}
            <View style={styles.pickerContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pickerScroll}>
                    {crises.map((c) => {
                        const selected = c.id === selectedCrisisId;
                        return (
                            <TouchableOpacity
                                key={c.id}
                                onPress={() => handleSelectCrisis(c.id)}
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
                    <Text style={styles.loaderText}>Modeling cascading failure states...</Text>
                </View>
            ) : impact ? (
                <ScrollView contentContainerStyle={styles.scroll}>
                    {/* Key Stats Grid */}
                    <Text style={styles.sectionTitle}>Loss Projections</Text>
                    
                    <View style={styles.statsGrid}>
                        <View style={styles.statCard}>
                            <Ionicons name="cash" size={24} color={C.danger} />
                            <Text style={styles.statVal}>PKR {(impact.economic?.total_pkr / 1e9).toFixed(1)}B</Text>
                            <Text style={styles.statLabel}>Economic Loss</Text>
                        </View>
                        
                        <View style={styles.statCard}>
                            <Ionicons name="car" size={24} color={C.warning} />
                            <Text style={styles.statVal}>{impact.traffic?.vehicle_hours_lost?.toLocaleString()}</Text>
                            <Text style={styles.statLabel}>Vehicle-Hours Lost</Text>
                        </View>

                        <View style={styles.statCard}>
                            <Ionicons name="leaf" size={24} color={C.low} />
                            <Text style={styles.statVal}>{impact.environmental?.contamination_risk_acres} ac</Text>
                            <Text style={styles.statLabel}>Contaminated Land</Text>
                        </View>

                        <View style={styles.statCard}>
                            <Ionicons name="git-network" size={24} color={C.info} />
                            <Text style={styles.statVal}>{impact.logistical?.supply_routes_disrupted} Rts</Text>
                            <Text style={styles.statLabel}>Disrupted Routes</Text>
                        </View>
                    </View>

                    {/* Timeline Projections */}
                    <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Casualty Evolution Projection</Text>
                    <View style={styles.chartCard}>
                        <View style={styles.chartLegend}>
                            <View style={styles.legendItem}>
                                <View style={[styles.legendDot, { backgroundColor: C.danger }]} />
                                <Text style={styles.legendText}>Without Action</Text>
                            </View>
                            <View style={styles.legendItem}>
                                <View style={[styles.legendDot, { backgroundColor: C.low }]} />
                                <Text style={styles.legendText}>With Action Plan</Text>
                            </View>
                        </View>

                        {/* Custom visual progress display for timeline stages */}
                        {Object.entries(impact.projections || {}).map(([key, val]: [string, any]) => (
                            <View key={key} style={styles.chartRow}>
                                <Text style={styles.rowLabel}>{key.toUpperCase()}</Text>
                                <View style={styles.barsContainer}>
                                    <View style={[styles.bar, { width: `${val.without_intervention}%`, backgroundColor: C.danger }]} />
                                    <View style={[styles.bar, { width: `${val.with_intervention}%`, backgroundColor: C.low, marginTop: 4 }]} />
                                </View>
                                <Text style={styles.rowVal}>-{Math.round(100 - (val.with_intervention / val.without_intervention)*100)}%</Text>
                            </View>
                        ))}
                    </View>
                </ScrollView>
            ) : null}
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
    loader: { flex: 1, justifyContent: "center", alignItems: "center" },
    loaderText: { color: C.textSec, marginTop: 12, fontSize: 14 },
    scroll: { padding: 20, paddingBottom: 40 },
    sectionTitle: { color: C.text, fontSize: 18, fontWeight: "700", marginBottom: 15 },
    statsGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
    statCard: {
        width: (width - 50) / 2, backgroundColor: C.surface, borderRadius: 12,
        padding: 16, marginBottom: 10, borderWidth: 1, borderColor: C.border,
        alignItems: "center"
    },
    statVal: { color: C.text, fontSize: 18, fontWeight: "800", marginTop: 10 },
    statLabel: { color: C.textSec, fontSize: 12, marginTop: 4 },
    chartCard: {
        backgroundColor: C.surface, borderRadius: 12, padding: 16,
        borderWidth: 1, borderColor: C.border
    },
    chartLegend: { flexDirection: "row", justifyContent: "flex-end", marginBottom: 15, gap: 16 },
    legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
    legendDot: { width: 10, height: 10, borderRadius: 5 },
    legendText: { color: C.textSec, fontSize: 12 },
    chartRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
    rowLabel: { color: C.text, fontSize: 12, fontWeight: "700", width: 50 },
    barsContainer: { flex: 1, paddingHorizontal: 10 },
    bar: { height: 6, borderRadius: 3 },
    rowVal: { color: C.low, fontSize: 12, fontWeight: "700", width: 45, textAlign: "right" }
});
