import React from 'react';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../src/context/AuthContext';
import { ProgressProvider } from '../src/context/ProgressContext';
import { CoursesProvider } from '../src/context/CoursesContext';
import { usePushRegistration } from '../src/hooks/usePushRegistration';

function PushRegistrar() { usePushRegistration(); return null; }

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ProgressProvider>
          <CoursesProvider>
            <PushRegistrar />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
            </Stack>
          </CoursesProvider>
        </ProgressProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
