import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import type { AppStackParamList } from '@navigation/navigationRef';

type Nav = NativeStackNavigationProp<AppStackParamList>;
type Route = RouteProp<AppStackParamList, 'FormalFollowup'>;

export default function FormalFollowupScreen() {
  const navigation = useNavigation<Nav>();
  const { pqrId } = useRoute<Route>().params;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.intro}>
          Selecciona el tipo de seguimiento que deseas realizar para tu petición.
        </Text>

        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('GenerateTutela', { pqrId })}
          accessibilityRole="button"
          accessibilityLabel="Generar acción de tutela"
        >
          <View style={[styles.iconCircle, { backgroundColor: '#EFF6FF' }]}>
            <Ionicons name="document-text" size={24} color="#2563EB" />
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle}>Generar acción de tutela</Text>
            <Text style={styles.cardSub}>
              Crea un documento legal para proteger tus derechos fundamentales
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('LawyerList', { pqrId })}
          accessibilityRole="button"
          accessibilityLabel="Contactar abogado"
        >
          <View style={[styles.iconCircle, { backgroundColor: '#F0FDF4' }]}>
            <Ionicons name="people" size={24} color="#16A34A" />
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle}>Contactar abogado</Text>
            <Text style={styles.cardSub}>
              Recibe asesoría legal especializada para tu caso
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { padding: 16 },
  intro: { fontSize: 14, color: '#6B7280', marginBottom: 16, lineHeight: 20 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  cardBody: { flex: 1, marginRight: 8 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 3 },
  cardSub: { fontSize: 13, color: '#6B7280', lineHeight: 18 },
});
