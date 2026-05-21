import React, { useState, useEffect, useRef } from "react";
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    SafeAreaView, Dimensions, Platform, Alert, Animated, ActivityIndicator
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db, auth } from "../services/firebaseConfig";
import { getActiveCrises } from "../services/api";
import HotspotMap from "../components/HotspotMap";

const { width, height } = Dimensions.get("window");

const COLORS = {
    bg: '#080E1E',
    surface: '#0F172A',
    surfaceElevated: '#1E293B',
    primary: '#D4A520',
    danger: '#FF4757',
    warning: '#FFA502',
    low: '#2ED573',
    info: '#1E90FF',
    textPrimary: '#F1F5F9',
    textSecondary: '#94A3B8',
    border: '#1E293B',
};

const SEVERITY_COLORS: Record<string, string> = {
    CRITICAL: COLORS.danger,
    HIGH: COLORS.warning,
    MEDIUM: COLORS.info,
    LOW: COLORS.low,
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

export default function MapScreen({ navigation }: any) {
    const [crises, setCrises] = useState<any[]>([]);
    const [reports, setReports] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedFilter, setSelectedFilter] = useState<string>("all");
    const [selectedItem, setSelectedItem] = useState<any | null>(null);

    const slideAnim = useRef(new Animated.Value(250)).current;

    const filters = [
        { key: "all", label: "All", icon: "grid-outline" },
        { key: "flood", label: "Flood", icon: "water" },
        { key: "heat", label: "Heatwave", icon: "flame" },
        { key: "accident", label: "Accident", icon: "car" },
        { key: "earthquake", label: "Earthquake", icon: "pulse" },
        { key: "reports", label: "Citizen Reports", icon: "people" }
    ];

    const getCrisisEmoji = (type: string) => {
        const icons: Record<string, string> = {
            flood: "🌊",
            heat: "🔥",
            heatwave: "🔥",
            accident: "🚗",
            earthquake: "🏚️",
            industrial: "🏭",
            infrastructure: "🏗️",
        };
        return icons[type?.toLowerCase()] || "⚠️";
    };

    // Load active crises and reports
    useEffect(() => {
        const fetchCrises = async () => {
            try {
                const user = auth.currentUser;
                if (!user) return;
                const token = await user.getIdToken();
                const data = await getActiveCrises(token);
                if (Array.isArray(data) && data.length > 0) {
                    setCrises(data);
                } else {
                    throw new Error("Empty list");
                }
            } catch {
                // Fallback demo data
                setCrises([
                    { id: "crisis-1", title: "Flash Flood — G-10 Islamabad", type: "flood", severity: "CRITICAL", location: "G-10, Islamabad", affected_population: 4500, status: "active" },
                    { id: "crisis-2", title: "Heat Emergency — Karachi", type: "heat", severity: "HIGH", location: "Saddar, Karachi", affected_population: 8200, status: "active" },
                    { id: "crisis-3", title: "Traffic Accident — Gulberg", type: "accident", severity: "MEDIUM", location: "Gulberg, Lahore", affected_population: 2000, status: "active" },
                ]);
            } finally {
                setLoading(false);
            }
        };

        fetchCrises();
        const interval = setInterval(fetchCrises, 7000);

        const reportsQuery = query(collection(db, "reports"), orderBy("createdAt", "desc"));
        const unsubscribeReports = onSnapshot(reportsQuery, (snapshot) => {
            const reps: any[] = [];
            snapshot.forEach((docSnap) => {
                reps.push({ id: docSnap.id, ...docSnap.data() });
            });
            setReports(reps);
        });

        return () => {
            clearInterval(interval);
            unsubscribeReports();
        };
    }, []);

    // Bottom drawer animation
    useEffect(() => {
        if (selectedItem) {
            Animated.spring(slideAnim, {
                toValue: 0,
                useNativeDriver: true,
                friction: 8,
                tension: 40
            }).start();
        } else {
            Animated.timing(slideAnim, {
                toValue: 250,
                duration: 200,
                useNativeDriver: true
            }).start();
        }
    }, [selectedItem]);

    const handleMarkerPress = (item: any) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setSelectedItem(item);
    };

    // Filter logic
    const filteredCrises = crises.filter(c => {
        if (selectedFilter === "all") return true;
        if (selectedFilter === "reports") return false;
        return c.type?.toLowerCase() === selectedFilter;
    });

    const showCitizenReports = selectedFilter === "reports" || selectedFilter === "all";

    return (
        <View style={styles.container}>
            <StatusBar style="light" translucent backgroundColor="transparent" />

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                    <Text style={styles.loadingText}>Loading Crisis Intelligence...</Text>
                </View>
            ) : (
                <>
                    {/* Scrollable Crisis List */}
                    <ScrollView
                        style={{ flex: 1, paddingTop: 120 }}
                        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
                        scrollEnabled={true}
                    >
                        {/* ── Crisis Intelligence Map ── */}
                        {(() => {
                            const mapMarkers: { id: string; lat: number; lng: number; severity: string; title: string; emoji?: string; tap: any }[] = [];

                            if (selectedFilter !== "reports") {
                                filteredCrises.forEach((c) => {
                                    let lat = c.coordinates?.lat, lng = c.coordinates?.lng;
                                    if (lat == null || lng == null) {
                                        for (const [key, val] of Object.entries(GEO_LOOKUP)) {
                                            if ((c.location || "").includes(key)) { lat = val.lat; lng = val.lng; break; }
                                        }
                                    }
                                    if (lat != null && lng != null) {
                                        mapMarkers.push({
                                            id: `crisis-${c.id}`, lat, lng,
                                            severity: c.severity || "MEDIUM",
                                            title: c.title || c.type || "Active Crisis",
                                            emoji: getCrisisEmoji(c.type),
                                            tap: c,
                                        });
                                    }
                                });
                            }
                            if (showCitizenReports) {
                                reports.forEach((r) => {
                                    const loc = r.traffic_location || r.weather_location || "";
                                    for (const [key, val] of Object.entries(GEO_LOOKUP)) {
                                        if (loc.includes(key)) {
                                            mapMarkers.push({
                                                id: `report-${r.id}`,
                                                lat: val.lat + (Math.random() - 0.5) * 0.01,
                                                lng: val.lng + (Math.random() - 0.5) * 0.01,
                                                severity: "MEDIUM",
                                                title: `${loc} — ${r.status || "pending"}`,
                                                tap: r,
                                            });
                                            break;
                                        }
                                    }
                                });
                            }

                            return (
                                <View style={{ marginBottom: 16 }}>
                                    <HotspotMap
                                        markers={mapMarkers.map((m) => ({
                                            id: m.id, lat: m.lat, lng: m.lng,
                                            severity: m.severity, title: m.title, emoji: m.emoji,
                                        }))}
                                        height={260}
                                        onMarkerPress={(id) => {
                                            const m = mapMarkers.find((x) => x.id === id);
                                            if (m) handleMarkerPress(m.tap);
                                        }}
                                    />
                                </View>
                            );
                        })()}

                        {/* Crises List */}
                        {selectedFilter !== "reports" && filteredCrises.length > 0 && (
                            <>
                                <Text style={{ color: COLORS.textPrimary, fontSize: 16, fontWeight: "800", marginBottom: 12 }}>
                                    🗺️ Active Crises ({filteredCrises.length})
                                </Text>
                                {filteredCrises.map((c) => {
                                    const color = SEVERITY_COLORS[c.severity] || COLORS.danger;
                                    return (
                                        <TouchableOpacity
                                            key={c.id}
                                            style={{
                                                backgroundColor: COLORS.surface,
                                                borderLeftWidth: 4,
                                                borderLeftColor: color,
                                                borderRadius: 12,
                                                padding: 14,
                                                marginBottom: 12,
                                            }}
                                            onPress={() => handleMarkerPress(c)}
                                            activeOpacity={0.7}
                                        >
                                            <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
                                                <Text style={{ fontSize: 28 }}>{getCrisisEmoji(c.type)}</Text>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={{ color: COLORS.textPrimary, fontWeight: "800", fontSize: 14 }}>
                                                        {c.title}
                                                    </Text>
                                                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 }}>
                                                        <Ionicons name="location-outline" size={12} color={COLORS.textSecondary} />
                                                        <Text style={{ color: COLORS.textSecondary, fontSize: 12 }}>
                                                            {c.location}
                                                        </Text>
                                                    </View>
                                                    <View style={{ flexDirection: "row", gap: 12, marginTop: 8 }}>
                                                        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                                                            <Ionicons name="people-outline" size={11} color={COLORS.textSecondary} />
                                                            <Text style={{ color: COLORS.textSecondary, fontSize: 11 }}>
                                                                {c.affected_population?.toLocaleString() || "Unknown"} affected
                                                            </Text>
                                                        </View>
                                                        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                                                            <Ionicons name="time-outline" size={11} color={COLORS.textSecondary} />
                                                            <Text style={{ color: COLORS.textSecondary, fontSize: 11 }}>
                                                                Active
                                                            </Text>
                                                        </View>
                                                    </View>
                                                </View>
                                                <View style={{ backgroundColor: color + "22", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: color + "44" }}>
                                                    <Text style={{ color, fontSize: 11, fontWeight: "800" }}>{c.severity}</Text>
                                                </View>
                                            </View>
                                        </TouchableOpacity>
                                    );
                                })}
                            </>
                        )}

                        {selectedFilter !== "reports" && filteredCrises.length === 0 && (
                            <View style={{ alignItems: "center", marginTop: 40 }}>
                                <Text style={{ color: COLORS.textSecondary, fontSize: 14 }}>
                                    No crises in this category
                                </Text>
                            </View>
                        )}

                        {/* Citizen Reports List */}
                        {showCitizenReports && reports.length > 0 && (
                            <>
                                <Text style={{ color: COLORS.textPrimary, fontSize: 16, fontWeight: "800", marginBottom: 12, marginTop: 24 }}>
                                    👥 Citizen Reports ({reports.length})
                                </Text>
                                {reports.map((r) => {
                                    const isVerified = r.status === "dispatched" || r.status === "processing";
                                    const statusColor = isVerified ? COLORS.low : r.status === "pending" ? COLORS.warning : COLORS.danger;
                                    return (
                                        <TouchableOpacity
                                            key={r.id}
                                            style={{
                                                backgroundColor: COLORS.surface,
                                                borderLeftWidth: 4,
                                                borderLeftColor: statusColor,
                                                borderRadius: 12,
                                                padding: 14,
                                                marginBottom: 12,
                                            }}
                                            onPress={() => handleMarkerPress(r)}
                                            activeOpacity={0.7}
                                        >
                                            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                                                <Ionicons name="people" size={24} color={statusColor} />
                                                <View style={{ flex: 1 }}>
                                                    <Text style={{ color: COLORS.textPrimary, fontWeight: "800", fontSize: 14 }}>
                                                        {r.traffic_location || r.weather_location || "Unknown Location"}
                                                    </Text>
                                                    <Text style={{ color: COLORS.textSecondary, fontSize: 12, marginTop: 4 }}>
                                                        Status: {(r.status || "pending").toUpperCase()}
                                                    </Text>
                                                </View>
                                                <View style={{ backgroundColor: statusColor + "22", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}>
                                                    <Text style={{ color: statusColor, fontSize: 11, fontWeight: "800" }}>
                                                        {isVerified ? "✓ Verified" : "⏳ Pending"}
                                                    </Text>
                                                </View>
                                            </View>
                                        </TouchableOpacity>
                                    );
                                })}
                            </>
                        )}

                        {showCitizenReports && reports.length === 0 && filteredCrises.length === 0 && (
                            <View style={{ alignItems: "center", marginTop: 40 }}>
                                <Ionicons name="shield-checkmark-outline" size={48} color={COLORS.low + "33"} />
                                <Text style={{ color: COLORS.textSecondary, fontSize: 14, marginTop: 12 }}>
                                    No reports yet. All clear! ✅
                                </Text>
                            </View>
                        )}
                    </ScrollView>

                    {/* Float HUD Header */}
                    <SafeAreaView style={styles.headerSafeArea}>
                        <View style={styles.header}>
                            <TouchableOpacity
                                style={styles.iconButton}
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    navigation.goBack();
                                }}
                            >
                                <Ionicons name="arrow-back" size={22} color="#FFF" />
                            </TouchableOpacity>
                            <Text style={styles.headerTitle}>Crisis Intelligence Map</Text>
                            <View style={{ width: 40 }} />
                        </View>

                        {/* Filters Chip Container */}
                        <View style={styles.filterWrapper}>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.filterScroll}
                            >
                                {filters.map((f) => {
                                    const isSelected = selectedFilter === f.key;
                                    return (
                                        <TouchableOpacity
                                            key={f.key}
                                            style={[
                                                styles.filterChip,
                                                isSelected && styles.filterChipActive,
                                            ]}
                                            onPress={() => {
                                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                setSelectedFilter(f.key);
                                                setSelectedItem(null);
                                            }}
                                        >
                                            <Ionicons
                                                name={f.icon as any}
                                                size={14}
                                                color={isSelected ? COLORS.bg : COLORS.textSecondary}
                                            />
                                            <Text style={[styles.filterChipText, isSelected && styles.filterChipTextActive]}>
                                                {f.label}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                        </View>
                    </SafeAreaView>

                    {/* Tapped Item Detail Drawer Card */}
                    {selectedItem && (
                        <Animated.View style={[styles.detailDrawer, { transform: [{ translateY: slideAnim }] }]}>
                            <View style={styles.drawerHeader}>
                                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                                    <Text style={styles.drawerEmoji}>
                                        {selectedItem.type ? getCrisisEmoji(selectedItem.type) : "👥"}
                                    </Text>
                                    <View>
                                        <Text style={styles.drawerTitle} numberOfLines={1}>
                                            {selectedItem.title || selectedItem.traffic_location || selectedItem.weather_location || "Citizen Report"}
                                        </Text>
                                        <Text style={styles.drawerSub}>
                                            {selectedItem.location || selectedItem.traffic_location || "Awaiting Verification"}
                                        </Text>
                                    </View>
                                </View>
                                <TouchableOpacity
                                    style={styles.closeDrawerBtn}
                                    onPress={() => setSelectedItem(null)}
                                >
                                    <Ionicons name="close" size={20} color={COLORS.textSecondary} />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.drawerMetrics}>
                                <View style={styles.metricItem}>
                                    <Text style={styles.metricLbl}>SEVERITY</Text>
                                    <Text style={[styles.metricVal, { color: SEVERITY_COLORS[selectedItem.severity || "MEDIUM"] || COLORS.info }]}>
                                        {selectedItem.severity || "AWAITING"}
                                    </Text>
                                </View>
                                <View style={styles.metricItem}>
                                    <Text style={styles.metricLbl}>POPULATION</Text>
                                    <Text style={styles.metricVal}>
                                        {selectedItem.affected_population ? selectedItem.affected_population.toLocaleString() : "Unknown"}
                                    </Text>
                                </View>
                                <View style={styles.metricItem}>
                                    <Text style={styles.metricLbl}>STATUS</Text>
                                    <Text style={[styles.metricVal, { color: selectedItem.status === "active" ? COLORS.danger : COLORS.low }]}>
                                        {(selectedItem.status || "PENDING").toUpperCase()}
                                    </Text>
                                </View>
                            </View>

                            <Text style={styles.drawerDesc} numberOfLines={3}>
                                {selectedItem.agent_outputs?.situation_report ? (
                                    selectedItem.agent_outputs.situation_report.replace(/__POLYGON__[\s\S]*$/, "").trim()
                                ) : (
                                    selectedItem.description || selectedItem.input?.social_media_text || "No additional description available."
                                )}
                            </Text>

                            {(selectedItem.agent_outputs || selectedItem.pipelineResult) && (
                                <TouchableOpacity
                                    style={styles.actionBtn}
                                    onPress={() => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                        let reportData = selectedItem;
                                        if (selectedItem.pipelineResult) {
                                            try {
                                                reportData = JSON.parse(selectedItem.pipelineResult);
                                            } catch {}
                                        }
                                        navigation.navigate("Result", { report: reportData });
                                    }}
                                >
                                    <Ionicons name="shield-checkmark" size={16} color={COLORS.bg} />
                                    <Text style={styles.actionBtnTxt}>Inspect Response Plan</Text>
                                </TouchableOpacity>
                            )}
                        </Animated.View>
                    )}
                </>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.bg,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        gap: 12,
    },
    loadingText: {
        color: COLORS.textSecondary,
        fontSize: 14,
        fontWeight: "500",
    },
    headerSafeArea: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        backgroundColor: COLORS.bg + "dd",
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingTop: Platform.OS === "android" ? 40 : 10,
        paddingBottom: 10,
    },
    headerTitle: {
        color: "#FFF",
        fontSize: 16,
        fontWeight: "800",
        letterSpacing: 0.5,
    },
    iconButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "rgba(15, 23, 42, 0.75)",
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.08)",
    },
    filterWrapper: {
        marginTop: 6,
    },
    filterScroll: {
        paddingHorizontal: 16,
        gap: 8,
    },
    filterChip: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: "rgba(15, 23, 42, 0.85)",
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.08)",
    },
    filterChipActive: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    filterChipText: {
        color: COLORS.textSecondary,
        fontSize: 12,
        fontWeight: "600",
    },
    filterChipTextActive: {
        color: COLORS.bg,
        fontWeight: "700",
    },
    detailDrawer: {
        position: "absolute",
        bottom: Platform.OS === "ios" ? 34 : 16,
        left: 16,
        right: 16,
        backgroundColor: "rgba(15, 23, 42, 0.95)",
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.1)",
        padding: 16,
        zIndex: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 10,
    },
    drawerHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 14,
    },
    drawerEmoji: {
        fontSize: 26,
    },
    drawerTitle: {
        color: COLORS.textPrimary,
        fontSize: 15,
        fontWeight: "700",
        width: width * 0.6,
    },
    drawerSub: {
        color: COLORS.textSecondary,
        fontSize: 11,
        marginTop: 2,
    },
    closeDrawerBtn: {
        padding: 4,
    },
    drawerMetrics: {
        flexDirection: "row",
        backgroundColor: "rgba(255,255,255,0.03)",
        borderRadius: 10,
        paddingVertical: 10,
        paddingHorizontal: 12,
        justifyContent: "space-between",
        marginBottom: 12,
    },
    metricItem: {
        alignItems: "flex-start",
    },
    metricLbl: {
        color: COLORS.textSecondary,
        fontSize: 9,
        fontWeight: "700",
        letterSpacing: 0.5,
    },
    metricVal: {
        color: COLORS.textPrimary,
        fontSize: 13,
        fontWeight: "800",
        marginTop: 3,
    },
    drawerDesc: {
        color: COLORS.textSecondary,
        fontSize: 12.5,
        lineHeight: 18,
        marginBottom: 16,
    },
    actionBtn: {
        flexDirection: "row",
        backgroundColor: COLORS.primary,
        borderRadius: 10,
        height: 44,
        justifyContent: "center",
        alignItems: "center",
        gap: 8,
    },
    actionBtnTxt: {
        color: COLORS.bg,
        fontSize: 13,
        fontWeight: "700",
    },
});
