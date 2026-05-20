import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { AppTabParamList } from '@navigation/navigationRef';
import PQRListScreen from '@features/pqr/screens/PQRListScreen';
import MyPQRsScreen from '@features/pqr/screens/MyPQRsScreen';
import EntityListScreen from '@features/entities/screens/EntityListScreen';
import UserProfileScreen from '@features/users/screens/UserProfileScreen';
import { usePushNotifications } from '@core/notifications/usePushNotifications';
import { withErrorBoundary } from '@shared/components/ui/withErrorBoundary';

const Tab = createBottomTabNavigator<AppTabParamList>();

const InicioScreen = withErrorBoundary(PQRListScreen);
const MisPQRSDsScreen = withErrorBoundary(MyPQRsScreen);
const EntidadesScreen = withErrorBoundary(EntityListScreen);
const PerfilScreen = withErrorBoundary(UserProfileScreen);

export function AppTabNavigator() {
  usePushNotifications();
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#2563EB',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor: '#E5E7EB',
          borderTopWidth: 1,
          paddingTop: 8,
          paddingBottom: Math.max(insets.bottom, 12),
          height: 60 + Math.max(insets.bottom, 12),
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarIcon: ({ color, size, focused }) => {
          const icons: Record<string, { active: keyof typeof Ionicons.glyphMap; inactive: keyof typeof Ionicons.glyphMap }> = {
            Inicio:    { active: 'home',          inactive: 'home-outline' },
            MisPQRSDs: { active: 'document-text', inactive: 'document-text-outline' },
            Entidades: { active: 'business',      inactive: 'business-outline' },
            Perfil:    { active: 'person',        inactive: 'person-outline' },
          };
          const set = icons[route.name];
          const name = set ? (focused ? set.active : set.inactive) : 'ellipse-outline';
          return <Ionicons name={name} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Inicio" component={InicioScreen} options={{ tabBarLabel: 'Inicio' }} />
      <Tab.Screen name="MisPQRSDs" component={MisPQRSDsScreen} options={{ tabBarLabel: 'Mis PQRSD' }} />
      <Tab.Screen name="Entidades" component={EntidadesScreen} options={{ tabBarLabel: 'Entidades' }} />
      <Tab.Screen name="Perfil" component={PerfilScreen} options={{ tabBarLabel: 'Perfil' }} />
    </Tab.Navigator>
  );
}
