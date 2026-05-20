import React, { useState, useEffect, useRef } from "react";
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    Dimensions, ActivityIndicator, Platform, SafeAreaView, FlatList
} from "react-native";
import { StatusBar } from "expo-status-bar";
import MapView, { Marker, Circle, UrlTile } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../services/firebaseConfig";
import { getActiveCrises, getPublicAdvisories } from "../services/api";

const { width } = Dimensions.get("window");

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

const DARK_MAP_STYLE = [
    { "elementType": "geometry", "stylers": [{ "color": "#0f172a" }] },
    { "elementType": "labels.icon", "stylers": [{ "visibility": "off" }] },
    { "elementType": "labels.text.fill", "stylers": [{ "color": "#64748b" }] },
    { "elementType": "labels.text.stroke", "stylers": [{ "color": "#0f172a" }] },
    { "featureType": "administrative", "elementType": "geometry", "stylers": [{ "color": "#1e293b" }] },
    { "featureType": "road", "elementType": "geometry.fill", "stylers": [{ "color": "#1e293b" }] },
    { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#020617" }] }
];

export default function PublicDashboardScreen({ navigation }: any) {
    const [crises, setCrises] = useState<any[]>([]);
    const [advisories, setAdvisories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeAdvisoryIndex, setActiveAdvisoryIndex] = useState(0);

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

    const getCoordinates = (item: any) => {
        if (item.coordinates && typeof item.coordinates.latitude === "number") {
            return { latitude: item.coordinates.latitude, longitude: item.coordinates.longitude };
        }
        if (item.lat && item.lng) {
            return { latitude: Number(item.lat), longitude: Number(item.lng) };
        }
        const loc = item.location || item.title || "";
        for (const [key, val] of Object.entries(GEO_LOOKUP)) {
            if (loc.toLowerCase().includes(key.toLowerCase())) {
                return { latitude: val.lat, longitude: val.lng };
            }
        }
        return { latitude: 33.6844, longitude: 73.0479 };
    };

    useEffect(() => {
        const loadDashboardData = async () => {
            try {
                // Fetch crises
                let crisesData: any[] = [];
                try {
                    const data = await getActiveCrises("");
                    if (Array.isArray(data) && data.length > 0) {
                        crisesData = data;
                    } else {
                        crisesData = [
                            { id: "crisis-1", title: "Flash Flood — G-10 Islamabad", type: "flood", severity: "CRITICAL", location: "G-10, Islamabad", affected_population: 4500, resources_allocated: { ambulances: 3, rescue_teams: 2, dewatering_pumps: 3 } },
                            { id: "crisis-2", title: "Heat Emergency — Karachi", type: "heat", severity: "HIGH", location: "Saddar, Karachi", affected_population: 8200, resources_allocated: { ambulances: 2, water_tankers: 4 } },
                            { id: "crisis-3", title: "Traffic Accident — Gulberg", type: "accident", severity: "MEDIUM", location: "Gulberg, Lahore", affected_population: 2000, resources_allocated: { police: 2, ambulances: 1 } },
                        ];
                    }
                } catch {
                    crisesData = [
                        { id: "crisis-1", title: "Flash Flood — G-10 Islamabad", type: "flood", severity: "CRITICAL", location: "G-10, Islamabad", affected_population: 4500, resources_allocated: { ambulances: 3, rescue_teams: 2, dewatering_pumps: 3 } },
                        { id: "crisis-2", title: "Heat Emergency — Karachi", type: "heat", severity: "HIGH", location: "Saddar, Karachi", affected_population: 8200, resources_allocated: { ambulances: 2, water_tankers: 4 } },
                        { id: "crisis-3", title: "Traffic Accident — Gulberg", type: "accident", severity: "MEDIUM", location: "Gulberg, Lahore", affected_population: 2000, resources_allocated: { police: 2, ambulances: 1 } },
                    ];
                }
                setCrises(crisesData);

                // Fetch Advisories
                try {
                    const advList = await getPublicAdvisories();
                    setAdvisories(advList);
                } catch {
                    setAdvisories([
                        { id: "adv-1", location: "G-10, Islamabad", en: "G-10: Extreme Flooding. Avoid low-lying roads. Stay on higher ground.", ur: "جی 10: شدید سیلابی صورتحال۔ نشیبی سڑکوں سے گریز کریں۔ اونچے مقامات پر رہیں۔", severity: "CRITICAL" },
                        { id: "adv-2", location: "Saddar, Karachi", en: "Karachi: Heat Emergency. Limit outdoor activity 10am-4pm. Drink water.", ur: "کراچی: شدید گرمی۔ صبح 10 سے شام 4 بجے تک باہر نکلنے سے پرہیز کریں۔", severity: "HIGH" },
                    ]);
                }
            } catch (err) {
                console.error("Dashboard loading error:", err);
            } finally {
                setLoading(false);
            }
        };

        loadDashboardData();
        const interval = setInterval(loadDashboardData, 10000);

        return () => clearInterval(interval);
    }, []);

    // Aggregated metrics calculation
    const totalAffected = crises.reduce((sum, c) => sum + (c.affected_population || 0), 0);
    const activeLocationsCount = crises.length;
    
    // Sum resources
    const totalResources: Record<string, number> = {};
    crises.forEach(c => {
        const res = c.resources_allocated || {};
        Object.entries(res).forEach(([key, val]) => {
            const num = typeof val === "number" ? val : parseInt(val as any) || 0;
            totalResources[key] = (totalResources[key] || 0) + num;
        });
    });

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>Syncing Public Transparency Data...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar style="light" translucent backgroundColor="transparent" />

            {/* Tactical Header */}
            <SafeAreaView style={styles.headerSafeArea}>
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.backBtn}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            navigation.goBack();
                        }}
                    >
                        <Ionicons name="arrow-back" size={22} color="#FFF" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>NDMA CITIZEN BULLETIN</Text>
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>PUBLIC</Text>
                    </View>
                </View>
            </SafeAreaView>

            <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
                {/* 1. Dynamic Public Advisories Carousel */}
                {advisories.length > 0 && (
                    <View style={styles.advisoryCard}>
                        <View style={styles.advisoryHeader}>
                            <Ionicons name="alert-circle" size={20} color={COLORS.danger} />
                            <Text style={styles.advisoryTitle}>URGENT SAFETY BULLETINS</Text>
                        </View>
                        <Text style={styles.advisoryEnglish}>{advisories[activeAdvisoryIndex].en}</Text>
                        <Text style={styles.advisoryUrdu}>{advisories[activeAdvisoryIndex].ur}</Text>

                        {advisories.length > 1 && (
                            <View style={styles.carouselIndicators}>
                                {advisories.map((_, i) => (
                                    <TouchableOpacity
                                        key={i}
                                        style={[styles.indicatorDot, i === activeAdvisoryIndex && styles.indicatorDotActive]}
                                        onPress={() => {
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            setActiveAdvisoryIndex(i);
                                        }}
                                    />
                                ))}
                            </View>
                        )}
                    </View>
                )}

                {/* 2. Aggregated Impact Overview */}
                <View style={styles.sectionHeader}>
                    <Ionicons name="stats-chart" size={16} color={COLORS.primary} />
                    <Text style={styles.sectionTitle}>Combined National Impact</Text>
                </View>

                <View style={styles.metricsGrid}>
                    <View style={styles.metricBox}>
                        <Ionicons name="people-outline" size={22} color={COLORS.primary} />
                        <Text style={styles.metricVal}>{totalAffected.toLocaleString()}</Text>
                        <Text style={styles.metricLbl}>Affected Citizens</Text>
                    </View>
                    <View style={styles.metricBox}>
                        <Ionicons name="warning-outline" size={22} color={COLORS.danger} />
                        <Text style={styles.metricVal}>{activeLocationsCount}</Text>
                        <Text style={styles.metricLbl}>Active Hotspots</Text>
                    </View>
                </View>

                {/* 3. Small Mini Tactical Map */}
                <View style={styles.sectionHeader}>
                    <Ionicons name="map-outline" size={16} color={COLORS.primary} />
                    <Text style={styles.sectionTitle}>Public Incident Map</Text>
                </View>

                <View style={styles.mapContainer}>
                    <MapView
                        style={styles.miniMap}
                        mapType={Platform.OS === "android" ? "none" : "standard"}
                        initialRegion={{
                            latitude: 30.3753,
                            longitude: 69.3451,
                            latitudeDelta: 12,
                            longitudeDelta: 12,
                        }}
                        customMapStyle={DARK_MAP_STYLE}
                        scrollEnabled={false}
                        zoomEnabled={false}
                        pitchEnabled={false}
                        rotateEnabled={false}
                    >
                        <UrlTile
                            urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                                                     shouldReplaceMapContent={true}
                            maximumZ={19}
                            tileSize={256}
                        />
                        {crises.map((c) => {
                            const coords = getCoordinates(c);
                            const color = SEVERITY_COLORS[c.severity] || COLORS.danger;
                            return (
                                <React.Fragment key={c.id}>
                                    <Marker coordinate={coords}>
                                        <View style={[styles.miniMarker, { borderColor: color }]}>
                                            <Text style={{ fontSize: 10 }}>{getCrisisEmoji(c.type)}</Text>
                                        </View>
                                    </Marker>
                                    <Circle
                                        center={coords}
                                        radius={30000}
                                        fillColor={`${color}12`}
                                        strokeColor={`${color}30`}
                                        strokeWidth={1}
                                    />
                                </React.Fragment>
                            );
                        })}
                    </MapView>
                    <TouchableOpacity
                        style={styles.expandMapBtn}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            navigation.navigate("Map");
                        }}
                    >
                        <Ionicons name="expand" size={14} color={COLORS.bg} />
                        <Text style={styles.expandMapText}>Open Interactive Map</Text>
                    </TouchableOpacity>
                </View>

                {/* 4. Active Resource Deployments */}
                <View style={styles.sectionHeader}>
                    <Ionicons name="cube-outline" size={16} color={COLORS.primary} />
                    <Text style={styles.sectionTitle}>NDMA Mobilization Tracker</Text>
                </View>

                <View style={styles.resourceCard}>
                    <Text style={styles.resourceDesc}>
                        Live counts of emergency response materials and personnel currently operational across all active hotspots.
                    </Text>

                    <View style={styles.resourceList}>
                        {Object.keys(totalResources).length === 0 ? (
                            <Text style={styles.noResourcesText}>No resources deployed at this time.</Text>
                        ) : (
                            Object.entries(totalResources).map(([key, val]) => (
                                <View key={key} style={styles.resourceRow}>
                                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                                        <Ionicons name="checkmark-circle-outline" size={14} color={COLORS.low} />
                                        <Text style={styles.resourceKey}>{key.replace("_", " ").toUpperCase()}</Text>
                                    </View>
                                    <Text style={styles.resourceVal}>{val} Operational</Text>
                                </View>
                            ))
                        )}
                    </View>
                </View>

                {/* Bottom padding */}
                <View style={{ height: 40 }} />
            </ScrollView>
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
        backgroundColor: COLORS.surface,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingTop: Platform.OS === "android" ? 40 : 10,
        paddingBottom: 12,
    },
    backBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: "center",
        alignItems: "center",
    },
    headerTitle: {
        color: COLORS.textPrimary,
        fontSize: 15,
        fontWeight: "900",
        letterSpacing: 1.5,
    },
    badge: {
        backgroundColor: "rgba(212, 165, 32, 0.15)",
        borderColor: COLORS.primary,
        borderWidth: 1,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 4,
    },
    badgeText: {
        color: COLORS.primary,
        fontSize: 9,
        fontWeight: "800",
    },
    scrollContainer: {
        padding: 16,
        gap: 16,
    },
    advisoryCard: {
        backgroundColor: "rgba(255, 71, 87, 0.08)",
        borderWidth: 1,
        borderColor: COLORS.danger,
        borderRadius: 12,
        padding: 16,
        gap: 10,
    },
    advisoryHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    advisoryTitle: {
        color: COLORS.danger,
        fontWeight: "900",
        fontSize: 11,
        letterSpacing: 1,
    },
    advisoryEnglish: {
        color: COLORS.textPrimary,
        fontSize: 14,
        fontWeight: "700",
        lineHeight: 20,
    },
    advisoryUrdu: {
        color: COLORS.textPrimary,
        fontSize: 15,
        fontWeight: "500",
        lineHeight: 24,
        textAlign: "right",
        marginTop: 4,
    },
    carouselIndicators: {
        flexDirection: "row",
        justifyContent: "center",
        gap: 6,
        marginTop: 8,
    },
    indicatorDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: "rgba(255,255,255,0.2)",
    },
    indicatorDotActive: {
        backgroundColor: COLORS.danger,
        width: 14,
    },
    sectionHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginTop: 8,
    },
    sectionTitle: {
        color: COLORS.textPrimary,
        fontSize: 13,
        fontWeight: "800",
        textTransform: "uppercase",
        letterSpacing: 1,
    },
    metricsGrid: {
        flexDirection: "row",
        gap: 12,
    },
    metricBox: {
        flex: 1,
        backgroundColor: COLORS.surface,
        borderRadius: 12,
        padding: 16,
        alignItems: "center",
        borderWidth: 1,
        borderColor: COLORS.border,
        gap: 6,
    },
    metricVal: {
        color: COLORS.textPrimary,
        fontSize: 20,
        fontWeight: "900",
    },
    metricLbl: {
        color: COLORS.textSecondary,
        fontSize: 11,
        fontWeight: "600",
    },
    mapContainer: {
        borderRadius: 12,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: COLORS.border,
        backgroundColor: COLORS.surface,
    },
    miniMap: {
        width: "100%",
        height: 160,
    },
    miniMarker: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: "rgba(15, 23, 42, 0.9)",
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 1.5,
    },
    expandMapBtn: {
        flexDirection: "row",
        backgroundColor: COLORS.primary,
        paddingVertical: 10,
        justifyContent: "center",
        alignItems: "center",
        gap: 6,
    },
    expandMapText: {
        color: COLORS.bg,
        fontSize: 12,
        fontWeight: "800",
    },
    resourceCard: {
        backgroundColor: COLORS.surface,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
        padding: 16,
        gap: 12,
    },
    resourceDesc: {
        color: COLORS.textSecondary,
        fontSize: 12,
        lineHeight: 18,
    },
    resourceList: {
        gap: 8,
    },
    resourceRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: "rgba(255,255,255,0.03)",
    },
    resourceKey: {
        color: COLORS.textPrimary,
        fontSize: 12,
        fontWeight: "700",
    },
    resourceVal: {
        color: COLORS.primary,
        fontSize: 12,
        fontWeight: "800",
    },
    noResourcesText: {
        color: COLORS.textSecondary,
        fontSize: 12,
        textAlign: "center",
        paddingVertical: 10,
    },
});
