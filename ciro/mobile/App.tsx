import React, { useState, useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { auth, db } from "./src/services/firebaseConfig";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

import LoginScreen from "./src/screens/LoginScreen";
import RegisterScreen from "./src/screens/RegisterScreen";
import HomeScreen from "./src/screens/HomeScreen";
import ResultScreen from "./src/screens/ResultScreen";
import LogsScreen from "./src/screens/LogsScreen";
import AnalyticsScreen from "./src/screens/AnalyticsScreen";
import SettingsScreen from "./src/screens/SettingsScreen";
import ComparisonScreen from "./src/screens/ComparisonScreen";
import MapScreen from "./src/screens/MapScreen";
import PublicDashboardScreen from "./src/screens/PublicDashboardScreen";
import ResourcesScreen from "./src/screens/ResourcesScreen";
import ImpactScreen from "./src/screens/ImpactScreen";
import CommsScreen from "./src/screens/CommsScreen";
import ActionPlanScreen from "./src/screens/ActionPlanScreen";
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { updateDoc } from "firebase/firestore";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Main: { role: string };
  Home: { role: string };
  Result: { report: any; role: string };
  Logs: { logs: any[]; metadata: any };
  Analytics: undefined;
  Settings: { role: string };
  Comparison: undefined;
  Map: undefined;
  PublicDashboard: undefined;
  Resources: undefined;
  Impact: undefined;
  Comms: undefined;
  ActionPlan: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string>("reporter");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (usr) => {
      if (usr) {
        setUser(usr);
        try {
          const docRef = doc(db, "users", usr.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setRole(docSnap.data().role || "reporter");
          }
          
          // Request Push Notification Permission
          if (Device.isDevice) {
            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;
            if (existingStatus !== 'granted') {
              const { status } = await Notifications.requestPermissionsAsync();
              finalStatus = status;
            }
            if (finalStatus === 'granted') {
              const tokenData = await Notifications.getExpoPushTokenAsync({
                projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID || "portfolio-website-cd2c6",
              });
              await updateDoc(docRef, { expoPushToken: tokenData.data });
            }
          }
        } catch (e) {
          console.error("Error fetching role or push token", e);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#080E1E", justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#D4A520" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar style="light" backgroundColor="#000000" />
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: "#080E1E" },
        }}
      >
        {user ? (
          <>
            <Stack.Screen name="Main" component={HomeScreen} initialParams={{ role }} />
            <Stack.Screen name="Result" component={ResultScreen} />
            <Stack.Screen name="Logs" component={LogsScreen} />
            <Stack.Screen name="Analytics" component={AnalyticsScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
            <Stack.Screen name="Comparison" component={ComparisonScreen} />
            <Stack.Screen name="Map" component={MapScreen} />
            <Stack.Screen name="PublicDashboard" component={PublicDashboardScreen} />
            <Stack.Screen name="Resources" component={ResourcesScreen} />
            <Stack.Screen name="Impact" component={ImpactScreen} />
            <Stack.Screen name="Comms" component={CommsScreen} />
            <Stack.Screen name="ActionPlan" component={ActionPlanScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen name="Main" component={HomeScreen} />
            <Stack.Screen name="PublicDashboard" component={PublicDashboardScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
