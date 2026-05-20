import React, { useState, useRef, useEffect } from "react";
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    Alert, Animated, Dimensions, KeyboardAvoidingView, Platform
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../services/firebaseConfig";
import { doc, setDoc } from "firebase/firestore";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

const C = {
  bg: "#181B22", surface: "#222731", surfaceEl: "#2E3442",
  primary: "#FFAE00", primaryDim: "#FFAE0022",
  accent: "#0A84FF", danger: "#FF5252",
  text: "#F8FAFC", textSec: "#94A3B8", border: "#384152aa",
};

export default function RegisterScreen({ navigation }: any) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState<"reporter" | "dispatcher">("reporter");
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(40)).current;
    const progressAnim = useRef(new Animated.Value(0)).current;
    const shimmerAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
            Animated.spring(slideAnim, { toValue: 0, damping: 12, useNativeDriver: true }),
        ]).start();

        Animated.loop(
            Animated.timing(shimmerAnim, { toValue: 1, duration: 2500, useNativeDriver: true })
        ).start();
    }, []);

    const handleRegister = async () => {
        if (!email || !password) {
            Alert.alert("Error", "Please fill in all fields");
            return;
        }
        setLoading(true);
        progressAnim.setValue(0);
        Animated.timing(progressAnim, { toValue: 1, duration: 3000, useNativeDriver: false }).start();

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
            await setDoc(doc(db, "users", userCredential.user.uid), {
                email: email.trim(),
                role: role,
                createdAt: new Date().toISOString()
            });
            navigation.replace("Main", { role });
        } catch (error: any) {
            Alert.alert("Registration Failed", error.message);
        } finally {
            setLoading(false);
        }
    };

    const progressWidth = progressAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ["0%", "100%"],
    });

    return (
        <View style={styles.container}>
            <StatusBar style="light" backgroundColor="transparent" translucent={true} />
            <View style={styles.glowOrb} />

            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, justifyContent: "center" }}>
                <Animated.View style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
                    <View style={styles.logoBg}>
                        <Ionicons name="person-add" size={36} color={C.primary} />
                    </View>
                    <Text style={styles.title}>Join CIRO</Text>
                    <Text style={styles.subtitle}>Register for crisis response access</Text>
                </Animated.View>

                <Animated.View style={[styles.formCard, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
                    <Text style={styles.formTitle}>Create Account</Text>
                    <Text style={styles.formSubtitle}>Select your role and enter credentials</Text>

                    <View style={styles.roleContainer}>
                        <TouchableOpacity
                            style={[styles.roleBtn, role === "reporter" && styles.roleBtnActive]}
                            onPress={() => setRole("reporter")}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="megaphone" size={18} color={role === "reporter" ? C.bg : C.textSec} />
                            <Text style={[styles.roleText, role === "reporter" && styles.roleTextActive]}> Reporter</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.roleBtn, role === "dispatcher" && styles.roleBtnActive]}
                            onPress={() => setRole("dispatcher")}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="business" size={18} color={role === "dispatcher" ? C.bg : C.textSec} />
                            <Text style={[styles.roleText, role === "dispatcher" && styles.roleTextActive]}> Dispatcher</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.inputContainer}>
                        <Ionicons name="mail-outline" size={18} color={C.textSec} style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="officer@ndma.gov.pk"
                            placeholderTextColor={C.textSec + "55"}
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                            keyboardType="email-address"
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <Ionicons name="lock-closed-outline" size={18} color={C.textSec} style={styles.inputIcon} />
                        <TextInput
                            style={[styles.input, { flex: 1 }]}
                            placeholder="Create password"
                            placeholderTextColor={C.textSec + "55"}
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry={!showPassword}
                        />
                        <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                            <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={18} color={C.textSec} />
                        </TouchableOpacity>
                    </View>

                    {loading && (
                        <View style={styles.progressBarContainer}>
                            <Animated.View style={[styles.progressBarFill, { width: progressWidth as any }]}>
                                <LinearGradient
                                    colors={[C.primary, "#FFD60A"]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={StyleSheet.absoluteFill}
                                />
                            </Animated.View>
                            <Text style={styles.progressText}>Creating secure account...</Text>
                        </View>
                    )}

                    <TouchableOpacity onPress={handleRegister} disabled={loading} activeOpacity={0.85}>
                        <LinearGradient
                            colors={loading ? [C.primary + "88", "#FFD60A88"] : [C.primary, "#FFD60A"]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.loginBtn}
                        >
                            {loading ? (
                                <View style={{ flexDirection: "row", alignItems: "center" }}>
                                    <Animated.View style={{ transform: [{ rotate: shimmerAnim.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] }) }] }}>
                                        <Ionicons name="sync" size={18} color={C.bg} />
                                    </Animated.View>
                                    <Text style={styles.loginText}> Creating...</Text>
                                </View>
                            ) : (
                                <View style={{ flexDirection: "row", alignItems: "center" }}>
                                    <Ionicons name="person-add-outline" size={20} color={C.bg} />
                                    <Text style={styles.loginText}> Sign Up</Text>
                                </View>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => navigation.navigate("Login")} style={styles.registerLink}>
                        <Text style={styles.linkText}>Already have an account? </Text>
                        <Text style={[styles.linkText, { color: C.primary, fontWeight: "700" }]}>Sign in</Text>
                    </TouchableOpacity>
                </Animated.View>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg, padding: 20 },
    glowOrb: {
        position: "absolute", top: -80, right: -80,
        width: 250, height: 250, borderRadius: 125,
        backgroundColor: C.primary + "06",
    },

    header: { alignItems: "center", marginBottom: 30 },
    logoBg: {
        width: 76, height: 76, borderRadius: 24,
        backgroundColor: C.primaryDim, alignItems: "center", justifyContent: "center",
        borderWidth: 1, borderColor: C.primary + "22",
    },
    title: { fontSize: 28, fontWeight: "900", color: C.text, marginTop: 12, letterSpacing: 1 },
    subtitle: { fontSize: 13, color: C.textSec, marginTop: 4 },

    formCard: {
        backgroundColor: C.surface, borderRadius: 20, padding: 24,
        borderWidth: 1, borderColor: C.border,
    },
    formTitle: { fontSize: 20, fontWeight: "800", color: C.text, marginBottom: 4 },
    formSubtitle: { fontSize: 12, color: C.textSec, marginBottom: 20 },

    roleContainer: { flexDirection: "row", gap: 10, marginBottom: 20 },
    roleBtn: {
        flex: 1, flexDirection: "row", padding: 14, borderRadius: 14,
        borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center",
        backgroundColor: C.surfaceEl,
    },
    roleBtnActive: { backgroundColor: C.primary, borderColor: C.primary },
    roleText: { color: C.textSec, fontWeight: "600", fontSize: 13 },
    roleTextActive: { color: C.bg, fontWeight: "bold" },

    inputContainer: {
        flexDirection: "row", alignItems: "center",
        backgroundColor: C.surfaceEl, borderRadius: 14, marginBottom: 14,
        borderWidth: 1, borderColor: C.border, paddingHorizontal: 14,
    },
    inputIcon: { marginRight: 10 },
    input: { flex: 1, color: C.text, paddingVertical: 15, fontSize: 14 },
    eyeBtn: { padding: 6 },

    progressBarContainer: { marginBottom: 16, borderRadius: 6, overflow: "hidden" },
    progressBarFill: { height: 3, borderRadius: 6, overflow: "hidden" },
    progressText: { fontSize: 10, color: C.primary + "88", marginTop: 6, textAlign: "center", fontStyle: "italic" },

    loginBtn: { borderRadius: 14, padding: 16, alignItems: "center", marginTop: 6 },
    loginText: { color: C.bg, fontSize: 16, fontWeight: "800", letterSpacing: 0.5 },

    registerLink: { flexDirection: "row", justifyContent: "center", marginTop: 20 },
    linkText: { fontSize: 13, color: C.textSec },
});
