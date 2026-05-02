import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useLawyers } from '@features/lawyers/hooks/useLawyers';
import { LawyerCard } from '@features/lawyers/components/LawyerCard';
import { ErrorState } from '@shared/components/ui/ErrorState';
import { useAuth } from '@core/auth/useAuth';
import type { AppStackParamList } from '@navigation/navigationRef';
import type { Lawyer } from '@core/types';

export default function LawyerListScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const { data: lawyers, isLoading, isError, refetch } = useLawyers();
  const { user } = useAuth();
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!lawyers) return [];
    if (!search.trim()) return lawyers;
    const q = search.trim().toLowerCase();
    return lawyers.filter(
      (l) =>
        l.user.name.toLowerCase().includes(q) ||
        l.specialties.some((s) => s.toLowerCase().includes(q)) ||
        l.description?.toLowerCase().includes(q),
    );
  }, [lawyers, search]);

  if (isError) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ErrorState message="No se pudieron cargar los abogados." onRetry={refetch} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Abogados</Text>
        <View style={styles.headerActions}>
          {user?.role === 'CLIENT' && (
            <TouchableOpacity onPress={() => navigation.navigate('RegisterAsLawyer')}>
              <Text style={styles.registerLink}>Ser abogado</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => navigation.navigate('MyLawyerRequests')}>
            <Text style={styles.myRequestsLink}>Mis solicitudes</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por nombre o especialidad…"
          placeholderTextColor="#9CA3AF"
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#2563EB" />
        </View>
      ) : (
        <FlatList<Lawyer>
          data={filtered}
          keyExtractor={(item) => item.id}
          removeClippedSubviews
          maxToRenderPerBatch={10}
          windowSize={5}
          renderItem={({ item }) => (
            <LawyerCard
              lawyer={item}
              onPress={() => navigation.navigate('LawyerDetail', { lawyerId: item.id })}
            />
          )}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.empty}>
                {search ? 'Sin resultados para esa búsqueda' : 'No hay abogados disponibles'}
              </Text>
            </View>
          }
          contentContainerStyle={filtered.length === 0 ? styles.emptyFill : { paddingBottom: 24, paddingTop: 8 }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  headerRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8,
  },
  title: { fontSize: 22, fontWeight: '700', color: '#111827' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  registerLink: { fontSize: 13, fontWeight: '600', color: '#16A34A' },
  myRequestsLink: { fontSize: 13, fontWeight: '600', color: '#2563EB' },
  searchContainer: { paddingHorizontal: 16, paddingBottom: 8 },
  searchInput: {
    backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB',
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: '#111827',
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyFill: { flex: 1 },
  empty: { fontSize: 14, color: '#9CA3AF', textAlign: 'center' },
});
