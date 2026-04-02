import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { QueryProvider } from '@core/providers/QueryProvider';
import { AuthProvider } from '@core/providers/AuthProvider';
import RootNavigator from '@navigation/RootNavigator';

export default function App() {
  return (
    <QueryProvider>
      <NavigationContainer>
        <AuthProvider>
          <RootNavigator />
          <StatusBar style="auto" />
        </AuthProvider>
      </NavigationContainer>
    </QueryProvider>
  );
}
