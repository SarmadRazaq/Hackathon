import React, { useState, useEffect } from "react";
import {
    View, Text, TextInput, TouchableOpacity, ScrollView,
    StyleSheet, Switch, Alert, Platform, StatusBar as RNStatusBar
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import {
    updatePassword, reauthenticateWithCredential,
    EmailAuthProvider, signOut
} from "firebase/auth";
import { auth } from "../services/firebaseConfig";

const C = {
    bg: "#181B22", surface: "#222731", surfaceEl: "#2E3442",
    primary: "#FFAE00", danger: "#FF5252", low: "#30D158",
    info: "#0A84FF", warning: "#FF9F0A",
    text: "#F8FAFC", textSec: "#94A3B8", border: "#384152aa",
};

const NOTIF_KEY = "ciro_notifications_enabled";

export default function SettingsScreen({ navigation, route }: any) {
    const role = route.params?.role || "reporter";
    const user = auth.currentUser;

    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [changingPassword, setChangingPassword] = useState(false);

    const [notificationsEnabled, setNotificationsEnabled] = useState(true);

    useEffect(() => {
        AsyncStorage.getItem(NOTIF_KEY).then(val => {
            if (val !== null) setNotificationsEnabled(val === "true");
        });
    }, []);

    const toggleNotifications = (value: boolean) => {
        setNotificationsEnabled(value);
        AsyncStorage.setItem(NOTIF_KEY, String(value));
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    const handleChangePassword = async () => {
        if (!currentPassword || !newPassword || !confirmPassword) {
            Alert.alert("Error", "Please fill in all password fields.");
            return;
        }
        if (newPassword !== confirmPassword) {
            Alert.alert("Error", "New passwords do not match.");
            return;
        }
        if (newPassword.length < 6) {
            Alert.alert("Error", "New password must be at least 6 characters.");
            return;
        }
        if (!user?.email) {
            Alert.alert("Error", "No authenticated user found.");
            return;
        }

        setChangingPassword(true);
        try {
            const credential = EmailAuthProvider.credential(user.email, currentPassword);
            await reauthenticateWithCredential(user, credential);
            await updatePassword(user, newPassword);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert("Success", "Password updated successfully.");
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
        } catch (err: any) {
            const msg = err.code === "auth/wrong-password"
                ? "Current password is incorrect."
                : err.code === "auth/too-many-requests"
                    ? "Too many attempts. Please try again later."
                    : err.message;
            Alert.alert("Error", msg);
        } finally {
            setChangingPassword(false);
        }
    };

    const handleLogout = async () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        Alert.alert("Sign Out", "Are you sure you want to sign out?", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Sign Out", style: "destructive",
                onPress: async () => {
                    try {
                        await signOut(auth);
                        navigation.reset({ index: 0, routes: [{ name: "Login" }] });
                    } catch (e) {
                        navigation.reset({ index: 0, routes: [{ name: "Login" }] });
                    }
                }
            }
        ]);
    };

    return (
        <View style={styles.container}>
            <StatusBar style="light" backgroundColor="transparent" translucent={true} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={20} color={C.text} />
                </TouchableOpacity>
                <View style={{ alignItems: "center" }}>
                    <Text style={styles.headerTitle}>Settings</Text>
                    <Text style={styles.headerSub}>Account & Preferences</Text>
                </View>
                <View style={{ width: 36 }} />
            </View>

            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>

                {/* Account Info */}
                <Text style={styles.sectionLabel}>ACCOUNT</Text>
                <View style={styles.card}>
                    <View style={styles.infoRow}>
                        <View style={styles.infoIconBg}>
                            <Ionicons name="person-outline" size={16} color={C.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.infoLabel}>Email</Text>
                            <Text style={styles.infoValue}>{user?.email || "—"}</Text>
                        </View>
                    </View>

                    <View style={[styles.infoRow, styles.rowBorder]}>
                        <View style={[styles.infoIconBg, { backgroundColor: C.warning + "18" }]}>
                            <Ionicons name="shield-outline" size={16} color={C.warning} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.infoLabel}>Role</Text>
                            <Text style={[styles.infoValue, { color: role === "dispatcher" ? C.warning : C.primary }]}>
                                {role.toUpperCase()}
                            </Text>
                        </View>
                    </View>

                    <View style={[styles.infoRow, styles.rowBorder]}>
                        <View style={[styles.infoIconBg, { backgroundColor: C.info + "18" }]}>
                            <Ionicons name="finger-print-outline" size={16} color={C.info} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.infoLabel}>User ID</Text>
                            <Text style={[styles.infoValue, { fontFamily: "monospace", fontSize: 10 }]}>
                                {user?.uid ? user.uid.slice(0, 20) + "…" : "—"}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Notifications */}
                <Text style={styles.sectionLabel}>NOTIFICATIONS</Text>
                <View style={styles.card}>
                    <View style={styles.toggleRow}>
                        <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                            <View style={[styles.infoIconBg, { backgroundColor: C.low + "18" }]}>
                                <Ionicons name="notifications-outline" size={16} color={C.low} />
                            </View>
                            <View style={{ marginLeft: 12 }}>
                                <Text style={styles.toggleLabel}>Push Notifications</Text>
                                <Text style={styles.toggleDesc}>NDMA alerts, dispatch updates</Text>
                            </View>
                        </View>
                        <Switch
                            value={notificationsEnabled}
                            onValueChange={toggleNotifications}
                            trackColor={{ false: C.surfaceEl, true: C.low + "66" }}
                            thumbColor={notificationsEnabled ? C.low : C.textSec}
                        />
                    </View>
                </View>

                {/* Change Password */}
                <Text style={styles.sectionLabel}>SECURITY</Text>
                <View style={styles.card}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Current Password</Text>
                        <View style={styles.inputWrapper}>
                            <Ionicons name="lock-closed-outline" size={16} color={C.textSec} style={{ marginRight: 8 }} />
                            <TextInput
                                style={styles.input}
                                value={currentPassword}
                                onChangeText={setCurrentPassword}
                                secureTextEntry={!showCurrent}
                                placeholder="Enter current password"
                                placeholderTextColor={C.textSec + "55"}
                            />
                            <TouchableOpacity onPress={() => setShowCurrent(!showCurrent)}>
                                <Ionicons name={showCurrent ? "eye-off-outline" : "eye-outline"} size={16} color={C.textSec} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>New Password</Text>
                        <View style={styles.inputWrapper}>
                            <Ionicons name="lock-open-outline" size={16} color={C.textSec} style={{ marginRight: 8 }} />
                            <TextInput
                                style={styles.input}
                                value={newPassword}
                                onChangeText={setNewPassword}
                                secureTextEntry={!showNew}
                                placeholder="Min 6 characters"
                                placeholderTextColor={C.textSec + "55"}
                            />
                            <TouchableOpacity onPress={() => setShowNew(!showNew)}>
                                <Ionicons name={showNew ? "eye-off-outline" : "eye-outline"} size={16} color={C.textSec} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Confirm New Password</Text>
                        <View style={styles.inputWrapper}>
                            <Ionicons name="checkmark-circle-outline" size={16} color={C.textSec} style={{ marginRight: 8 }} />
                            <TextInput
                                style={styles.input}
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                secureTextEntry={true}
                                placeholder="Re-enter new password"
                                placeholderTextColor={C.textSec + "55"}
                            />
                        </View>
                    </View>

                    <TouchableOpacity
                        style={[styles.saveBtn, (changingPassword || !currentPassword || !newPassword) && { opacity: 0.5 }]}
                        onPress={handleChangePassword}
                        disabled={changingPassword || !currentPassword || !newPassword}
                        activeOpacity={0.85}
                    >
                        <Ionicons name={changingPassword ? "sync" : "checkmark-outline"} size={16} color={C.bg} style={{ marginRight: 6 }} />
                        <Text style={styles.saveBtnText}>{changingPassword ? "Updating…" : "Update Password"}</Text>
                    </TouchableOpacity>
                </View>

                {/* Sign Out */}
                <TouchableOpacity style={styles.signOutBtn} onPress={handleLogout} activeOpacity={0.8}>
                    <Ionicons name="log-out-outline" size={18} color={C.danger} style={{ marginRight: 8 }} />
                    <Text style={styles.signOutText}>Sign Out</Text>
                </TouchableOpacity>

                <Text style={styles.footer}>CIRO v2.0 — National Disaster Management Authority</Text>
            </ScrollView>
        </View>
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

    sectionLabel: { fontSize: 10, fontWeight: "800", color: C.textSec, letterSpacing: 1.2, marginBottom: 8, marginTop: 20 },

    card: {
        backgroundColor: C.surface, borderRadius: 16, padding: 16,
        borderWidth: 1, borderColor: C.border,
    },

    infoRow: { flexDirection: "row", alignItems: "center", paddingVertical: 4 },
    rowBorder: { borderTopWidth: 1, borderTopColor: C.border, marginTop: 12, paddingTop: 14 },
    infoIconBg: {
        width: 32, height: 32, borderRadius: 10,
        backgroundColor: C.primary + "18", alignItems: "center", justifyContent: "center", marginRight: 12,
    },
    infoLabel: { fontSize: 10, color: C.textSec, fontWeight: "600" },
    infoValue: { fontSize: 13, color: C.text, fontWeight: "700", marginTop: 2 },

    toggleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    toggleLabel: { fontSize: 13, fontWeight: "700", color: C.text },
    toggleDesc: { fontSize: 10, color: C.textSec, marginTop: 2 },

    inputGroup: { marginBottom: 14 },
    inputLabel: { fontSize: 10, fontWeight: "700", color: C.textSec, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.8 },
    inputWrapper: {
        flexDirection: "row", alignItems: "center",
        backgroundColor: C.surfaceEl, borderRadius: 12,
        paddingHorizontal: 12, paddingVertical: 12,
        borderWidth: 1, borderColor: C.border,
    },
    input: { flex: 1, color: C.text, fontSize: 14 },

    saveBtn: {
        flexDirection: "row", alignItems: "center", justifyContent: "center",
        backgroundColor: C.primary, borderRadius: 12,
        paddingVertical: 13, marginTop: 4,
    },
    saveBtnText: { fontSize: 14, fontWeight: "800", color: C.bg },

    signOutBtn: {
        flexDirection: "row", alignItems: "center", justifyContent: "center",
        backgroundColor: C.danger + "11", borderRadius: 14,
        paddingVertical: 14, marginTop: 24,
        borderWidth: 1, borderColor: C.danger + "33",
    },
    signOutText: { fontSize: 14, fontWeight: "700", color: C.danger },

    footer: { fontSize: 10, color: C.textSec + "44", textAlign: "center", marginTop: 28 },
});
