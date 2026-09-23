import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import type { LegalDocSummary } from '@core/types';
import { ErrorState } from '@shared/components/ui/ErrorState';
import type { AppStackParamList } from '@navigation/navigationRef';
import { useMyLegalDocs } from '@features/pqr/hooks/useLegalDocs';
import { LEGAL_DOC_RETENTION_NOTICE } from '@features/pqr/utils/legalDocsCopy';
import { formatLegalDocDate } from '@features/pqr/utils/legalDocsCopy';

function DocItem({ item, onPress }: { item: LegalDocSummary; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.iconCircle}>
        <Ionicons name="document-text-outline" size={20} color="#2563EB" />
      </View>
      <View style={styles.cardBody}>
        {/* Se pinta el `title` del servidor y no un rótulo derivado del tipo:
         *  así un tipo que la app aún no conoce sigue mostrándose bien. */}
        <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.date}>{formatLegalDocDate(item.createdAt)}</Text>
        <Text style={styles.expiry}>
          Disponible hasta {formatLegalDocDate(item.expiresAt)}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
    </TouchableOpacity>
  );
}

export default function MyLegalDocsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const { data: docs, isLoading, isError, refetch, isRefetching } = useMyLegalDocs();

  if (isError) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ErrorState message="No se pudieron cargar tus documentos." onRetry={refetch} />
      </SafeAreaView>
    );
  }

  const isEmpty = (docs ?? []).length === 0;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#2563EB" />
        </View>
      ) : (
        <FlatList<LegalDocSummary>
          data={docs ?? []}
          keyExtractor={(item) => item.id}
          removeClippedSubviews
          ListHeaderComponent={
            <View style={styles.notice}>
              <Ionicons name="time-outline" size={15} color="#92400E" style={{ marginRight: 8 }} />
              <Text style={styles.noticeText}>{LEGAL_DOC_RETENTION_NOTICE}</Text>
            </View>
          }
          renderItem={({ item }) => (
            <DocItem
              item={item}
              onPress={() => navigation.navigate('LegalDocDetail', { id: item.id })}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>Aún no tienes documentos</Text>
              <Text style={styles.emptyText}>
                Aquí se guardan las tutelas que generas desde una PQRSD vencida, en
                Seguimiento formal.
              </Text>
            </View>
          }
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#2563EB" />
          }
          contentContainerStyle={isEmpty ? styles.emptyFill : styles.listContent}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyFill: { flexGrow: 1 },
  listContent: { paddingBottom: 24 },
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFBEB',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
    padding: 12,
    margin: 16,
    marginBottom: 12,
  },
  noticeText: { flex: 1, fontSize: 12, color: '#92400E', lineHeight: 17 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 12,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardBody: { flex: 1, marginRight: 8 },
  title: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 3 },
  date: { fontSize: 12, color: '#9CA3AF' },
  expiry: { fontSize: 12, color: '#92400E', marginTop: 2 },
  emptyBox: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: '#374151', marginBottom: 6 },
  emptyText: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', lineHeight: 19 },
});
