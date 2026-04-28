import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryProvider } from '@core/providers/QueryProvider';
import { AuthProvider } from '@core/providers/AuthProvider';
import RootNavigator from '@navigation/RootNavigator';
import { navigationRef } from '@navigation/navigationRef';

export default function App() {
  return (
    <SafeAreaProvider>
      <QueryProvider>
        <NavigationContainer ref={navigationRef}>
          <AuthProvider>
            <RootNavigator />
            <StatusBar style="dark" />
          </AuthProvider>
        </NavigationContainer>
      </QueryProvider>
    </SafeAreaProvider>
  );
}
