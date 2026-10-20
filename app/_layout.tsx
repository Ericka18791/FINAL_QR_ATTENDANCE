import { Redirect, Stack, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  View,
} from 'react-native';

import { COLORS } from '@/constants/colors';
import { useAuth } from '@/lib/auth';

export default function RootLayout() {
  const { session, loading } = useAuth();
  const segments = useSegments();

  const [loadingTimedOut, setLoadingTimedOut] = useState(false);

  useEffect(() => {
    if (!loading) {
      setLoadingTimedOut(false);
      return;
    }

    const timeout = setTimeout(() => {
      console.warn(
        '[AUTH] Loading took too long. Continuing to the login screen.'
      );
      setLoadingTimedOut(true);
    }, 10000);

    return () => clearTimeout(timeout);
  }, [loading]);

  if (loading && !loadingTimedOut) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator
          size="large"
          color={COLORS.primary}
        />
      </View>
    );
  }

  const path = segments[0];
  const inAuthGroup =
    path === 'login' || path === 'register';

  // If authentication is still loading after the timeout,
  // show the login screen instead of waiting forever.
  if (loadingTimedOut && !session && !inAuthGroup) {
    return <Redirect href="/login" />;
  }

  if (!session && !inAuthGroup) {
    return <Redirect href="/login" />;
  }

  if (session && inAuthGroup) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

