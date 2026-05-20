import React, { useState, useRef, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, Animated, Dimensions, KeyboardAvoidingView, Platform, Modal
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { auth, db } from "../services/firebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

const { width } = Dimensions.get("window");

const C = {
  bg: "#181B22", surface: "#222731", surfaceEl: "#2E3442",
  primary: "#FFAE00", primaryDim: "#FFAE0022",
  accent: "#0A84FF", danger: "#FF5252",
  text: "#F8FAFC", textSec: "#94A3B8", border: "#384152aa",
};

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [resetModalVisible, setResetModalVisible] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  const handleForgotPassword = async () => {
    const target = resetEmail.trim();
    if (!target) { Alert.alert("Error", "Please enter your email address."); return; }
    setResetLoading(true);
    try {
      await sendPasswordResetEmail(auth, target);
      setResetModalVisible(false);
      setResetEmail("");
      Alert.alert("Email Sent", `Password reset link sent to ${target}. Check your inbox.`);
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setResetLoading(false);
    }
  };

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, damping: 12, useNativeDriver: true }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 2000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.timing(shimmerAnim, { toValue: 1, duration: 2500, useNativeDriver: true })
    ).start();
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }
    setLoading(true);
    progressAnim.setValue(0);
    Animated.timing(progressAnim, { toValue: 1, duration: 3000, useNativeDriver: false }).start();

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const userDoc = await getDoc(doc(db, "users", userCredential.user.uid));
      const role = userDoc.exists() ? userDoc.data().role : "reporter";
      navigation.replace("Main", { role });
    } catch (error: any) {
      Alert.alert("Authentication Failed", error.message);
    } finally {
      setLoading(false);
    }
  };

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  const shimmerTranslate = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-width, width],
  });

  return (
    <View style={styles.container}>
      <StatusBar style="light" backgroundColor="transparent" translucent={true} />

      <View style={styles.glowOrb} />
      <View style={styles.glowOrb2} />

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, justifyContent: "center" }}>
        <Animated.View style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <Animated.View style={[styles.logoBg, { transform: [{ scale: pulseAnim }] }]}>
            <LinearGradient
              colors={[C.primary + "22", C.primary + "08", "transparent"]}
              style={styles.logoGlow}
            />
            <Ionicons name="shield-checkmark" size={48} color={C.primary} />
          </Animated.View>
          <Text style={styles.title}>CIRO</Text>
          <Text style={styles.subtitle}>Crisis Intelligence & Response Orchestrator</Text>

          <View style={styles.versionBadge}>
            <View style={styles.versionDot} />
            <Text style={styles.versionText}>v2.0 - 8 Agent Council</Text>
          </View>
        </Animated.View>

        <Animated.View style={[styles.formCard, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.cardBorderTop}>
            <Animated.View style={[styles.shimmer, { transform: [{ translateX: shimmerTranslate }] }]}>
              <LinearGradient
                colors={["transparent", C.primary + "33", "transparent"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ width: 120, height: 2 }}
              />
            </Animated.View>
          </View>

          <Text style={styles.formTitle}>Secure Access</Text>
          <Text style={styles.formSubtitle}>Enter your NDMA credentials</Text>

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
              placeholder="Enter password"
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
              <Text style={styles.progressText}>Authenticating with NDMA servers...</Text>
            </View>
          )}

          <TouchableOpacity onPress={handleLogin} disabled={loading} activeOpacity={0.85}>
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
                  <Text style={styles.loginText}> Verifying...</Text>
                </View>
              ) : (
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Ionicons name="log-in-outline" size={20} color={C.bg} />
                  <Text style={styles.loginText}> Sign In</Text>
                </View>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => { setResetEmail(email); setResetModalVisible(true); }}
            style={styles.forgotLink}
          >
            <Text style={[styles.linkText, { color: C.accent }]}>Forgot Password?</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate("Register")} style={styles.registerLink}>
            <Text style={styles.linkText}>Don't have an account? </Text>
            <Text style={[styles.linkText, { color: C.primary, fontWeight: "700" }]}>Create one</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* ── Password Reset Modal ── */}
        <Modal visible={resetModalVisible} transparent animationType="fade" onRequestClose={() => setResetModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Reset Password</Text>
              <Text style={styles.modalSub}>Enter your account email and we'll send a reset link.</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="mail-outline" size={18} color={C.textSec} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="officer@ndma.gov.pk"
                  placeholderTextColor={C.textSec + "55"}
                  value={resetEmail}
                  onChangeText={setResetEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>
              <TouchableOpacity onPress={handleForgotPassword} disabled={resetLoading} activeOpacity={0.85}>
                <LinearGradient
                  colors={resetLoading ? [C.accent + "88", C.accent + "55"] : [C.accent, "#0066CC"]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={styles.loginBtn}
                >
                  <Text style={styles.loginText}>{resetLoading ? "Sending…" : "Send Reset Link"}</Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setResetModalVisible(false)} style={{ marginTop: 12, alignItems: "center" }}>
                <Text style={[styles.linkText, { color: C.textSec }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <Animated.View style={[styles.footer, { opacity: fadeAnim }]}>
          <Text style={styles.footerText}>Powered by Google ADK + Gemini 2.0 Flash</Text>
          <Text style={styles.footerSubText}>National Disaster Management Authority</Text>
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
  glowOrb2: {
    position: "absolute", bottom: -60, left: -60,
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: C.accent + "06",
  },

  header: { alignItems: "center", marginBottom: 36 },
  logoBg: {
    width: 88, height: 88, borderRadius: 28,
    backgroundColor: C.primaryDim,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: C.primary + "22",
    overflow: "hidden",
  },
  logoGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 28,
  },
  title: { fontSize: 42, fontWeight: "900", color: C.primary, marginTop: 14, letterSpacing: 6 },
  subtitle: { fontSize: 13, color: C.textSec, marginTop: 6, textAlign: "center", letterSpacing: 0.5 },
  versionBadge: {
    flexDirection: "row", alignItems: "center", marginTop: 14,
    backgroundColor: C.primaryDim, paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 20, borderWidth: 1, borderColor: C.primary + "22",
  },
  versionDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.primary, marginRight: 6 },
  versionText: { fontSize: 10, color: C.primary, fontWeight: "600", letterSpacing: 0.5 },

  formCard: {
    backgroundColor: C.surface, borderRadius: 20, padding: 24,
    borderWidth: 1, borderColor: C.border,
    overflow: "hidden",
  },
  cardBorderTop: {
    position: "absolute", top: 0, left: 0, right: 0,
    height: 2, overflow: "hidden",
  },
  shimmer: { position: "absolute", top: 0 },

  formTitle: { fontSize: 20, fontWeight: "800", color: C.text, marginBottom: 4 },
  formSubtitle: { fontSize: 12, color: C.textSec, marginBottom: 24 },

  inputContainer: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: C.surfaceEl, borderRadius: 14, marginBottom: 14,
    borderWidth: 1, borderColor: C.border,
    paddingHorizontal: 14,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, color: C.text, paddingVertical: 15, fontSize: 14 },
  eyeBtn: { padding: 6 },

  progressBarContainer: { marginBottom: 16, borderRadius: 6, overflow: "hidden" },
  progressBarFill: { height: 3, borderRadius: 6, overflow: "hidden" },
  progressText: { fontSize: 10, color: C.primary + "88", marginTop: 6, textAlign: "center", fontStyle: "italic" },

  loginBtn: { borderRadius: 14, padding: 16, alignItems: "center", marginTop: 6 },
  loginText: { color: C.bg, fontSize: 16, fontWeight: "800", letterSpacing: 0.5 },

  forgotLink: { alignItems: "flex-end", marginTop: -6, marginBottom: 14 },
  registerLink: { flexDirection: "row", justifyContent: "center", marginTop: 20 },
  linkText: { fontSize: 13, color: C.textSec },

  modalOverlay: {
    flex: 1, backgroundColor: "#000000cc",
    justifyContent: "center", alignItems: "center", padding: 24,
  },
  modalCard: {
    backgroundColor: C.surface, borderRadius: 20, padding: 24,
    width: "100%", borderWidth: 1, borderColor: C.border,
  },
  modalTitle: { fontSize: 20, fontWeight: "800", color: C.text, marginBottom: 6 },
  modalSub: { fontSize: 13, color: C.textSec, marginBottom: 20 },

  footer: { alignItems: "center", marginTop: 32 },
  footerText: { fontSize: 11, color: C.textSec + "44", letterSpacing: 0.5 },
  footerSubText: { fontSize: 10, color: C.textSec + "33", marginTop: 2 },
});
