import React, { useState, useEffect, useRef } from "react";
import {
    View, Text, TextInput, TouchableOpacity, ScrollView,
    StyleSheet, Animated, ActivityIndicator, Alert, Image, Platform,
    StatusBar as RNStatusBar, RefreshControl, Modal
} from "react-native";
import { StatusBar } from "expo-status-bar";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import * as Location from 'expo-location';
import HotspotMap from "../components/HotspotMap";
import { getScenarios, analyzeCustomStream, analyzeScenarioStream, Scenario, AgentLog, checkHealth, getActiveCrises, getScenarioCacheStatus } from "../services/api";
import { LinearGradient } from "expo-linear-gradient";
import { collection, addDoc, query, orderBy, onSnapshot, updateDoc, doc, increment, arrayUnion, getDoc } from "firebase/firestore";
import { db, auth } from "../services/firebaseConfig";
import { signOut } from "firebase/auth";

const COLORS = {
  bg: "#181B22",
  surface: "#222731",
  surfaceElevated: "#2E3442",
  primary: "#FFAE00",
  primaryDim: "#FFAE0022",
  danger: "#FF5252",
  warning: "#FF9F0A",
  info: "#0A84FF",
  low: "#30D158",
  textPrimary: "#F8FAFC",
  textSecondary: "#94A3B8",
  border: "#384152aa",
};

const SEVERITY_COLORS: Record<string, string> = {
    CRITICAL: COLORS.danger,
    HIGH: COLORS.warning,
    MEDIUM: COLORS.info,
    LOW: COLORS.low,
};

const OFFLINE_QUEUE_KEY = "ciro_offline_queue";
const LANGUAGE_KEY = "ciro_language";
const MAX_REPORT_CHARS = 2000;
const ESCALATION_MS = 5 * 60 * 1000; // 5 minutes

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

const i18n: Record<string, Record<string, string>> = {
    en: {
        citizenReports: "Citizen Reports",
        citizenReportsDesc: "Incoming emergency signals from the public",
        noPending: "No pending reports.",
        quickScenarios: "Quick Scenarios",
        quickScenariosDesc: "Run pre-built simulations",
        reportIncident: "Report Incident",
        manualOverride: "Manual Override",
        reportIncidentDesc: "Submit raw crisis data to NDMA",
        manualOverrideDesc: "Enter custom parameters to run pipeline",
        crisisReport: "Crisis Report *",
        micPlaceholder: "Tap mic to speak or type...",
        weatherLocation: "Weather Location",
        trafficLocation: "Traffic Location",
        additionalContext: "Additional Context",
        contextPlaceholder: "Optional: source, reporter, photos...",
        attachPhoto: "Attach Photo",
        changePhoto: "Change Photo",
        submitToNdma: "Submit to NDMA",
        submitting: "Submitting...",
        sendSms: "Send SMS Report",
        runPipeline: "Run CIRO Pipeline",
        pipelineRunning: "Pipeline Running...",
        agentsWorking: "Agents Working (Live)",
        transcribing: "Transcribing Audio...",
        offlineMode: "Saved offline — will sync when connection restores",
        cluster: "CLUSTER",
        searchReports: "Search reports...",
        filterAll: "All",
        filterPending: "Pending",
        filterProcessing: "Active",
        filterDispatched: "Done",
        clusterDetails: "Cluster Details",
        runForCluster: "Run Pipeline for Cluster",
        overdue: "OVERDUE",
        detectingLocation: "Detecting...",
    },
    ur: {
        citizenReports: "شهریوں کی رپورٹس",
        citizenReportsDesc: "عوام کی طرف سے آنے والے ایمرجنسی سیگنلز",
        noPending: "کوئی زیر التواء رپورٹ نہیں۔",
        quickScenarios: "فوری منظر نامے",
        quickScenariosDesc: "پہلے سے بنے سمیولیشنز چلائیں",
        reportIncident: "واقعہ کی رپورٹ",
        manualOverride: "دستی اندراج",
        reportIncidentDesc: "این ڈی ایم اے کو بحران کا ڈیٹا بھیجیں",
        manualOverrideDesc: "پائپ لائن چلانے کے لیے پیرامیٹرز درج کریں",
        crisisReport: "بحران رپورٹ *",
        micPlaceholder: "بولنے کے لیے مائک دبائیں یا لکھیں...",
        weatherLocation: "موسم کا مقام",
        trafficLocation: "ٹریفک کا مقام",
        additionalContext: "اضافی معلومات",
        contextPlaceholder: "اختیاری: ذریعہ، رپورٹر، تصاویر...",
        attachPhoto: "تصویر لگائیں",
        changePhoto: "تصویر بدلیں",
        submitToNdma: "این ڈی ایم اے کو بھیجیں",
        submitting: "جمع ہو رہا ہے...",
        sendSms: "ایس ایم ایس رپورٹ بھیجیں",
        runPipeline: "سیرو پائپ لائن چلائیں",
        pipelineRunning: "پائپ لائن چل رہی ہے...",
        agentsWorking: "ایجنٹس کام کر رہے ہیں (لائیو)",
        transcribing: "آڈیو لکھا جا رہا ہے...",
        offlineMode: "آف لائن محفوظ ہوا",
        cluster: "کلسٹر",
        searchReports: "رپورٹس تلاش کریں...",
        filterAll: "سب",
        filterPending: "زیر التواء",
        filterProcessing: "فعال",
        filterDispatched: "مکمل",
        clusterDetails: "کلسٹر تفصیلات",
        runForCluster: "کلسٹر پائپ لائن",
        overdue: "وقت گزرا",
        detectingLocation: "پتہ لگایا جا رہا ہے...",
    },
};

export default function HomeScreen({ navigation, route }: any) {
    const role = route.params?.role || "reporter";
    const [isBackendOnline, setIsBackendOnline] = useState<boolean>(true);
    const prevOnlineRef = useRef(true);

    useEffect(() => {
        const verifyBackendHealth = async () => {
            try {
                await checkHealth();
                if (!prevOnlineRef.current) drainOfflineQueue();
                prevOnlineRef.current = true;
                setIsBackendOnline(true);
            } catch (err) {
                prevOnlineRef.current = false;
                setIsBackendOnline(false);
            }
        };
        verifyBackendHealth();
        const interval = setInterval(verifyBackendHealth, 15000);
        return () => clearInterval(interval);
    }, []);

    const [scenarios, setScenarios] = useState<Scenario[]>([]);
    const [cachedIds, setCachedIds] = useState<Set<string>>(new Set());
    const [citizenReports, setCitizenReports] = useState<any[]>([]);
    const [myReports, setMyReports] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingId, setLoadingId] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    // Multi-Crisis Management state
    const [activeCrises, setActiveCrises] = useState<any[]>([]);
    const [crisesLoading, setCrisesLoading] = useState(true);

    // Search + filter (dispatcher reports tab)
    const [reportSearch, setReportSearch] = useState("");
    const [reportFilter, setReportFilter] = useState<"all" | "pending" | "processing" | "dispatched">("all");

    // Cluster detail drawer
    const [clusterDrawerVisible, setClusterDrawerVisible] = useState(false);
    const [clusterDrawerData, setClusterDrawerData] = useState<{ loc: string; reports: any[] } | null>(null);

    // GPS detecting
    const [detectingGps, setDetectingGps] = useState(false);

    // Stream state
    const [liveLog, setLiveLog] = useState<string>("Initializing pipeline...");
    const abortStreamRef = useRef<(() => void) | null>(null);

    // Custom input
    const [socialText, setSocialText] = useState("");
    const [weatherLoc, setWeatherLoc] = useState("");
    const [trafficLoc, setTrafficLoc] = useState("");
    const [context, setContext] = useState("");
    const [mockWater, setMockWater] = useState<number | null>(null);
    const [mockRain, setMockRain] = useState<number | null>(null);
    const [mockCalls, setMockCalls] = useState<number | null>(null);
    const [mockTemp, setMockTemp] = useState<number | null>(null);
    const [mockAqi, setMockAqi] = useState<number | null>(null);
    const [imageUri, setImageUri] = useState<string | null>(null);
    const [imageBase64, setImageBase64] = useState<string | null>(null);

    // Voice Recording
    const [recording, setRecording] = useState<Audio.Recording | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [cachedReport, setCachedReport] = useState<any>(null);

    const startRecording = async () => {
        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            const { status } = await Audio.requestPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert("Permission Denied", "Please enable microphone permissions in settings to dictate reports.");
                return;
            }
            await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
            const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
            setRecording(recording);
            setIsRecording(true);
        } catch (err) {
            Alert.alert("Error", "Failed to start recording");
        }
    };

    const stopRecording = async () => {
        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setRecording(null);
            setIsRecording(false);
            if (recording) {
                await recording.stopAndUnloadAsync();
                const uri = recording.getURI();
                if (uri) {
                    setLoading(true);
                    setLoadingId("transcribe");
                    const base64Audio = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
                    const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000'}/api/transcribe`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ audio_base64: base64Audio })
                    });
                    const data = await res.json();
                    if (data.text) {
                        setSocialText((prev) => prev + (prev ? " " : "") + data.text);
                    }
                }
            }
        } catch (err) {
            Alert.alert("Error", "Failed to stop recording");
        } finally {
            setLoading(false);
            setLoadingId(null);
        }
    };

    const pickImage = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.5,
            base64: true,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            setImageUri(result.assets[0].uri);
            setImageBase64(result.assets[0].base64 || null);
        }
    };

    const autoDetectLocation = async () => {
        try {
            setDetectingGps(true);
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert("Location Access", "Enable location permission to auto-fill your area.");
                return;
            }

            // On Emulators, location fetching can hang forever. We race with a 5s timeout.
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 5000));
            const posPromise = Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Lowest });
            const pos = await Promise.race([posPromise, timeoutPromise]) as any;

            const results = await Location.reverseGeocodeAsync(pos.coords);
            const geo = results[0];
            const city = geo?.city || geo?.subregion || geo?.region || "Islamabad";
            
            setWeatherLoc(city);
            setTrafficLoc(city);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (err: any) {
            console.warn("Location detection failed, falling back to test location:", err);
            // Fallback for emulator testing
            setWeatherLoc("Islamabad");
            setTrafficLoc("Islamabad");
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } finally {
            setDetectingGps(false);
        }
    };

    const drainOfflineQueue = async () => {
        try {
            const raw = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
            if (!raw) return;
            const queue: any[] = JSON.parse(raw);
            if (!queue.length) return;
            const remaining: any[] = [];
            for (const item of queue) {
                try {
                    await addDoc(collection(db, "reports"), item);
                } catch {
                    remaining.push(item);
                }
            }
            await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(remaining));
            const synced = queue.length - remaining.length;
            if (synced > 0) {
                Alert.alert("Sync Complete", `${synced} offline report${synced > 1 ? "s" : ""} submitted to NDMA.`);
            }
        } catch {
            // silent — will retry next cycle
        }
    };

    // Animations
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const [pushTokenToNotify, setPushTokenToNotify] = useState<string | null>(null);
    const [language, setLanguage] = useState("en");
    const t = (key: string) => (i18n[language] || i18n.en)[key] || key;
    const [activeTab, setActiveTab] = useState<"scenarios" | "reports" | "submit" | "nearby" | "crises">(role === "dispatcher" ? "crises" : "submit");
    const [drawerVisible, setDrawerVisible] = useState(false);
    const drawerAnim = useRef(new Animated.Value(-280)).current;

    const toggleDrawer = (visible: boolean) => {
        if (visible) {
            setDrawerVisible(true);
            Animated.timing(drawerAnim, {
                toValue: 0,
                duration: 250,
                useNativeDriver: true,
            }).start();
        } else {
            Animated.timing(drawerAnim, {
                toValue: -280,
                duration: 250,
                useNativeDriver: true,
            }).start(() => setDrawerVisible(false));
        }
    };

    useEffect(() => {
        // Restore persisted language preference
        AsyncStorage.getItem(LANGUAGE_KEY).then(saved => {
            if (saved && (saved === "en" || saved === "ur")) setLanguage(saved);
        });

        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
            Animated.timing(slideAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
        ]).start();

        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.05, duration: 1500, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
            ])
        ).start();

        loadScenarios();

        // Fetch active crises for dispatcher multi-crisis dashboard (REAL-TIME from Firestore).
        // Merges two collections: `crises` (clean, dispatcher-authored) and `incidents`
        // (pipeline runs). Both are normalized into a single flat shape.
        if (role === "dispatcher") {
            setCrisesLoading(true);

            let crisesDocs: any[] = [];
            let incidentDocs: any[] = [];

            const publish = () => {
                // crisesDocs first so the clean `crises` collection wins over
                // duplicate `incidents` rows for the same logical crisis.
                const merged = [...crisesDocs, ...incidentDocs].map(normalizeCrisis);
                // Dedup by content (type + location), not id — the incidents
                // collection accumulates many rows for the same crisis.
                const byKey = new Map<string, any>();
                const sevRank: Record<string, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
                merged.forEach((c) => {
                    const key = `${c.type}|${(c.location || "").toLowerCase().trim()}`;
                    const existing = byKey.get(key);
                    if (!existing) {
                        byKey.set(key, c);
                    } else if ((sevRank[c.severity] || 0) > (sevRank[existing.severity] || 0)) {
                        // Keep the higher-severity version of a duplicated crisis.
                        byKey.set(key, c);
                    }
                });
                // Newest first.
                const list = Array.from(byKey.values()).sort((a, b) => {
                    const ta = new Date(a.detected_at || 0).getTime() || 0;
                    const tb = new Date(b.detected_at || 0).getTime() || 0;
                    return tb - ta;
                });
                setActiveCrises(list);
                setCrisesLoading(false);
            };

            const unsubCrises = onSnapshot(
                query(collection(db, "crises")),
                (snap) => {
                    crisesDocs = [];
                    snap.forEach((d) => crisesDocs.push({ id: d.id, ...d.data() }));
                    publish();
                },
                (err) => { console.error("crises listener error:", err); setCrisesLoading(false); }
            );

            const unsubIncidents = onSnapshot(
                query(collection(db, "incidents")),
                (snap) => {
                    incidentDocs = [];
                    snap.forEach((d) => incidentDocs.push({ id: d.id, ...d.data() }));
                    publish();
                },
                (err) => { console.error("incidents listener error:", err); setCrisesLoading(false); }
            );

            // Dispatchers also need the citizen-reports feed for the "Citizen Reports" tab.
            const unsubDispatcherReports = onSnapshot(
                query(collection(db, "reports"), orderBy("createdAt", "desc")),
                (snapshot) => {
                    const reps: any[] = [];
                    snapshot.forEach((docSnap) => reps.push({ id: docSnap.id, ...docSnap.data() }));
                    setCitizenReports(reps);
                },
                (err) => console.error("dispatcher reports listener error:", err)
            );

            return () => {
                if (abortStreamRef.current) abortStreamRef.current();
                unsubCrises();
                unsubIncidents();
                unsubDispatcherReports();
            };
        }

        if (__DEV__) {
            AsyncStorage.getItem("dev_cached_report")
                .then((val) => {
                    if (val) setCachedReport(JSON.parse(val));
                })
                .catch((e) => console.log("Cached report read err:", e));
        }

        const q = query(collection(db, "reports"), orderBy("createdAt", "desc"));
        const unsubscribeReports = onSnapshot(q, (snapshot) => {
            const reps: any[] = [];
            snapshot.forEach((docSnap) => {
                reps.push({ id: docSnap.id, ...docSnap.data() });
            });
            setCitizenReports(reps);
            if (auth.currentUser) {
                setMyReports(reps.filter(r => r.reporterId === auth.currentUser!.uid));
            }
        });

        return () => {
            if (abortStreamRef.current) abortStreamRef.current();
            unsubscribeReports();
        };
    }, [role]);

    const toggleLanguage = () => {
        const next = language === 'en' ? 'ur' : 'en';
        setLanguage(next);
        AsyncStorage.setItem(LANGUAGE_KEY, next);
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await loadScenarios();
        // Firestore listener already provides real-time updates, no need to manually refresh
        setRefreshing(false);
    };

    const handleLogout = async () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        try {
            await signOut(auth);
            navigation.reset({ index: 0, routes: [{ name: "Login" }] });
        } catch (e) {
            navigation.reset({ index: 0, routes: [{ name: "Login" }] });
        }
    };

    const handleUpvote = async (reportId: string) => {
        if (!auth.currentUser) return;
        const uid = auth.currentUser.uid;
        try {
            const reportRef = doc(db, "reports", reportId);
            const reportSnap = await getDoc(reportRef);
            if (reportSnap.exists()) {
                const data = reportSnap.data();
                if ((data.votedBy || []).includes(uid)) {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                    Alert.alert("Already Verified", "You have already upvoted/confirmed this incident.");
                    return;
                }
            }
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            await updateDoc(reportRef, { upvotes: increment(1), votedBy: arrayUnion(uid) });
        } catch (e) {
            console.error("Error upvoting report", e);
        }
    };

    const loadScenarios = async () => {
        try {
            const data = await getScenarios();
            setScenarios(data);
            try {
                const status = await getScenarioCacheStatus();
                setCachedIds(new Set(status.cached_scenarios));
            } catch { /* ignore cache err */ }
        } catch {
            setScenarios([
                { id: "dual-flood-heat", title: "⚡ DUAL CRISIS — Flood + Heat", description: "Two simultaneous crises, shared resources", icon: "⚡", severity_hint: "CRITICAL" },
                { id: "false-alarm-watermain", title: "🔄 FALSE ALARM — Water Main", description: "Social media says flood, field says water main", icon: "🔄", severity_hint: "HIGH" },
                { id: "flood-g10", title: "Flash Flood — G-10", description: "Islamabad waterlogging", icon: "🌊", severity_hint: "CRITICAL" },
                { id: "flood-george-town", title: "Flash Flood — George Town", description: "Karachi nullah overflow", icon: "🌊", severity_hint: "HIGH" },
                { id: "heatwave-karachi", title: "Heat Emergency — Karachi", description: "43°C heatstroke cases", icon: "🔥", severity_hint: "HIGH" },
                { id: "accident-gulberg", title: "Accident — Gulberg", description: "Multi-vehicle collision Lahore", icon: "🚗", severity_hint: "MEDIUM" },
            ]);
        }
    };

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

    const handleStreamDone = async (report: any) => {
        setLoading(false);
        setLoadingId(null);
        abortStreamRef.current = null;

        const loc = report.input?.traffic_location || report.input?.weather_location || "";
        if (loc && role === "dispatcher") {
            try {
                const processingReports = citizenReports.filter(
                    r => r.status === "processing" &&
                        (r.traffic_location || "").toLowerCase().trim() === loc.toLowerCase().trim()
                );
                for (const r of processingReports) {
                    await updateDoc(doc(db, "reports", r.id), {
                        status: "dispatched",
                        pipelineResult: JSON.stringify(report)
                    });
                }
            } catch (e) {
                console.log("Status update error:", e);
            }
        }

        if (__DEV__) {
            setCachedReport(report);
            AsyncStorage.setItem("dev_cached_report", JSON.stringify(report)).catch(() => {});
        }

        navigation.navigate("Result", { report });
    };

    const handleStreamError = (error: string) => {
        setLoading(false);
        setLoadingId(null);
        abortStreamRef.current = null;
        Alert.alert("Pipeline Error", error);
    };

    const handleScenario = (id: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setLoading(true);
        setLoadingId(id);
        setLiveLog("Connecting to pipeline...");
        const abort = analyzeScenarioStream(id, handleStreamLog, handleStreamDone, handleStreamError);
        abortStreamRef.current = abort;
    };

    const handleCustom = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        if (!socialText.trim()) {
            Alert.alert("Required", "Please enter a crisis report text");
            return;
        }
        setLoading(true);
        setLoadingId("custom");
        setLiveLog("Connecting to pipeline...");
        const req = {
            social_media_text: socialText,
            weather_location: weatherLoc || "Islamabad",
            traffic_location: trafficLoc || socialText.split(" ")[0],
            additional_context: context || undefined,
            image_base64: imageBase64 || undefined,
            pushToken: pushTokenToNotify || undefined,
            language: language,
            sensor_overrides: {
                water_level: mockWater !== null ? mockWater : undefined,
                rainfall: mockRain !== null ? mockRain : undefined,
                emergency_calls: mockCalls !== null ? mockCalls : undefined,
                temperature: mockTemp !== null ? mockTemp : undefined,
                aqi: mockAqi !== null ? mockAqi : undefined,
            }
        };
        setPushTokenToNotify(null);
        const abort = analyzeCustomStream(req, handleStreamLog, handleStreamDone, handleStreamError);
        abortStreamRef.current = abort;
    };

    const handleSubmitReport = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        if (!socialText.trim()) {
            Alert.alert("Required", "Please enter a crisis report text");
            return;
        }

        // Duplicate prevention: same location + same user within 30 minutes
        const loc = trafficLoc.trim().toLowerCase();
        if (loc && auth.currentUser) {
            const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
            const duplicate = myReports.find(r =>
                (r.traffic_location || "").toLowerCase() === loc &&
                r.createdAt > thirtyMinAgo
            );
            if (duplicate) {
                const minsAgo = Math.round((Date.now() - new Date(duplicate.createdAt).getTime()) / 60000);
                const proceed = await new Promise<boolean>(resolve =>
                    Alert.alert(
                        "Duplicate Report?",
                        `You already submitted a report for ${trafficLoc} ${minsAgo} min ago. Submit again?`,
                        [
                            { text: "Cancel", onPress: () => resolve(false), style: "cancel" },
                            { text: "Submit Anyway", onPress: () => resolve(true) }
                        ]
                    )
                );
                if (!proceed) return;
            }
        }

        setLoading(true);
        setLoadingId("submit");

        const reportData: any = {
            social_media_text: socialText,
            weather_location: weatherLoc || "Islamabad",
            traffic_location: trafficLoc || socialText.split(" ")[0],
            additional_context: context || "",
            image_base64: imageBase64 || null,
            createdAt: new Date().toISOString(),
            status: "pending",
            upvotes: 0,
            pushToken: null,
            reporterId: auth.currentUser?.uid || "anonymous"
        };

        try {
            if (Device.isDevice) {
                try {
                    const { status } = await Notifications.getPermissionsAsync();
                    if (status === 'granted') {
                        const tok = await Notifications.getExpoPushTokenAsync({ projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID || "portfolio-website-cd2c6" });
                        reportData.pushToken = tok.data;
                    }
                } catch (pushErr) {
                    console.log("Push token generation failed:", pushErr);
                }
            }

            await addDoc(collection(db, "reports"), reportData);
            Alert.alert("Success", "Your report has been submitted to NDMA.");
            setSocialText(""); setWeatherLoc(""); setTrafficLoc(""); setContext(""); setImageUri(null); setImageBase64(null);
        } catch (e: any) {
            // Firestore add failed — queue for offline sync
            try {
                const raw = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
                const queue: any[] = JSON.parse(raw || "[]");
                queue.push(reportData);
                await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
                Alert.alert("Saved Offline", t("offlineMode"));
                setSocialText(""); setWeatherLoc(""); setTrafficLoc(""); setContext(""); setImageUri(null); setImageBase64(null);
            } catch {
                Alert.alert("Error", e.message);
            }
        } finally {
            setLoading(false);
            setLoadingId(null);
        }
    };

    const runClusterPipeline = async (clusterReports: any[]) => {
        setClusterDrawerVisible(false);
        const primary = clusterReports[0];
        const dupeCount = clusterReports.length;
        for (const r of clusterReports) {
            try { await updateDoc(doc(db, "reports", r.id), { status: "processing" }); } catch { }
        }
        setSocialText(primary.social_media_text);
        setWeatherLoc(primary.weather_location);
        setTrafficLoc(primary.traffic_location);
        setContext(primary.additional_context + (dupeCount > 1 ? ` [CLUSTERED: ${dupeCount} matching reports]` : ""));
        if (primary.pushToken) setPushTokenToNotify(primary.pushToken);
        setActiveTab("submit");
        // short delay so tab switch is visible, then run
        setTimeout(() => handleCustom(), 150);
    };

    const isClusterOverdue = (reports: any[]) => {
        const pending = reports.filter(r => r.status === "pending");
        if (!pending.length) return false;
        const oldest = Math.min(...pending.map(r => new Date(r.createdAt).getTime()));
        return Date.now() - oldest > ESCALATION_MS;
    };

    // Filtered reports for dispatcher tab
    const filteredReports = citizenReports.filter(r => {
        const matchesSearch = !reportSearch ||
            (r.social_media_text || "").toLowerCase().includes(reportSearch.toLowerCase()) ||
            (r.traffic_location || "").toLowerCase().includes(reportSearch.toLowerCase());
        const matchesFilter = reportFilter === "all" || r.status === reportFilter;
        return matchesSearch && matchesFilter;
    });

    const CRISIS_TYPE_EMOJI: Record<string, string> = {
        flood: "🌊", heat: "🔥", fire: "🔥", accident: "🚗", earthquake: "🏚️",
        storm: "⛈️", landslide: "🏔️", epidemic: "🦠", power: "⚡", default: "⚠️",
    };

    // Collapses the many raw type strings the backend/seed emit into the
    // canonical keys CRISIS_TYPE_EMOJI and SEVERITY_COLORS understand.
    const canonicalType = (raw?: string): string => {
        const t = (raw || "").toLowerCase();
        if (t.includes("flood") || t.includes("nullah") || t.includes("water")) return "flood";
        if (t.includes("heat")) return "heat";
        if (t.includes("fire")) return "fire";
        if (t.includes("accident") || t.includes("collision") || t.includes("crash")) return "accident";
        if (t.includes("earthquake") || t.includes("seismic") || t.includes("quake")) return "earthquake";
        if (t.includes("landslide") || t.includes("avalanche")) return "landslide";
        if (t.includes("storm") || t.includes("cyclone")) return "storm";
        if (t.includes("epidemic") || t.includes("disease") || t.includes("outbreak")) return "epidemic";
        if (t.includes("power") || t.includes("infrastructure") || t.includes("outage")) return "power";
        return "default";
    };

    const getTimeSince = (dateStr?: string) => {
        if (!dateStr) return "Recently";
        const t = new Date(dateStr).getTime();
        if (isNaN(t)) return "Recently";
        const mins = Math.floor((Date.now() - t) / 60000);
        if (mins < 0) return "Just now";
        if (mins < 1) return "Just now";
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        return `${Math.floor(hrs / 24)}d ago`;
    };

    const TYPE_TITLES: Record<string, string> = {
        flood: "Flash Flood", heat: "Heat Emergency", fire: "Fire Emergency",
        accident: "Traffic Accident", earthquake: "Seismic Activity",
        landslide: "Landslide", storm: "Severe Storm", epidemic: "Disease Cluster",
        power: "Infrastructure Failure", default: "Incident",
    };

    // Normalizes a Firestore doc (clean `crises` shape OR nested `incidents`
    // pipeline shape) into the flat structure the dispatcher card expects.
    // `type` is always a canonical key.
    const normalizeCrisis = (doc: any): any => {
        // Already-clean shape from the `crises` collection.
        if (doc.title && doc.severity && doc.location) {
            const ct = canonicalType(doc.type || doc.title);
            return {
                ...doc,
                type: ct,
                detected_at: doc.detected_at || doc.createdAt || doc.timestamp,
            };
        }
        // Nested pipeline shape from the `incidents` collection.
        const input = doc.input || {};
        const outputs = doc.agent_outputs || {};
        let rawType = "";
        let confidence = 0;
        let urgency: string | undefined;
        try {
            const sig = JSON.parse(outputs.ingested_signals || "{}");
            if (sig.crisis_type) rawType = sig.crisis_type;
            if (typeof sig.confidence === "number") confidence = sig.confidence;
            if (sig.urgency) urgency = sig.urgency;
        } catch { /* keep defaults */ }

        const location = input.weather_location || input.traffic_location || "Unknown Location";
        const type = canonicalType(rawType || input.social_media_text || location);

        const assessment = (outputs.crisis_assessment || "").toUpperCase();
        let severity = "MEDIUM";
        if (assessment.includes("CRITICAL")) severity = "CRITICAL";
        else if (assessment.includes("HIGH")) severity = "HIGH";
        else if (assessment.includes("LOW")) severity = "LOW";

        return {
            id: doc.id,
            type,
            title: `${TYPE_TITLES[type] || "Incident"} — ${location}`,
            location,
            severity,
            urgency,
            confidence,
            status: "active",
            detected_at: doc.createdAt || doc.timestamp || doc.detected_at,
            description: input.social_media_text || outputs.situation_report || "",
            affected_population: doc.affected_population,
            agent_outputs: outputs,
        };
    };

    const TAB_CONFIG = role === "dispatcher"
        ? [
            { key: "crises" as const, label: "Crises", icon: "warning" },
            { key: "scenarios" as const, label: t("quickScenarios"), icon: "flash" },
            { key: "reports" as const, label: t("citizenReports"), icon: "people" },
            { key: "submit" as const, label: t("manualOverride"), icon: "create" },
        ]
        : [
            { key: "submit" as const, label: t("reportIncident"), icon: "create" },
            { key: "reports" as const, label: "My Reports", icon: "time" },
            { key: "nearby" as const, label: "Nearby", icon: "map" },
        ];

    const renderStepper = (label: string, value: number | null, setValue: (v: number | null) => void, unit: string, step: number, min: number, max: number) => (
        <View style={styles.stepperContainer}>
            <Text style={styles.inputLabel}>{label}</Text>
            <View style={styles.stepperControls}>
                <TouchableOpacity onPress={() => setValue(value === null ? min : Math.max(min, value - step))} style={styles.stepperBtn}>
                    <Ionicons name="remove" size={16} color={COLORS.bg} />
                </TouchableOpacity>
                <Text style={styles.stepperValue}>{value === null ? "Auto" : `${value}${unit}`}</Text>
                <TouchableOpacity onPress={() => setValue(value === null ? min + step : Math.min(max, value + step))} style={styles.stepperBtn}>
                    <Ionicons name="add" size={16} color={COLORS.bg} />
                </TouchableOpacity>
                {value !== null && (
                    <TouchableOpacity onPress={() => setValue(null)} style={styles.stepperReset}>
                        <Ionicons name="refresh" size={18} color={COLORS.textSecondary} />
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <StatusBar style="light" backgroundColor="transparent" translucent={true} />

            {/* Drawer Sidebar Menu */}
            {drawerVisible && (
                <View style={[StyleSheet.absoluteFill, { zIndex: 9999, flexDirection: "row" }]}>
                    <Animated.View style={{
                        width: 280,
                        height: "100%",
                        backgroundColor: COLORS.surface,
                        borderRightWidth: 1,
                        borderRightColor: COLORS.border,
                        paddingTop: 50,
                        paddingHorizontal: 16,
                        transform: [{ translateX: drawerAnim }],
                        shadowColor: "#000",
                        shadowOffset: { width: 4, height: 0 },
                        shadowOpacity: 0.3,
                        shadowRadius: 10,
                        elevation: 16,
                        flexDirection: "column"
                    }}>
                        {/* Header */}
                        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                                <Ionicons name="shield-checkmark" size={24} color={COLORS.primary} />
                                <Text style={{ fontSize: 18, fontWeight: "900", color: COLORS.primary, letterSpacing: 1.5 }}>CIRO</Text>
                            </View>
                            <TouchableOpacity onPress={() => toggleDrawer(false)} style={{ padding: 4 }}>
                                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        {/* User Profile Card */}
                        <View style={{ backgroundColor: COLORS.surfaceElevated, padding: 14, borderRadius: 12, marginBottom: 24, borderWidth: 1, borderColor: COLORS.border }}>
                            <Text style={{ color: COLORS.textPrimary, fontWeight: "700", fontSize: 12 }} numberOfLines={1}>
                                {auth.currentUser?.email || "admin@ndma.gov.pk"}
                            </Text>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 }}>
                                <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: COLORS.primary }} />
                                <Text style={{ color: COLORS.primary, fontSize: 11, fontWeight: "700", letterSpacing: 0.5 }}>{role.toUpperCase()}</Text>
                            </View>
                        </View>

                        {/* Scrollable Navigation Items */}
                        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                            {/* Monitoring & Analytics */}
                            <Text style={{ color: COLORS.textSecondary, fontSize: 10, fontWeight: "800", letterSpacing: 0.8, marginBottom: 10, marginLeft: 4, textTransform: "uppercase" }}>Monitoring</Text>
                            {[
                                ...(role === "dispatcher" ? [{ icon: "pie-chart-outline", label: "System Analytics", nav: "Analytics" }] : []),
                                { icon: "map-outline", label: "Interactive Map", nav: "Map" },
                                { icon: "megaphone-outline", label: "Public Bulletin", nav: "PublicDashboard" }
                            ].map((item) => (
                                <TouchableOpacity
                                    key={item.nav}
                                    style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 11, paddingHorizontal: 12, marginBottom: 4, borderRadius: 10 }}
                                    onPress={() => {
                                        toggleDrawer(false);
                                        navigation.navigate(item.nav as any);
                                    }}
                                >
                                    <Ionicons name={item.icon as any} size={18} color={COLORS.textSecondary} />
                                    <Text style={{ color: COLORS.textPrimary, fontWeight: "500", fontSize: 13, flex: 1 }}>{item.label}</Text>
                                    <Ionicons name="chevron-forward" size={14} color={COLORS.textSecondary + "66"} />
                                </TouchableOpacity>
                            ))}

                            <View style={{ height: 12 }} />
                            <View style={{ height: 1, backgroundColor: COLORS.border, marginBottom: 14 }} />

                            {role === "dispatcher" && (
                                <>
                                    {/* Response & Decision */}
                                    <Text style={{ color: COLORS.textSecondary, fontSize: 10, fontWeight: "800", letterSpacing: 0.8, marginBottom: 10, marginLeft: 4, textTransform: "uppercase" }}>Response</Text>
                                    {[
                                        { icon: "git-compare-outline", label: "Agent vs Rules", nav: "Comparison" },
                                        { icon: "cube-outline", label: "Resource Pool", nav: "Resources" },
                                        { icon: "analytics-outline", label: "Impact Analysis", nav: "Impact" },
                                        { icon: "chatbubbles-outline", label: "Stakeholder Comms", nav: "Comms" },
                                        { icon: "list-outline", label: "Action Plan", nav: "ActionPlan" },
                                        { icon: "flash-outline", label: "Test Mode", nav: "TestMode" }
                                    ].map((item) => (
                                        <TouchableOpacity
                                            key={item.nav}
                                            style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 11, paddingHorizontal: 12, marginBottom: 4, borderRadius: 10 }}
                                            onPress={() => {
                                                toggleDrawer(false);
                                                navigation.navigate(item.nav as any, { role });
                                            }}
                                        >
                                            <Ionicons name={item.icon as any} size={18} color={COLORS.textSecondary} />
                                            <Text style={{ color: COLORS.textPrimary, fontWeight: "500", fontSize: 13, flex: 1 }}>{item.label}</Text>
                                            <Ionicons name="chevron-forward" size={14} color={COLORS.textSecondary + "66"} />
                                        </TouchableOpacity>
                                    ))}

                                    <View style={{ height: 12 }} />
                                    <View style={{ height: 1, backgroundColor: COLORS.border, marginBottom: 14 }} />
                                </>
                            )}

                            {/* Settings */}
                            <Text style={{ color: COLORS.textSecondary, fontSize: 10, fontWeight: "800", letterSpacing: 0.8, marginBottom: 10, marginLeft: 4, textTransform: "uppercase" }}>Settings</Text>
                            <TouchableOpacity
                                style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 11, paddingHorizontal: 12, marginBottom: 4, borderRadius: 10 }}
                                onPress={() => {
                                    toggleDrawer(false);
                                    navigation.navigate("Settings", { role });
                                }}
                            >
                                <Ionicons name="settings-outline" size={18} color={COLORS.textSecondary} />
                                <Text style={{ color: COLORS.textPrimary, fontWeight: "500", fontSize: 13, flex: 1 }}>App Settings</Text>
                                <Ionicons name="chevron-forward" size={14} color={COLORS.textSecondary + "66"} />
                            </TouchableOpacity>
                        </ScrollView>

                        {/* Bottom Status / Logout */}
                        <View style={{ marginTop: 16, marginBottom: 24, gap: 12, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 12 }}>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: isBackendOnline ? COLORS.low : COLORS.danger }} />
                                <Text style={{ color: COLORS.textSecondary, fontSize: 11, fontWeight: "500" }}>Backend: <Text style={{ color: isBackendOnline ? COLORS.low : COLORS.danger, fontWeight: "700" }}>{isBackendOnline ? "Online" : "Offline"}</Text></Text>
                            </View>
                            <TouchableOpacity
                                style={{
                                    flexDirection: "row",
                                    alignItems: "center",
                                    gap: 12,
                                    paddingVertical: 11,
                                    paddingHorizontal: 12,
                                    borderRadius: 10,
                                    backgroundColor: COLORS.danger + "12",
                                    borderWidth: 1,
                                    borderColor: COLORS.danger + "22"
                                }}
                                onPress={() => {
                                    toggleDrawer(false);
                                    handleLogout();
                                }}
                            >
                                <Ionicons name="log-out-outline" size={18} color={COLORS.danger} />
                                <Text style={{ color: COLORS.danger, fontWeight: "700", fontSize: 13 }}>Log Out</Text>
                            </TouchableOpacity>
                        </View>
                    </Animated.View>

                    {/* Touch outside to close with fade backdrop */}
                    <Animated.View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)" }} onTouchEnd={() => toggleDrawer(false)}>
                        <TouchableOpacity
                            activeOpacity={1}
                            style={{ flex: 1 }}
                            onPress={() => toggleDrawer(false)}
                        />
                    </Animated.View>
                </View>
            )}

            {/* Fixed Header */}
            <View style={styles.fixedHeader}>
                {/* Header Top Row: Menu, Brand Title, Action Buttons */}
                <View style={styles.headerTopRow}>
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                        <TouchableOpacity onPress={() => toggleDrawer(true)} style={{ padding: 6, marginRight: 6 }}>
                            <Ionicons name="menu-outline" size={24} color={COLORS.primary} />
                        </TouchableOpacity>
                        <View style={{ flexDirection: "row", alignItems: "center" }}>
                            <Ionicons name="shield-checkmark" size={18} color={COLORS.primary} style={{ marginRight: 4 }} />
                            <Text style={{ fontSize: 18, fontWeight: "900", color: COLORS.primary, letterSpacing: 2 }}>CIRO</Text>
                        </View>
                    </View>

                    <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
                        <TouchableOpacity
                            style={{ backgroundColor: COLORS.surfaceElevated, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: language === 'ur' ? COLORS.primary : COLORS.border }}
                            onPress={toggleLanguage}
                        >
                            <Text style={{ color: language === 'ur' ? COLORS.primary : COLORS.textSecondary, fontWeight: 'bold', fontSize: 11 }}>{language === 'en' ? 'EN' : 'UR'}</Text>
                        </TouchableOpacity>
                        {__DEV__ && cachedReport && (
                            <TouchableOpacity
                                style={{ backgroundColor: COLORS.surfaceElevated, padding: 6, borderRadius: 8, borderWidth: 1, borderColor: COLORS.primary }}
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                    navigation.navigate("Result", { report: cachedReport });
                                }}
                            >
                                <Ionicons name="flash" size={16} color={COLORS.primary} />
                            </TouchableOpacity>
                        )}
                        {role === "dispatcher" && (
                            <TouchableOpacity
                                style={{ backgroundColor: COLORS.surfaceElevated, padding: 6, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border }}
                                onPress={() => navigation.navigate("Analytics")}
                            >
                                <Ionicons name="pie-chart" size={16} color={COLORS.primary} />
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity
                            style={{ backgroundColor: COLORS.surfaceElevated, padding: 6, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border }}
                            onPress={() => navigation.navigate("Settings", { role })}
                        >
                            <Ionicons name="settings-outline" size={16} color={COLORS.textSecondary} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleLogout} style={{ padding: 6, borderRadius: 8, backgroundColor: COLORS.danger + '11', borderWidth: 1, borderColor: COLORS.danger + '22' }}>
                            <Ionicons name="log-out-outline" size={16} color={COLORS.danger} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Header Status Row: Badges stacked below top row */}
                <View style={styles.headerStatusRow}>
                    <View style={[styles.badge, { backgroundColor: role === "dispatcher" ? COLORS.warning + "22" : COLORS.primaryDim, borderColor: role === "dispatcher" ? COLORS.warning + "66" : COLORS.primary + "44" }]}>
                        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: role === "dispatcher" ? COLORS.warning : COLORS.primary, marginRight: 6 }} />
                        <Text style={[styles.badgeText, { color: role === "dispatcher" ? COLORS.warning : COLORS.primary }]}>{role.toUpperCase()}</Text>
                    </View>

                    <View style={[styles.badge, {
                        backgroundColor: isBackendOnline ? COLORS.low + "18" : COLORS.danger + "18",
                        borderColor: isBackendOnline ? COLORS.low + "55" : COLORS.danger + "55"
                    }]}>
                        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: isBackendOnline ? COLORS.low : COLORS.danger, marginRight: 6 }} />
                        <Text style={[styles.badgeText, { color: isBackendOnline ? COLORS.low : COLORS.danger, fontSize: 9 }]}>
                            {isBackendOnline ? "ONLINE" : "OFFLINE"}
                        </Text>
                    </View>
                </View>

                {/* Premium Pill-Style Scrollable Tab Bar */}
                <View style={styles.tabBarContainer}>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.tabBarScrollContent}
                    >
                        {TAB_CONFIG.map((tab) => {
                            const isActive = activeTab === tab.key;
                            return (
                                <TouchableOpacity
                                    key={tab.key}
                                    style={[styles.tabChip, isActive && styles.tabChipActive]}
                                    onPress={() => setActiveTab(tab.key)}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons 
                                        name={tab.icon as any} 
                                        size={14} 
                                        color={isActive ? COLORS.bg : COLORS.textSecondary} 
                                    />
                                    <Text style={[styles.tabChipText, isActive && styles.tabChipTextActive]}>
                                        {tab.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>
            </View>

            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} colors={[COLORS.primary]} />}
            >
                {/* ===== CRISES TAB (Multi-Crisis Dashboard) ===== */}
                {activeTab === "crises" && (
                    <Animated.View style={{ opacity: fadeAnim }}>
                        <Text style={styles.sectionTitle}>
                            <Ionicons name="warning" size={18} color={COLORS.danger} /> Active Crises
                        </Text>
                        <Text style={styles.sectionDesc}>Real-time multi-crisis monitoring dashboard • Auto-refreshes every 5s</Text>

                        {/* Live indicator */}
                        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 14, gap: 8 }}>
                            <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: COLORS.danger + "15", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: COLORS.danger + "33" }}>
                                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.danger, marginRight: 6 }} />
                                <Text style={{ color: COLORS.danger, fontSize: 9, fontWeight: "800", letterSpacing: 1 }}>LIVE MONITORING</Text>
                            </View>
                            <Text style={{ color: COLORS.textSecondary, fontSize: 11 }}>{activeCrises.length} active crisis{activeCrises.length !== 1 ? "es" : ""}</Text>
                        </View>

                        {/* Impact Prediction & Warning Dashboard Tiles - 2x2 Grid */}
                        <View style={{ gap: 10, marginBottom: 16 }}>
                            {/* Row 1 */}
                            <View style={{ flexDirection: "row", gap: 10 }}>
                                <View style={{ flex: 1, backgroundColor: COLORS.danger + "11", borderColor: COLORS.danger + "33", borderWidth: 1, borderRadius: 12, padding: 12 }}>
                                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                                        <Ionicons name="alert-circle-outline" size={20} color={COLORS.danger} />
                                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.danger }} />
                                    </View>
                                    <Text style={{ color: COLORS.textPrimary, fontSize: 18, fontWeight: "900", marginTop: 8 }}>
                                        {activeCrises.filter((c: any) => c.severity === 'CRITICAL' || c.severity === 'HIGH').length}
                                        <Text style={{ fontSize: 11, fontWeight: "500" }}> Sectors</Text>
                                    </Text>
                                    <Text style={{ color: COLORS.textSecondary, fontSize: 10, marginTop: 2 }}>High Threat warning</Text>
                                </View>

                                <View style={{ flex: 1, backgroundColor: COLORS.primary + "11", borderColor: COLORS.primary + "33", borderWidth: 1, borderRadius: 12, padding: 12 }}>
                                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                                        <Ionicons name="people-outline" size={20} color={COLORS.primary} />
                                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary }} />
                                    </View>
                                    <Text style={{ color: COLORS.textPrimary, fontSize: 16, fontWeight: "900", marginTop: 8 }} numberOfLines={1}>
                                        {activeCrises.reduce((sum: number, c: any) => sum + (c.affected_population || 0), 0).toLocaleString()}
                                    </Text>
                                    <Text style={{ color: COLORS.textSecondary, fontSize: 10, marginTop: 2 }}>Projected Impact</Text>
                                </View>
                            </View>

                            {/* Row 2 */}
                            <View style={{ flexDirection: "row", gap: 10 }}>
                                <View style={{ flex: 1, backgroundColor: COLORS.warning + "11", borderColor: COLORS.warning + "33", borderWidth: 1, borderRadius: 12, padding: 12 }}>
                                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                                        <Ionicons name="trending-up-outline" size={20} color={COLORS.warning} />
                                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.warning }} />
                                    </View>
                                    <Text style={{ color: COLORS.textPrimary, fontSize: 18, fontWeight: "900", marginTop: 8 }}>
                                        PKR {activeCrises.length ? (activeCrises.length * 15) : 0}M
                                    </Text>
                                    <Text style={{ color: COLORS.textSecondary, fontSize: 10, marginTop: 2 }}>Infrastructure loss</Text>
                                </View>

                                <View style={{ flex: 1, backgroundColor: COLORS.low + "11", borderColor: COLORS.low + "33", borderWidth: 1, borderRadius: 12, padding: 12 }}>
                                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                                        <Ionicons name="leaf-outline" size={20} color={COLORS.low} />
                                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.low }} />
                                    </View>
                                    <Text style={{ color: COLORS.textPrimary, fontSize: 18, fontWeight: "900", marginTop: 8 }}>
                                        {activeCrises.length ? "Severe" : "Low"}
                                    </Text>
                                    <Text style={{ color: COLORS.textSecondary, fontSize: 10, marginTop: 2 }}>Cascading Risks</Text>
                                </View>
                            </View>
                        </View>

                        {crisesLoading ? (
                            <View style={[styles.emptyState, { minHeight: 200 }]}>
                                <ActivityIndicator size="large" color={COLORS.primary} />
                                <Text style={[styles.emptyText, { marginTop: 16 }]}>Loading active crises...</Text>
                            </View>
                        ) : activeCrises.length === 0 ? (
                            <View style={styles.emptyState}>
                                <Ionicons name="shield-checkmark-outline" size={48} color={COLORS.low + "33"} />
                                <Text style={styles.emptyText}>No active crises detected. All clear! ✅</Text>
                            </View>
                        ) : (
                            activeCrises.map((crisis: any) => {
                                const sevColor = SEVERITY_COLORS[crisis.severity] || COLORS.info;
                                const emoji = CRISIS_TYPE_EMOJI[crisis.type] || CRISIS_TYPE_EMOJI.default;
                                return (
                                    <TouchableOpacity
                                        key={crisis.id}
                                        style={[
                                            styles.scenarioCard,
                                            { borderLeftWidth: 3, borderLeftColor: sevColor }
                                        ]}
                                        onPress={() => {
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                            // Navigate to ResultScreen with crisis data wrapped as a report
                                            const crisisReport = {
                                                status: "active",
                                                input: {
                                                    social_media_text: crisis.title || crisis.description || "",
                                                    weather_location: crisis.location || "",
                                                    traffic_location: crisis.location || "",
                                                },
                                                agent_outputs: {
                                                    crisis_assessment: `Severity: ${crisis.severity}\nType: ${crisis.type}\nLocation: ${crisis.location}`,
                                                    situation_report: crisis.description || `Active ${crisis.type} crisis at ${crisis.location}. Severity: ${crisis.severity}. Affected population: ${crisis.affected_population || "Unknown"}.`,
                                                    action_plan: crisis.action_plan || "Awaiting pipeline analysis...",
                                                    simulation_results: crisis.simulation_results || "",
                                                    ingested_signals: "",
                                                },
                                                metadata: {
                                                    session_id: crisis.id,
                                                    timestamp: crisis.detected_at,
                                                    model: "gemini-2.0-flash",
                                                    agents_count: 8,
                                                },
                                                pipeline_duration_seconds: 0,
                                                final_response: crisis.description || "",
                                                agent_logs: [],
                                                crisis: crisis,
                                            };
                                            navigation.navigate("Result", { report: crisisReport });
                                        }}
                                        activeOpacity={0.7}
                                    >
                                        <View style={styles.scenarioTop}>
                                            <Text style={[styles.scenarioIcon, { fontSize: 30 }]}>{emoji}</Text>
                                            <View style={[styles.scenarioInfo, { marginRight: 8 }]}>
                                                <Text style={styles.scenarioTitle} numberOfLines={1}>{crisis.title}</Text>
                                                <View style={{ flexDirection: "row", alignItems: "center", marginTop: 3, gap: 6 }}>
                                                    <Ionicons name="location-outline" size={11} color={COLORS.textSecondary} />
                                                    <Text style={[styles.scenarioDesc, { marginTop: 0 }]}>{crisis.location}</Text>
                                                </View>
                                                <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4, gap: 10 }}>
                                                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                                                        <Ionicons name="time-outline" size={10} color={COLORS.textSecondary} />
                                                        <Text style={{ fontSize: 10, color: COLORS.textSecondary }}>{getTimeSince(crisis.detected_at)}</Text>
                                                    </View>
                                                    {crisis.affected_population && (
                                                        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                                                            <Ionicons name="people-outline" size={10} color={COLORS.textSecondary} />
                                                            <Text style={{ fontSize: 10, color: COLORS.textSecondary }}>{crisis.affected_population.toLocaleString()} affected</Text>
                                                        </View>
                                                    )}
                                                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                                                        <Ionicons name="flame" size={10} color={COLORS.danger} />
                                                        <Text style={{ fontSize: 10, color: COLORS.danger, fontWeight: "bold" }}>
                                                            {crisis.urgency || (crisis.severity === "CRITICAL" ? "IMMEDIATE" : crisis.severity === "HIGH" ? "HIGH" : "MEDIUM")}
                                                        </Text>
                                                    </View>
                                                </View>
                                            </View>
                                            <View style={{ alignItems: "flex-end", gap: 4 }}>
                                                <View style={[styles.severityBadge, { backgroundColor: sevColor + "22", borderColor: sevColor }]}>
                                                    <Text style={[styles.severityText, { color: sevColor }]}>{crisis.severity}</Text>
                                                </View>
                                                <Ionicons name="chevron-forward" size={16} color={COLORS.primary} />
                                            </View>
                                        </View>
                                    </TouchableOpacity>
                                );
                            })
                        )}
                    </Animated.View>
                )}

                {/* ===== SCENARIOS TAB ===== */}
                {activeTab === "scenarios" && (
                    <Animated.View style={{ opacity: fadeAnim }}>
                        <Text style={styles.sectionTitle}>
                            <Ionicons name="flash" size={18} color={COLORS.warning} /> {t("quickScenarios")}
                        </Text>
                        <Text style={styles.sectionDesc}>{t("quickScenariosDesc")}</Text>

                        {scenarios.map((s) => (
                            <TouchableOpacity
                                key={s.id}
                                style={[styles.scenarioCard, loading && loadingId === s.id && styles.scenarioCardActive]}
                                onPress={() => handleScenario(s.id)}
                                disabled={loading}
                                activeOpacity={0.7}
                            >
                                <View style={styles.scenarioTop}>
                                    <Text style={styles.scenarioIcon}>{s.icon}</Text>
                                    <View style={styles.scenarioInfo}>
                                        <Text style={styles.scenarioTitle}>{s.title}</Text>
                                        <Text style={styles.scenarioDesc}>{s.description}</Text>
                                    </View>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <View style={[styles.severityBadge, { backgroundColor: SEVERITY_COLORS[s.severity_hint] + "22", borderColor: SEVERITY_COLORS[s.severity_hint] }]}>
                                            <Text style={[styles.severityText, { color: SEVERITY_COLORS[s.severity_hint] }]}>{s.severity_hint}</Text>
                                        </View>
                                        {cachedIds.has(s.id) && (
                                            <View style={[styles.severityBadge, { backgroundColor: COLORS.low + "22", borderColor: COLORS.low, marginLeft: 6 }]}>
                                                <Text style={[styles.severityText, { color: COLORS.low }]}>⚡ Pre-warmed</Text>
                                            </View>
                                        )}
                                    </View>
                                </View>
                                {loading && loadingId === s.id && (
                                    <View style={styles.loadingBar}>
                                        <ActivityIndicator size="small" color={COLORS.primary} />
                                        <View style={{ flex: 1, marginLeft: 8 }}>
                                            <Text style={styles.loadingText}>{t("agentsWorking")}</Text>
                                            <Text style={styles.liveLogText}>{liveLog}</Text>
                                        </View>
                                    </View>
                                )}
                            </TouchableOpacity>
                        ))}
                    </Animated.View>
                )}

                {/* ===== REPORTS TAB ===== */}
                {activeTab === "reports" && (
                    <Animated.View style={{ opacity: fadeAnim }}>
                        {role === "dispatcher" ? (
                            <>
                                <Text style={styles.sectionTitle}>
                                    <Ionicons name="people" size={18} color={COLORS.warning} /> {t("citizenReports")}
                                </Text>
                                <Text style={styles.sectionDesc}>{t("citizenReportsDesc")}</Text>

                                {/* Search bar */}
                                <View style={styles.searchBar}>
                                    <Ionicons name="search-outline" size={16} color={COLORS.textSecondary} style={{ marginRight: 8 }} />
                                    <TextInput
                                        style={styles.searchInput}
                                        placeholder={t("searchReports")}
                                        placeholderTextColor={COLORS.textSecondary + "66"}
                                        value={reportSearch}
                                        onChangeText={setReportSearch}
                                    />
                                    {reportSearch.length > 0 && (
                                        <TouchableOpacity onPress={() => setReportSearch("")}>
                                            <Ionicons name="close-circle" size={16} color={COLORS.textSecondary} />
                                        </TouchableOpacity>
                                    )}
                                </View>

                                {/* Filter chips */}
                                <View style={styles.filterRow}>
                                    {(["all", "pending", "processing", "dispatched"] as const).map(f => (
                                        <TouchableOpacity
                                            key={f}
                                            style={[styles.filterChip, reportFilter === f && styles.filterChipActive]}
                                            onPress={() => setReportFilter(f)}
                                        >
                                            <Text style={[styles.filterChipText, reportFilter === f && styles.filterChipTextActive]}>
                                                {t(`filter${f.charAt(0).toUpperCase() + f.slice(1)}` as any)}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                {filteredReports.length === 0 ? (
                                    <View style={styles.emptyState}>
                                        <Ionicons name="document-text-outline" size={48} color={COLORS.textSecondary + "33"} />
                                        <Text style={styles.emptyText}>{t("noPending")}</Text>
                                    </View>
                                ) : (
                                    (() => {
                                        const clusters: Record<string, any[]> = {};
                                        filteredReports.forEach(r => {
                                            const key = (r.traffic_location || r.weather_location || "unknown").toLowerCase().trim();
                                            if (!clusters[key]) clusters[key] = [];
                                            clusters[key].push(r);
                                        });
                                        return Object.entries(clusters).map(([loc, reports]) => {
                                            const primary = reports[0];
                                            const dupeCount = reports.length;
                                            const totalUpvotes = reports.reduce((sum: number, r: any) => sum + (r.upvotes || 0), 0);
                                            const overdue = isClusterOverdue(reports);

                                            return (
                                                <TouchableOpacity
                                                    key={loc}
                                                    style={[
                                                        styles.scenarioCard,
                                                        loading && loadingId === primary.id && styles.scenarioCardActive,
                                                        overdue && { borderColor: COLORS.danger + "88" }
                                                    ]}
                                                    onPress={() => {
                                                        setClusterDrawerData({ loc, reports });
                                                        setClusterDrawerVisible(true);
                                                    }}
                                                    disabled={loading}
                                                    activeOpacity={0.7}
                                                >
                                                    <View style={styles.scenarioTop}>
                                                        <Text style={styles.scenarioIcon}>📣</Text>
                                                        <View style={styles.scenarioInfo}>
                                                            <Text style={styles.scenarioTitle} numberOfLines={1}>{primary.social_media_text}</Text>
                                                            <Text style={styles.scenarioDesc}>{primary.traffic_location} | {new Date(primary.createdAt).toLocaleTimeString()}</Text>
                                                        </View>
                                                        <View style={{ alignItems: "flex-end", gap: 4 }}>
                                                            {overdue && (
                                                                <View style={[styles.severityBadge, { backgroundColor: COLORS.danger + "22", borderColor: COLORS.danger }]}>
                                                                    <Text style={[styles.severityText, { color: COLORS.danger }]}>{t("overdue")}</Text>
                                                                </View>
                                                            )}
                                                            {dupeCount > 1 && (
                                                                <View style={[styles.severityBadge, { backgroundColor: COLORS.warning + "22", borderColor: COLORS.warning }]}>
                                                                    <Text style={[styles.severityText, { color: COLORS.warning }]}>{dupeCount}x {t("cluster")}</Text>
                                                                </View>
                                                            )}
                                                            <View style={[styles.severityBadge, { backgroundColor: COLORS.surfaceElevated, borderColor: COLORS.border, flexDirection: "row", alignItems: "center" }]}>
                                                                <Ionicons name="arrow-up" size={12} color={COLORS.primary} style={{ marginRight: 2 }} />
                                                                <Text style={[styles.severityText, { color: COLORS.primary }]}>{totalUpvotes}</Text>
                                                            </View>
                                                        </View>
                                                    </View>
                                                </TouchableOpacity>
                                            );
                                        });
                                    })()
                                )}
                            </>
                        ) : (
                            <>
                                {myReports.length > 0 ? (
                                    <>
                                        <Text style={styles.sectionTitle}><Ionicons name="time" size={18} color={COLORS.primary} /> My Reports</Text>
                                        <Text style={styles.sectionDesc}>Track the status of your submitted reports</Text>
                                        {myReports.slice(0, 5).map((report) => {
                                            const status = report.status || "pending";
                                            const statusConfig: Record<string, { icon: string; color: string; label: string }> = {
                                                pending: { icon: "🕒", color: COLORS.warning, label: "Submitted" },
                                                processing: { icon: "🔄", color: COLORS.info, label: "Escalated" },
                                                dispatched: { icon: "✅", color: COLORS.primary, label: "Dispatched" },
                                                resolved: { icon: "🚑", color: COLORS.low, label: "Help Arriving" },
                                            };
                                            const sc = statusConfig[status] || statusConfig.pending;
                                            return (
                                                <TouchableOpacity
                                                    key={report.id}
                                                    style={[styles.scenarioCard, { borderLeftWidth: 3, borderLeftColor: sc.color }]}
                                                    onPress={() => {
                                                        if (report.pipelineResult) {
                                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                                            try {
                                                                const parsed = JSON.parse(report.pipelineResult);
                                                                navigation.navigate("Result", { report: parsed });
                                                            } catch (e) {
                                                                Alert.alert("Error", "Failed to load response result.");
                                                            }
                                                        } else {
                                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                            Alert.alert(
                                                                "Report Received",
                                                                `Status: ${sc.label.toUpperCase()}\n\nNDMA controls are currently parsing this crisis feed. Real-time rescue routes, dispatch units, and tactical telemetry will appear here as soon as resource planning commences!`
                                                            );
                                                        }
                                                    }}
                                                    activeOpacity={0.7}
                                                >
                                                    <View style={styles.scenarioTop}>
                                                        <Text style={{ fontSize: 20, marginRight: 12 }}>{sc.icon}</Text>
                                                        <View style={styles.scenarioInfo}>
                                                            <Text style={styles.scenarioTitle} numberOfLines={1}>{report.social_media_text}</Text>
                                                            <Text style={styles.scenarioDesc}>{report.traffic_location} | {new Date(report.createdAt).toLocaleString()}</Text>
                                                        </View>
                                                        <View style={{ flexDirection: "row", alignItems: "center" }}>
                                                            <View style={[styles.severityBadge, { backgroundColor: sc.color + "22", borderColor: sc.color, marginRight: report.pipelineResult ? 6 : 0 }]}>
                                                                <Text style={[styles.severityText, { color: sc.color }]}>{sc.label}</Text>
                                                            </View>
                                                            {report.pipelineResult && (
                                                                <Ionicons name="chevron-forward" size={16} color={COLORS.primary} />
                                                            )}
                                                        </View>
                                                    </View>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </>
                                ) : (
                                    <View style={styles.emptyState}>
                                        <Ionicons name="document-text-outline" size={48} color={COLORS.textSecondary + "33"} />
                                        <Text style={styles.emptyText}>No reports yet. Submit one from the Report tab!</Text>
                                    </View>
                                )}
                            </>
                        )}
                    </Animated.View>
                )}

                {/* ===== NEARBY TAB ===== */}
                {activeTab === "nearby" && (
                    <Animated.View style={{ opacity: fadeAnim }}>
                        {citizenReports.length > 0 ? (
                            <>
                                <Text style={styles.sectionTitle}><Ionicons name="map" size={18} color={COLORS.warning} /> Nearby Reports</Text>
                                <Text style={styles.sectionDesc}>Help NDMA verify active crises in your area</Text>

                                {/* ── Map (Leaflet via WebView) ── */}
                                {(() => {
                                    const nearbyMarkers = citizenReports.map((r) => {
                                        const loc = r.traffic_location || r.weather_location || "";
                                        for (const [key, val] of Object.entries(GEO_LOOKUP)) {
                                            if (loc.includes(key)) {
                                                let sev = "MEDIUM";
                                                if (r.pipelineResult) {
                                                    try {
                                                        const parsed = JSON.parse(r.pipelineResult);
                                                        const assessment = parsed.agent_outputs?.crisis_assessment || "";
                                                        if (assessment.includes("CRITICAL")) sev = "CRITICAL";
                                                        else if (assessment.includes("HIGH")) sev = "HIGH";
                                                        else if (assessment.includes("LOW")) sev = "LOW";
                                                    } catch { /* keep MEDIUM default */ }
                                                }
                                                return {
                                                    id: r.id,
                                                    lat: val.lat + (Math.random() - 0.5) * 0.01,
                                                    lng: val.lng + (Math.random() - 0.5) * 0.01,
                                                    severity: sev,
                                                    title: `${loc} — ${r.status || "pending"}`,
                                                    report: r,
                                                };
                                            }
                                        }
                                        return null;
                                    }).filter(Boolean) as { id: string; lat: number; lng: number; severity: string; title: string; report: any }[];

                                    return (
                                        <View style={{ marginBottom: 16 }}>
                                            <HotspotMap
                                                markers={nearbyMarkers.map((m) => ({
                                                    id: m.id,
                                                    lat: m.lat,
                                                    lng: m.lng,
                                                    severity: m.severity,
                                                    title: m.title,
                                                }))}
                                                height={280}
                                                onMarkerPress={(id) => {
                                                    const m = nearbyMarkers.find((x) => x.id === id);
                                                    if (!m) return;
                                                    if (m.report.pipelineResult) {
                                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                                        try {
                                                            const parsed = JSON.parse(m.report.pipelineResult);
                                                            navigation.navigate("Result", { report: parsed });
                                                        } catch {
                                                            Alert.alert("Error", "Failed to load response result.");
                                                        }
                                                    } else {
                                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                        Alert.alert(
                                                            "Incident Verification",
                                                            `This report for ${m.report.traffic_location || "selected area"} is currently ${m.report.status || "pending"}.\n\nTapping "Confirm" adds your community upvote, prompting NDMA operators to run the response pipeline!`
                                                        );
                                                    }
                                                }}
                                            />
                                        </View>
                                    );
                                })()}
                                {citizenReports.map((report) => (
                                    <TouchableOpacity
                                        key={report.id}
                                        style={styles.scenarioCard}
                                        onPress={() => {
                                            if (report.pipelineResult) {
                                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                                try {
                                                    const parsed = JSON.parse(report.pipelineResult);
                                                    navigation.navigate("Result", { report: parsed });
                                                } catch (e) {
                                                    Alert.alert("Error", "Failed to load response result.");
                                                }
                                            } else {
                                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                Alert.alert(
                                                    "Incident Verification",
                                                    `This report for ${report.traffic_location || "selected area"} is currently ${report.status || "pending"}.\n\nTapping "Confirm" adds your community upvote, prompting NDMA operators to run the response pipeline!`
                                                );
                                            }
                                        }}
                                        activeOpacity={0.7}
                                    >
                                        <View style={styles.scenarioTop}>
                                            <Text style={styles.scenarioIcon}>📢</Text>
                                            <View style={styles.scenarioInfo}>
                                                <Text style={styles.scenarioTitle} numberOfLines={1}>{report.social_media_text}</Text>
                                                <Text style={styles.scenarioDesc}>{report.traffic_location} | {new Date(report.createdAt).toLocaleTimeString()}</Text>
                                            </View>
                                            <View style={{ flexDirection: "row", alignItems: "center" }}>
                                                {(() => {
                                                    const hasVoted = report.votedBy?.includes(auth.currentUser?.uid);
                                                    return (
                                                        <TouchableOpacity
                                                            style={[styles.severityBadge, { backgroundColor: hasVoted ? COLORS.primaryDim : COLORS.surfaceElevated, borderColor: COLORS.primary, flexDirection: "row", alignItems: "center" }]}
                                                            onPress={() => handleUpvote(report.id)}
                                                            disabled={hasVoted}
                                                        >
                                                            <Ionicons name={hasVoted ? "checkmark-circle" : "arrow-up"} size={14} color={COLORS.primary} style={{ marginRight: 4 }} />
                                                            <Text style={[styles.severityText, { color: COLORS.primary }]}>
                                                                {hasVoted ? `Confirmed (${report.upvotes || 0})` : `Confirm (${report.upvotes || 0})`}
                                                            </Text>
                                                        </TouchableOpacity>
                                                    );
                                                })()}
                                                {report.pipelineResult && (
                                                    <Ionicons name="chevron-forward" size={16} color={COLORS.primary} style={{ marginLeft: 8 }} />
                                                )}
                                            </View>
                                        </View>
                                    </TouchableOpacity>
                                ))}
                            </>
                        ) : (
                            <View style={styles.emptyState}>
                                <Ionicons name="map-outline" size={48} color={COLORS.textSecondary + "33"} />
                                <Text style={styles.emptyText}>No nearby incidents reported. Community is safe! 👍</Text>
                            </View>
                        )}
                    </Animated.View>
                )}

                {/* ===== SUBMIT TAB ===== */}
                {activeTab === "submit" && (
                    <Animated.View style={{ opacity: fadeAnim }}>
                        <Text style={styles.sectionTitle}>
                            <Ionicons name="create" size={18} color={COLORS.primary} /> {role === "reporter" ? t("reportIncident") : t("manualOverride")}
                        </Text>
                        <Text style={styles.sectionDesc}>{role === "reporter" ? t("reportIncidentDesc") : t("manualOverrideDesc")}</Text>

                        <View style={styles.inputGroup}>
                            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                                <Text style={[styles.inputLabel, { marginBottom: 0 }]}>{t("crisisReport")}</Text>
                                <TouchableOpacity
                                    onPress={isRecording ? stopRecording : startRecording}
                                    style={{ backgroundColor: isRecording ? COLORS.danger : COLORS.surfaceElevated, padding: 8, borderRadius: 20, borderWidth: 1, borderColor: isRecording ? COLORS.danger : COLORS.border }}
                                >
                                    <Ionicons name={isRecording ? "stop" : "mic"} size={18} color={isRecording ? "#FFFFFF" : COLORS.primary} />
                                </TouchableOpacity>
                            </View>
                            <TextInput
                                style={[styles.input, styles.inputMultiline]}
                                placeholder={t("micPlaceholder")}
                                placeholderTextColor={COLORS.textSecondary + "88"}
                                value={socialText}
                                onChangeText={(v) => setSocialText(v.slice(0, MAX_REPORT_CHARS))}
                                multiline
                                numberOfLines={3}
                            />
                            {/* Character counter */}
                            <Text style={[styles.charCounter, socialText.length > MAX_REPORT_CHARS * 0.9 && { color: COLORS.warning }]}>
                                {socialText.length} / {MAX_REPORT_CHARS}
                            </Text>
                        </View>

                        {loading && loadingId === "transcribe" && (
                            <View style={[styles.loadingBar, { marginBottom: 16, backgroundColor: COLORS.surfaceElevated, padding: 12, borderRadius: 8 }]}>
                                <ActivityIndicator size="small" color={COLORS.primary} />
                                <View style={{ flex: 1, marginLeft: 8 }}>
                                    <Text style={styles.loadingText}>{t("transcribing")}</Text>
                                </View>
                            </View>
                        )}

                        {/* Location fields stacked vertically */}
                        <View style={{ gap: 4, marginBottom: 14 }}>
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>{t("weatherLocation")}</Text>
                                <TextInput style={styles.input} placeholder="Islamabad" placeholderTextColor={COLORS.textSecondary + "88"} value={weatherLoc} onChangeText={setWeatherLoc} />
                            </View>
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>{t("trafficLocation")}</Text>
                                <TextInput style={styles.input} placeholder="G-10" placeholderTextColor={COLORS.textSecondary + "88"} value={trafficLoc} onChangeText={setTrafficLoc} />
                            </View>
                        </View>

                        {/* GPS auto-detect button */}
                        <TouchableOpacity
                            style={styles.gpsBtn}
                            onPress={autoDetectLocation}
                            disabled={detectingGps}
                            activeOpacity={0.7}
                        >
                            {detectingGps ? (
                                <ActivityIndicator size="small" color={COLORS.info} style={{ marginRight: 8 }} />
                            ) : (
                                <Ionicons name="locate-outline" size={16} color={COLORS.info} style={{ marginRight: 8 }} />
                            )}
                            <Text style={styles.gpsBtnText}>
                                {detectingGps ? t("detectingLocation") : "Auto-detect my location"}
                            </Text>
                        </TouchableOpacity>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>{t("additionalContext")}</Text>
                            <TextInput style={styles.input} placeholder={t("contextPlaceholder")} placeholderTextColor={COLORS.textSecondary + "88"} value={context} onChangeText={setContext} />
                        </View>

                        <View style={styles.overridesContainer}>
                            <Text style={styles.overridesTitle}>Dashboard API Overrides (Testing)</Text>
                            {renderStepper("Mock Water Level", mockWater, setMockWater, "cm", 10, 0, 200)}
                            {renderStepper("Mock Rainfall", mockRain, setMockRain, "mm", 5, 0, 100)}
                            {renderStepper("Mock Temperature", mockTemp, setMockTemp, "°C", 1, 20, 60)}
                            {renderStepper("Mock AQI", mockAqi, setMockAqi, "", 10, 0, 500)}
                            {renderStepper("Emergency Calls", mockCalls, setMockCalls, "", 5, 0, 200)}
                        </View>

                        <View style={styles.imagePickerRow}>
                            <TouchableOpacity style={styles.imagePickerBtn} onPress={pickImage}>
                                <Ionicons name="camera-outline" size={20} color={COLORS.textPrimary} />
                                <Text style={styles.imagePickerText}>{imageUri ? t("changePhoto") : t("attachPhoto")}</Text>
                            </TouchableOpacity>
                            {imageUri && (
                                <TouchableOpacity onPress={() => { setImageUri(null); setImageBase64(null); }} style={{ position: "relative" }}>
                                    <Image source={{ uri: imageUri }} style={styles.imagePreview} />
                                    <View style={styles.imageRemoveBtn}>
                                        <Ionicons name="close" size={10} color="#fff" />
                                    </View>
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* Submit buttons */}
                        {role === "reporter" ? (
                            <TouchableOpacity onPress={handleSubmitReport} disabled={loading || !socialText.trim()} activeOpacity={0.85}>
                                <LinearGradient
                                    colors={loading ? [COLORS.primary + '88', '#E8C54788'] : [COLORS.primary, '#E8C547']}
                                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                                    style={[styles.analyzeBtn, (!socialText.trim()) && styles.analyzeBtnDisabled]}
                                >
                                    <View style={styles.btnContent}>
                                        <Ionicons name="send" size={20} color={COLORS.bg} />
                                        <Text style={styles.analyzeBtnText}> {loading && loadingId === "submit" ? t("submitting") : t("submitToNdma")}</Text>
                                    </View>
                                </LinearGradient>
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity onPress={handleCustom} disabled={loading || !socialText.trim()} activeOpacity={0.85}>
                                <LinearGradient
                                    colors={loading ? [COLORS.primary + '88', '#E8C54788'] : [COLORS.primary, '#E8C547']}
                                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                                    style={[styles.analyzeBtn, (!socialText.trim()) && styles.analyzeBtnDisabled]}
                                >
                                    <View style={styles.btnContent}>
                                        <Ionicons name="analytics" size={20} color={COLORS.bg} />
                                        <Text style={styles.analyzeBtnText}> {loading && loadingId === "custom" ? t("pipelineRunning") : t("runPipeline")}</Text>
                                    </View>
                                </LinearGradient>
                            </TouchableOpacity>
                        )}

                        {loading && (loadingId === "custom" || loadingId === "submit") && (
                            <View style={[styles.loadingBar, { marginTop: 12 }]}>
                                <ActivityIndicator size="small" color={COLORS.primary} />
                                <View style={{ flex: 1, marginLeft: 8 }}>
                                    <Text style={styles.loadingText}>{t("agentsWorking")}</Text>
                                    <Text style={styles.liveLogText}>{liveLog}</Text>
                                </View>
                            </View>
                        )}
                    </Animated.View>
                )}

                <View style={styles.footer}>
                    <Text style={styles.footerText}>Powered by Google ADK + Gemini 2.0 Flash</Text>
                </View>
            </ScrollView>

            {/* ===== CLUSTER DETAIL DRAWER ===== */}
            <Modal
                visible={clusterDrawerVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setClusterDrawerVisible(false)}
            >
                <View style={styles.drawerOverlay}>
                    <View style={styles.drawerCard}>
                        <View style={styles.drawerHandle} />

                        <View style={styles.drawerHeader}>
                            <Text style={styles.drawerTitle}>{t("clusterDetails")}</Text>
                            <TouchableOpacity onPress={() => setClusterDrawerVisible(false)}>
                                <Ionicons name="close" size={22} color={COLORS.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        {clusterDrawerData && (
                            <>
                                <View style={styles.drawerLocRow}>
                                    <Ionicons name="location-outline" size={14} color={COLORS.primary} />
                                    <Text style={styles.drawerLoc}> {clusterDrawerData.loc} — {clusterDrawerData.reports.length} report{clusterDrawerData.reports.length !== 1 ? "s" : ""}</Text>
                                </View>

                                <ScrollView style={{ maxHeight: 280 }} showsVerticalScrollIndicator={false}>
                                    {clusterDrawerData.reports.map((r, i) => (
                                        <View key={r.id} style={styles.drawerReportItem}>
                                            <Text style={styles.drawerReportIdx}>{i + 1}.</Text>
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.drawerReportText} numberOfLines={2}>{r.social_media_text}</Text>
                                                <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
                                                    <Text style={styles.drawerReportMeta}>{new Date(r.createdAt).toLocaleTimeString()}</Text>
                                                    {r.upvotes > 0 && (
                                                        <Text style={styles.drawerReportMeta}>▲ {r.upvotes}</Text>
                                                    )}
                                                    <View style={[styles.statusDot, {
                                                        backgroundColor: r.status === "pending" ? COLORS.warning :
                                                            r.status === "processing" ? COLORS.info : COLORS.low
                                                    }]} />
                                                    <Text style={styles.drawerReportMeta}>{r.status}</Text>
                                                </View>
                                            </View>
                                        </View>
                                    ))}
                                </ScrollView>

                                <TouchableOpacity
                                    onPress={() => runClusterPipeline(clusterDrawerData.reports)}
                                    disabled={loading}
                                    activeOpacity={0.85}
                                    style={{ marginTop: 16 }}
                                >
                                    <LinearGradient
                                        colors={[COLORS.primary, '#E8C547']}
                                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                                        style={styles.drawerRunBtn}
                                    >
                                        <Ionicons name="analytics" size={18} color={COLORS.bg} />
                                        <Text style={styles.drawerRunBtnText}> {t("runForCluster")}</Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    );
}


const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },
    overridesContainer: { backgroundColor: COLORS.surfaceElevated, padding: 12, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: COLORS.border },
    overridesTitle: { color: COLORS.primary, fontWeight: 'bold', marginBottom: 12, fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 },
    stepperContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    stepperControls: { flexDirection: 'row', alignItems: 'center' },
    stepperBtn: { backgroundColor: COLORS.primary, width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    stepperValue: { color: COLORS.textPrimary, width: 60, textAlign: 'center', fontWeight: 'bold', fontSize: 14 },
    stepperReset: { marginLeft: 12, padding: 4 },
    fixedHeader: {
        backgroundColor: COLORS.surface,
        paddingTop: Platform.OS === "android" ? (RNStatusBar.currentHeight || 24) + 12 : 48,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border + "88",
    },
    headerTopRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingBottom: 8,
    },
    headerStatusRow: {
        flexDirection: "row",
        gap: 8,
        paddingBottom: 10,
        alignItems: "center",
    },
    badge: {
        flexDirection: "row", alignItems: "center",
        paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1,
    },
    badgeText: { fontSize: 9, fontWeight: "700", letterSpacing: 1 },

    tabBarContainer: {
        paddingVertical: 10,
        backgroundColor: COLORS.surface,
    },
    tabBarScrollContent: {
        paddingHorizontal: 0,
        gap: 8,
    },
    tabChip: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: COLORS.surfaceElevated,
        borderWidth: 1,
        borderColor: COLORS.border,
        gap: 6,
    },
    tabChipActive: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    tabChipText: {
        fontSize: 11,
        fontWeight: "600",
        color: COLORS.textSecondary,
        letterSpacing: 0.3,
    },
    tabChipTextActive: {
        color: COLORS.bg,
        fontWeight: "700",
    },

    section: { marginBottom: 28 },
    sectionTitle: { fontSize: 17, fontWeight: "800", color: COLORS.textPrimary, marginBottom: 4 },
    sectionDesc: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 16, letterSpacing: 0.2 },

    emptyState: { alignItems: "center", paddingVertical: 48 },
    emptyText: { color: COLORS.textSecondary, fontStyle: "italic", marginTop: 12, fontSize: 13 },

    // Search + filter
    searchBar: {
        flexDirection: "row", alignItems: "center",
        backgroundColor: COLORS.surfaceElevated, borderRadius: 12,
        paddingHorizontal: 12, paddingVertical: 8,
        borderWidth: 1, borderColor: COLORS.border,
        marginBottom: 10,
    },
    searchInput: { flex: 1, color: COLORS.textPrimary, fontSize: 13 },
    filterRow: { flexDirection: "row", gap: 8, marginBottom: 14, flexWrap: "wrap" },
    filterChip: {
        paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20,
        backgroundColor: COLORS.surfaceElevated, borderWidth: 1, borderColor: COLORS.border,
    },
    filterChipActive: { backgroundColor: COLORS.primary + "22", borderColor: COLORS.primary },
    filterChipText: { fontSize: 10, fontWeight: "600", color: COLORS.textSecondary },
    filterChipTextActive: { color: COLORS.primary },

    scenarioCard: {
        backgroundColor: COLORS.surface, borderRadius: 16, padding: 16,
        marginBottom: 12, borderWidth: 1, borderColor: COLORS.border + "88",
    },
    scenarioCardActive: { borderColor: COLORS.primary },
    scenarioTop: { flexDirection: "row", alignItems: "center" },
    scenarioIcon: { fontSize: 26, marginRight: 12 },
    scenarioInfo: { flex: 1 },
    scenarioTitle: { fontSize: 14, fontWeight: "700", color: COLORS.textPrimary },
    scenarioDesc: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
    severityBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, borderWidth: 1 },
    severityText: { fontSize: 9, fontWeight: "800", letterSpacing: 0.5 },
    loadingBar: {
        flexDirection: "row", alignItems: "center", marginTop: 12,
        paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border,
    },
    loadingText: { fontSize: 12, color: COLORS.primary, fontWeight: "600" },
    liveLogText: { fontSize: 10, color: COLORS.textSecondary, marginTop: 2, fontStyle: "italic" },

    inputGroup: { marginBottom: 14 },
    inputLabel: { fontSize: 11, fontWeight: "700", color: COLORS.textSecondary, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.8 },
    input: {
        backgroundColor: COLORS.surface, borderRadius: 14, padding: 14,
        fontSize: 14, color: COLORS.textPrimary,
        borderWidth: 1, borderColor: COLORS.border + "88",
    },
    inputMultiline: { minHeight: 80, textAlignVertical: "top" },
    inputRow: { flexDirection: "row" },

    charCounter: { fontSize: 10, color: COLORS.textSecondary + "88", textAlign: "right", marginTop: 4 },

    gpsBtn: {
        flexDirection: "row", alignItems: "center",
        backgroundColor: COLORS.info + "11", borderRadius: 10,
        paddingHorizontal: 14, paddingVertical: 10,
        borderWidth: 1, borderColor: COLORS.info + "33",
        marginBottom: 14,
    },
    gpsBtnText: { fontSize: 12, color: COLORS.info, fontWeight: "600" },

    imagePickerRow: { flexDirection: "row", alignItems: "center", marginBottom: 16, gap: 12 },
    imagePickerBtn: {
        flexDirection: "row", alignItems: "center", backgroundColor: COLORS.surface,
        paddingHorizontal: 16, paddingVertical: 12, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border + "88",
    },
    imagePickerText: { fontSize: 13, color: COLORS.textPrimary, marginLeft: 8, fontWeight: "600" },
    imagePreview: { width: 50, height: 50, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border },
    imageRemoveBtn: {
        position: "absolute", top: -6, right: -6,
        width: 18, height: 18, borderRadius: 9,
        backgroundColor: COLORS.danger, alignItems: "center", justifyContent: "center",
    },

    analyzeBtn: { borderRadius: 14, padding: 16, alignItems: "center", marginTop: 8 },
    analyzeBtnDisabled: { opacity: 0.6 },
    btnContent: { flexDirection: "row", alignItems: "center" },
    analyzeBtnText: { fontSize: 15, fontWeight: "800", color: COLORS.bg, letterSpacing: 0.3 },

    footer: { alignItems: "center", marginTop: 8, paddingTop: 16, borderTopWidth: 1, borderTopColor: COLORS.border + "44" },
    footerText: { fontSize: 11, color: COLORS.textSecondary + "44" },

    // Cluster drawer
    drawerOverlay: {
        flex: 1, backgroundColor: "#000000bb",
        justifyContent: "flex-end",
    },
    drawerCard: {
        backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
        padding: 20, paddingBottom: 36,
        borderWidth: 1, borderBottomWidth: 0, borderColor: COLORS.border,
    },
    drawerHandle: {
        width: 40, height: 4, borderRadius: 2,
        backgroundColor: COLORS.border, alignSelf: "center", marginBottom: 16,
    },
    drawerHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
    drawerTitle: { fontSize: 16, fontWeight: "800", color: COLORS.textPrimary },
    drawerLocRow: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
    drawerLoc: { fontSize: 12, color: COLORS.primary, fontWeight: "600" },
    drawerReportItem: {
        flexDirection: "row", paddingVertical: 10,
        borderBottomWidth: 1, borderBottomColor: COLORS.border,
    },
    drawerReportIdx: { fontSize: 12, color: COLORS.textSecondary, marginRight: 8, width: 18 },
    drawerReportText: { fontSize: 13, color: COLORS.textPrimary, lineHeight: 18 },
    drawerReportMeta: { fontSize: 10, color: COLORS.textSecondary },
    statusDot: { width: 6, height: 6, borderRadius: 3, marginTop: 2 },
    drawerRunBtn: { borderRadius: 14, padding: 16, flexDirection: "row", alignItems: "center", justifyContent: "center" },
    drawerRunBtnText: { fontSize: 15, fontWeight: "800", color: COLORS.bg },
});
