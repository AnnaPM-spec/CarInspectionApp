import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { InspectionProvider } from "../context/InspectionContext";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Назад" }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="auth" options={{ title: "Яндекс Диск" }} />
      <Stack.Screen name="new-inspection" options={{ title: "Новый осмотр" }} />
      <Stack.Screen 
        name="camera" 
        options={{ 
          headerShown: false,
          presentation: "fullScreenModal" 
        }} 
      />
      <Stack.Screen name="inspection/[id]" options={{ title: "Детали осмотра" }} />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <InspectionProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <RootLayoutNav />
        </GestureHandlerRootView>
      </InspectionProvider>
    </QueryClientProvider>
  );
}
