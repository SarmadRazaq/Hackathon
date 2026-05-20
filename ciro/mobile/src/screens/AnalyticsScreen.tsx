import React, { useEffect, useState, useRef } from "react";
import {
    View, Text, StyleSheet, ScrollView, Dimensions,
    ActivityIndicator, TouchableOpacity, Platform,
    StatusBar as RNStatusBar, Animated
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { PieChart, BarChart } from "react-native-chart-kit";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../services/firebaseConfig";
import { Ionicons } from "@expo/vector-icons";
import MapView, { Marker, Circle, UrlTile } from "react-native-maps";

const { width } = Dimensions.get("window");

const C = {
  bg: "#181B22",
  surface: "#222731",
  surfaceEl: "#2E3442",
  primary: "#FFAE00",
  secondary: "#0A84FF",
  text: "#F8FAFC",
  textSec: "#94A3B8",
  danger: "#FF5252",
  warning: "#FF9F0A",
  info: "#30D158",
  border: "#384152aa",
};

const GEO_LOOKUP: Record<string, { lat: number; lng: number }> = {
    "Islamabad": { lat: 33.6844, lng: 73.0479 },
    "G-10": { lat: 33.6688, lng: 73.0124 },
    "Karachi": { lat: 24.8607, lng: 67.0011 },
    "Lahore": { lat: 31.5204, lng: 74.3587 },
    "Gulberg": { lat: 31.5131, lng: 74.3485 },
    "Saddar": { lat: 24.8556, lng: 67.0283 },
    "George Town": { lat: 24.8500, lng: 66.9900 },
    "Peshawar": { lat: 34.0151, lng: 71.5249 },
    "Quetta": { lat: 30.1798, lng: 66.9750 },
    "Rawalpindi": { lat: 33.5651, lng: 73.0169 },
};

const SEV_COLORS: Record<string, string> = {
    CRITICAL: C.danger,
    HIGH: C.warning,
    MEDIUM: C.secondary,
    LOW: C.info,
};

type DateFilter = "24h" | "7d" | "30d" | "all";

const DATE_FILTER_OPTIONS: { key: DateFilter; label: string; ms: number }[] = [
    { key: "24h", label: "24h", ms: 24 * 60 * 60 * 1000 },
    { key: "7d", label: "7 days", ms: 7 * 24 * 60 * 60 * 1000 },
    { key: "30d", label: "30 days", ms: 30 * 24 * 60 * 60 * 1000 },
    { key: "all", label: "All time", ms: 0 },
];

export default function AnalyticsScreen({ navigation }: any) {
    const [loading, setLoading] = useState(true);
    const [allIncidents, setAllIncidents] = useState<any[]>([]);
    const [dateFilter, setDateFilter] = useState<DateFilter>("30d");
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Try ordering by detected_at first (our seeded data), fall back to timestamp
        const unsubscribe = onSnapshot(
            query(collection(db, "incidents")),
            (snapshot) => {
                const data: any[] = [];
                snapshot.forEach(doc => {
                    const docData = doc.data();
                    data.push({ _id: doc.id, ...docData });
                });
                // Sort by detected_at or timestamp
                data.sort((a, b) => {
                    const dateA = new Date(a.detected_at || a.timestamp || 0).getTime();
                    const dateB = new Date(b.detected_at || b.timestamp || 0).getTime();
                    return dateB - dateA; // Descending
                });
                console.log("[AnalyticsScreen] Loaded incidents:", data.length, data);
                setAllIncidents(data);
                setLastUpdated(new Date());
                setLoading(false);
                Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
            },
            (err) => {
                console.error("Analytics snapshot error:", err);
                setLoading(false);
            }
        );
        return () => unsubscribe();
    }, []);

    // Apply date filter
    const incidentData = (() => {
        const opt = DATE_FILTER_OPTIONS.find(o => o.key === dateFilter)!;
        if (opt.key === "all") return allIncidents;
        const cutoff = Date.now() - opt.ms;
        return allIncidents.filter(inc => {
            const ts = inc.timestamp ? new Date(inc.timestamp).getTime() : (inc.detected_at ? new Date(inc.detected_at).getTime() : 0);
            return ts >= cutoff;
        });
    })();

    // Compute stats
    const typeCounts: Record<string, number> = {};
    const severityCounts: Record<string, number> = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
    let totalDuration = 0;
    const heatmapMarkers: { lat: number; lng: number; severity: string; title: string; incident: any }[] = [];

    incidentData.forEach(inc => {
        // Support both simple crisis schema and complex pipeline schema
        let type = inc.type || "Unknown";
        if (type !== "Unknown") {
            type = type.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());
        }
        typeCounts[type] = (typeCounts[type] || 0) + 1;

        // Get severity from simple schema first, then complex schema
        let sev = inc.severity || "LOW";
        if (!inc.severity && inc.agent_outputs?.crisis_assessment) {
            const assessmentText = typeof inc.agent_outputs.crisis_assessment === "string" ? inc.agent_outputs.crisis_assessment : "";
            if (assessmentText.includes("CRITICAL")) sev = "CRITICAL";
            else if (assessmentText.includes("HIGH")) sev = "HIGH";
            else if (assessmentText.includes("MEDIUM")) sev = "MEDIUM";
        }
        if (severityCounts[sev] !== undefined) severityCounts[sev]++;

        totalDuration += (inc.pipeline_duration_seconds || 0);

        // Get location from simple schema first, then complex schema
        const loc = inc.location || inc.input?.weather_location || inc.input?.traffic_location || "";
        console.log("[AnalyticsScreen] Incident:", inc._id, "type:", type, "sev:", sev, "loc:", loc);

        // Get coordinates
        let coords = inc.coordinates;
        if (!coords || typeof coords !== 'object' || !coords.lat) {
            // Try to find coordinates from location lookup
            for (const [key, val] of Object.entries(GEO_LOOKUP)) {
                if (loc.includes(key)) {
                    coords = { lat: val.lat, lng: val.lng };
                    break;
                }
            }
        }

        if (coords && typeof coords.lat === 'number' && typeof coords.lng === 'number') {
            heatmapMarkers.push({
                lat: coords.lat + (Math.random() - 0.5) * 0.01,
                lng: coords.lng + (Math.random() - 0.5) * 0.01,
                severity: sev,
                title: `${type} — ${sev}`,
                incident: inc,
            });
        }
    });

    const avgDuration = incidentData.length ? Math.round(totalDuration / incidentData.length) : 0;

    const pieData = Object.keys(typeCounts).map((key, index) => {
        const colors = [C.primary, C.secondary, C.warning, C.danger, C.info, "#7C4DFF"];
        return {
            name: key.replace("_", " "),
            population: typeCounts[key],
            color: colors[index % colors.length],
            legendFontColor: C.textSec,
            legendFontSize: 11
        };
    });

    const barData = {
        labels: ["Critical", "High", "Medium", "Low"],
        datasets: [{ data: [severityCounts.CRITICAL, severityCounts.HIGH, severityCounts.MEDIUM, severityCounts.LOW] }]
    };

    if (loading) {
        return (
            <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
                <StatusBar style="light" backgroundColor="transparent" translucent={true} />
                <ActivityIndicator size="large" color={C.primary} />
                <Text style={{ color: C.textSec, marginTop: 12, fontSize: 12 }}>Loading analytics...</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            <StatusBar style="light" backgroundColor="transparent" translucent={true} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={20} color={C.text} />
                </TouchableOpacity>
                <View style={{ alignItems: "center" }}>
                    <Text style={styles.headerTitle}>Executive Dashboard</Text>
                    <Text style={styles.headerSub}>
                        {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : "NDMA Analytics"}
                    </Text>
                </View>
                <View style={[styles.liveChip]}>
                    <View style={styles.liveDot} />
                    <Text style={styles.liveText}>LIVE</Text>
                </View>
            </View>

            <Animated.View style={{ opacity: fadeAnim }}>
                {/* Date Filter Chips */}
                <View style={styles.filterRow}>
                    {DATE_FILTER_OPTIONS.map(opt => (
                        <TouchableOpacity
                            key={opt.key}
                            style={[styles.filterChip, dateFilter === opt.key && styles.filterChipActive]}
                            onPress={() => setDateFilter(opt.key)}
                        >
                            <Text style={[styles.filterChipText, dateFilter === opt.key && styles.filterChipTextActive]}>
                                {opt.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Stat Cards */}
                <View style={styles.statsRow}>
                    {[
                        { value: incidentData.length, label: "Total", icon: "pulse-outline", color: C.primary },
                        { value: severityCounts.CRITICAL, label: "Critical", icon: "alert-circle-outline", color: C.danger },
                        { value: `${avgDuration}s`, label: "Avg Pipeline", icon: "timer-outline", color: C.warning },
                    ].map((stat, i) => (
                        <View key={i} style={styles.statCard}>
                            <View style={[styles.statIconBg, { backgroundColor: stat.color + "15" }]}>
                                <Ionicons name={stat.icon as any} size={16} color={stat.color} />
                            </View>
                            <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
                            <Text style={styles.statLabel}>{stat.label}</Text>
                        </View>
                    ))}
                </View>

                {/* Incident Heatmap */}
                <View style={styles.chartCard}>
                    <View style={styles.chartHeader}>
                        <View style={[styles.chartIconBg, { backgroundColor: C.primary + "15" }]}>
                            <Ionicons name="map" size={14} color={C.primary} />
                        </View>
                        <View>
                            <Text style={styles.chartTitle}>Incident Hotspot Map</Text>
                            <Text style={styles.chartSub}>{heatmapMarkers.length} incidents mapped — tap marker for details</Text>
                        </View>
                    </View>
                    <View style={{ height: 280, borderRadius: 14, overflow: "hidden", borderWidth: 1, borderColor: C.border }}>
                        <MapView
                            style={{ flex: 1 }}
                            mapType={Platform.OS === "android" ? "none" : "standard"}
                            initialRegion={{
                                latitude: 30.3753,
                                longitude: 69.3451,
                                latitudeDelta: 10,
                                longitudeDelta: 10,
                            }}
                            userInterfaceStyle="dark"
                        >
                            <UrlTile urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                                                     shouldReplaceMapContent={true} maximumZ={19} tileSize={256} />
                            {heatmapMarkers.map((marker, i) => (
                                <React.Fragment key={i}>
                                    <Marker
                                        coordinate={{ latitude: marker.lat, longitude: marker.lng }}
                                        title={marker.title}
                                        onPress={() => {
                                            if (marker.incident) {
                                                navigation.navigate("Result", { report: marker.incident });
                                            }
                                        }}
                                    >
                                        <View style={{
                                            width: 14, height: 14, borderRadius: 7,
                                            backgroundColor: SEV_COLORS[marker.severity] || C.info,
                                            borderWidth: 2, borderColor: '#fff',
                                        }} />
                                    </Marker>
                                    <Circle
                                        center={{ latitude: marker.lat, longitude: marker.lng }}
                                        radius={15000}
                                        fillColor={(SEV_COLORS[marker.severity] || C.info) + "22"}
                                        strokeColor={(SEV_COLORS[marker.severity] || C.info) + "44"}
                                        strokeWidth={1}
                                    />
                                </React.Fragment>
                            ))}
                        </MapView>
                    </View>

                    {/* Severity legend */}
                    <View style={styles.legendRow}>
                        {Object.entries(SEV_COLORS).map(([sev, color]) => (
                            <View key={sev} style={styles.legendItem}>
                                <View style={[styles.legendDot, { backgroundColor: color }]} />
                                <Text style={styles.legendLabel}>{sev}</Text>
                            </View>
                        ))}
                    </View>

                    {heatmapMarkers.length === 0 && (
                        <Text style={styles.noData}>Run pipeline scenarios to populate the heatmap</Text>
                    )}
                </View>

                {/* Pie Chart */}
                <View style={styles.chartCard}>
                    <View style={styles.chartHeader}>
                        <View style={[styles.chartIconBg, { backgroundColor: C.warning + "15" }]}>
                            <Ionicons name="pie-chart" size={14} color={C.warning} />
                        </View>
                        <View>
                            <Text style={styles.chartTitle}>Incidents by Type</Text>
                            <Text style={styles.chartSub}>{Object.keys(typeCounts).length} categories</Text>
                        </View>
                    </View>
                    {pieData.length > 0 ? (
                        <PieChart
                            data={pieData}
                            width={width - 56}
                            height={200}
                            chartConfig={{ color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})` }}
                            accessor={"population"}
                            backgroundColor={"transparent"}
                            paddingLeft={"15"}
                            center={[10, 0]}
                            absolute
                        />
                    ) : (
                        <Text style={styles.noData}>No data for this time range</Text>
                    )}
                </View>

                {/* Bar Chart */}
                <View style={styles.chartCard}>
                    <View style={styles.chartHeader}>
                        <View style={[styles.chartIconBg, { backgroundColor: C.danger + "15" }]}>
                            <Ionicons name="bar-chart" size={14} color={C.danger} />
                        </View>
                        <View>
                            <Text style={styles.chartTitle}>Severity Distribution</Text>
                            <Text style={styles.chartSub}>Across all incidents</Text>
                        </View>
                    </View>
                    <BarChart
                        data={barData}
                        width={width - 56}
                        height={200}
                        yAxisLabel=""
                        yAxisSuffix=""
                        chartConfig={{
                            backgroundColor: "transparent",
                            backgroundGradientFrom: C.surface,
                            backgroundGradientTo: C.surface,
                            decimalPlaces: 0,
                            color: (opacity = 1) => `rgba(0, 212, 170, ${opacity})`,
                            labelColor: (opacity = 1) => `rgba(136, 146, 176, ${opacity})`,
                            style: { borderRadius: 16 },
                            propsForBackgroundLines: { strokeWidth: 0.5, stroke: C.border }
                        }}
                        style={{ marginVertical: 8, borderRadius: 14 }}
                        showValuesOnTopOfBars
                    />
                </View>
            </Animated.View>

            <View style={{ height: 40 }} />
        </ScrollView>
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
    liveChip: {
        flexDirection: "row", alignItems: "center",
        backgroundColor: C.info + "18", paddingHorizontal: 10, paddingVertical: 5,
        borderRadius: 20, borderWidth: 1, borderColor: C.info + "44",
    },
    liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.info, marginRight: 5 },
    liveText: { fontSize: 9, fontWeight: "800", color: C.info, letterSpacing: 1 },

    filterRow: { flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingVertical: 12, flexWrap: "wrap" },
    filterChip: {
        paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
        backgroundColor: C.surfaceEl, borderWidth: 1, borderColor: C.border,
    },
    filterChipActive: { backgroundColor: C.primary + "22", borderColor: C.primary },
    filterChipText: { fontSize: 11, fontWeight: "600", color: C.textSec },
    filterChipTextActive: { color: C.primary },

    statsRow: { flexDirection: "row", paddingHorizontal: 16, paddingBottom: 8, gap: 8 },
    statCard: {
        flex: 1, backgroundColor: C.surface, borderRadius: 16, padding: 14,
        alignItems: "center", borderWidth: 1, borderColor: C.border,
    },
    statIconBg: { width: 30, height: 30, borderRadius: 10, alignItems: "center", justifyContent: "center", marginBottom: 8 },
    statValue: { fontSize: 22, fontWeight: "900", color: C.primary },
    statLabel: { fontSize: 10, color: C.textSec, marginTop: 4, fontWeight: "600" },

    chartCard: {
        backgroundColor: C.surface, borderRadius: 18, padding: 18,
        marginHorizontal: 16, marginBottom: 16,
        borderWidth: 1, borderColor: C.border,
    },
    chartHeader: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
    chartIconBg: { width: 30, height: 30, borderRadius: 10, alignItems: "center", justifyContent: "center", marginRight: 10 },
    chartTitle: { fontSize: 14, fontWeight: "800", color: C.text },
    chartSub: { fontSize: 10, color: C.textSec, marginTop: 1 },
    noData: { color: C.textSec, textAlign: "center", padding: 20, fontStyle: "italic", fontSize: 12 },

    legendRow: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 10 },
    legendItem: { flexDirection: "row", alignItems: "center" },
    legendDot: { width: 8, height: 8, borderRadius: 4, marginRight: 5 },
    legendLabel: { fontSize: 10, color: C.textSec, fontWeight: "600" },
});
