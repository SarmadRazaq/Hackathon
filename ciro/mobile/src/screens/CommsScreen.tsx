import React, { useState, useEffect } from "react";
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity,
    ActivityIndicator, Dimensions, Platform
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { auth } from "../services/firebaseConfig";
import { getActiveCrises, draftCommsMessage } from "../services/api";

const { width } = Dimensions.get("window");

const C = {
    bg: "#181B22", surface: "#222731", surfaceEl: "#2E3442",
    primary: "#FFAE00", danger: "#FF5252", low: "#30D158",
    info: "#0A84FF", warning: "#FF9F0A",
    text: "#F8FAFC", textSec: "#94A3B8", border: "#384152aa",
};

const STAKEHOLDERS = [
    { key: "citizens", name: "📢 Citizen Broadcast" },
    { key: "wasa", name: "💧 WASA Operators" },
    { key: "ndma", name: "🛡️ NDMA Coordinators" },
];

export default function CommsScreen() {
    const [loading, setLoading] = useState(false);
    const [crises, setCrises] = useState<any[]>([]);
    const [selectedCrisisId, setSelectedCrisisId] = useState<string>("");
    const [selectedStakeholder, setSelectedStakeholder] = useState<string>("citizens");
    const [language, setLanguage] = useState<"en" | "ur">("en");
    const [draftText, setDraftText] = useState<string>("");

    const loadCrises = async () => {
        try {
            const token = await auth.currentUser?.getIdToken() || "";
            const active = await getActiveCrises(token);
            if (active && active.length > 0) {
                setCrises(active);
                setSelectedCrisisId(active[0].id);
            } else {
                setCrises([
                    { id: "crisis-1", title: "Flash Flood — G-10 Islamabad", type: "flood" },
                    { id: "crisis-2", title: "Extreme Heat Emergency", type: "heatwave" }
                ]);
                setSelectedCrisisId("crisis-1");
            }
        } catch (err) {
            setCrises([
                { id: "crisis-1", title: "Flash Flood — G-10 Islamabad", type: "flood" },
                { id: "crisis-2", title: "Extreme Heat Emergency", type: "heatwave" }
            ]);
            setSelectedCrisisId("crisis-1");
        }
    };

    const fetchDraft = async () => {
        if (!selectedCrisisId) return;
        setLoading(true);
        try {
            const token = await auth.currentUser?.getIdToken() || "";
            const res = await draftCommsMessage(selectedStakeholder, selectedCrisisId, language, token);
            if (res && res.message) {
                setDraftText(res.message);
            } else {
                setDraftText(getFallbackComms(selectedStakeholder, language));
            }
        } catch (err) {
            console.warn("Comms draft API failed, returning offline translation.", err);
            setDraftText(getFallbackComms(selectedStakeholder, language));
        } finally {
            setLoading(false);
        }
    };

    const getFallbackComms = (stakeholder: string, lang: string) => {
        if (lang === "ur") {
            if (stakeholder === "citizens") {
                return "📢 شہری انتباہ: سیکٹر G-10 میں شدید بارشوں کی وجہ سے سیلابی صورتحال ہے۔ غیر ضروری نقل و حرکت سے گریز کریں اور ہنگامی صورتحال میں 1122 پر رابطہ کریں۔";
            }
            if (stakeholder === "wasa") {
                return "💧 واسا آپریٹر الرٹ: G-10 نالہ اوور فلو ہو رہا ہے۔ ڈی واٹرنگ پمپس کو فوری طور پر آن کریں اور فلو والوز کی نگرانی کریں۔";
            }
            return "🛡️ این ڈی ایم اے الرٹ: فیلڈ ٹیموں کو ریسکیو کشتیوں اور لائف جیکٹس کے ساتھ سیکٹر G-10/2 میں روانہ کر دیا گیا ہے۔";
        } else {
            if (stakeholder === "citizens") {
                return "📢 Public Alert: Severe waterlogging reported in Sector G-10. Please avoid driving through flooded streets. Emergency helpline: 1122.";
            }
            if (stakeholder === "wasa") {
                return "💧 WASA Action Required: Dewatering pumps must be activated at zero points in Sector G-10. Clear storm drains to reduce backflow.";
            }
            return "🛡️ NDMA Briefing: Triage activated. Coordinates synced. Deploying 3 dewatering pumps and 2 rescue boats to Sector G-10.";
        }
    };

    useEffect(() => {
        loadCrises();
    }, []);

    useEffect(() => {
        if (selectedCrisisId) {
            fetchDraft();
        }
    }, [selectedCrisisId, selectedStakeholder, language]);

    const handleLanguageChange = (lang: "en" | "ur") => {
        Haptics.selectionAsync();
        setLanguage(lang);
    };

    const handleStakeholderChange = (stakeholder: string) => {
        Haptics.selectionAsync();
        setSelectedStakeholder(stakeholder);
    };

    return (
        <View style={styles.container}>
            <StatusBar style="light" />

            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>AI Stakeholder Comms</Text>
                <Text style={styles.headerSubtitle}>Bilingual emergency notification draft center</Text>
            </View>

            {/* Crisis Selection list */}
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

            <ScrollView contentContainerStyle={styles.scroll}>
                {/* Stakeholder tabs */}
                <Text style={styles.sectionTitle}>Select Stakeholder Group</Text>
                <View style={styles.tabBar}>
                    {STAKEHOLDERS.map((s) => {
                        const active = s.key === selectedStakeholder;
                        return (
                            <TouchableOpacity
                                key={s.key}
                                onPress={() => handleStakeholderChange(s.key)}
                                style={[styles.tabBtn, active && styles.tabBtnActive]}
                            >
                                <Text style={[styles.tabText, active && styles.tabTextActive]}>
                                    {s.name}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* Language selection toggles */}
                <View style={styles.langContainer}>
                    <TouchableOpacity
                        onPress={() => handleLanguageChange("en")}
                        style={[styles.langBtn, language === "en" && styles.langBtnActive]}
                    >
                        <Text style={[styles.langText, language === "en" && styles.langTextActive]}>English (EN)</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => handleLanguageChange("ur")}
                        style={[styles.langBtn, language === "ur" && styles.langBtnActive]}
                    >
                        <Text style={[styles.langText, language === "ur" && styles.langTextActive]}>اردو (Urdu)</Text>
                    </TouchableOpacity>
                </View>

                {/* Text Draft Box */}
                <View style={styles.draftCard}>
                    <View style={styles.draftCardHeader}>
                        <Text style={styles.draftCardTitle}>Draft Message Preview</Text>
                        <Ionicons name="chatbox-ellipses" size={18} color={C.primary} />
                    </View>
                    
                    {loading ? (
                        <View style={styles.draftLoader}>
                            <ActivityIndicator size="small" color={C.primary} />
                            <Text style={styles.draftLoaderText}>Synthesizing tone metrics...</Text>
                        </View>
                    ) : (
                        <Text style={[styles.draftBody, language === "ur" && styles.urduText]}>
                            {draftText}
                        </Text>
                    )}
                </View>
            </ScrollView>
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
    sectionTitle: { color: C.text, fontSize: 16, fontWeight: "700", marginBottom: 12 },
    tabBar: { flexDirection: "row", justifyContent: "space-between", marginBottom: 20 },
    tabBtn: {
        flex: 1, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
        paddingVertical: 12, alignItems: "center", borderRadius: 8, marginHorizontal: 2
    },
    tabBtnActive: { backgroundColor: C.surfaceEl, borderColor: C.primary },
    tabText: { color: C.textSec, fontSize: 11, fontWeight: "600" },
    tabTextActive: { color: C.primary, fontWeight: "700" },
    langContainer: { flexDirection: "row", justifyContent: "center", marginBottom: 20, gap: 10 },
    langBtn: {
        paddingHorizontal: 16, paddingVertical: 8, borderRadius: 4,
        backgroundColor: C.surface, borderWidth: 1, borderColor: C.border
    },
    langBtnActive: { backgroundColor: C.primary },
    langText: { color: C.textSec, fontSize: 12, fontWeight: "600" },
    langTextActive: { color: C.bg, fontWeight: "700" },
    draftCard: {
        backgroundColor: C.surface, borderRadius: 12, padding: 18,
        borderWidth: 1, borderColor: C.border, minHeight: 180
    },
    draftCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
    draftCardTitle: { color: C.textSec, fontSize: 12, fontWeight: "700", letterSpacing: 0.5 },
    draftBody: { color: C.text, fontSize: 15, lineHeight: 22 },
    urduText: { textAlign: "right", writingDirection: "rtl", fontFamily: Platform.OS === "android" ? "normal" : "Geeza Pro", fontSize: 17 },
    draftLoader: { flex: 1, justifyContent: "center", alignItems: "center", paddingVertical: 40 },
    draftLoaderText: { color: C.textSec, fontSize: 12, marginTop: 8 }
});
