import React from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { ErrorState } from '@shared/components/ui/ErrorState';
import type { AppStackParamList } from '@navigation/navigationRef';
import { useLegalDoc } from '@features/pqr/hooks/useLegalDocs';
import { usePdfDownload } from '@features/pqr/hooks/usePdfDownload';
import { downloadLegalDocPdf } from '@features/pqr/utils/legalDocShare';
import { formatLegalDocDate } from '@features/pqr/utils/legalDocsCopy';

type Route = RouteProp<AppStackParamList, 'LegalDocDetail'>;

export default function LegalDocDetailScreen() {
  const { id } = useRoute<Route>().params;
  const { data: doc, isLoading, isError, refetch } = useLegalDoc(id);
  const pdf = usePdfDownload();

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.center}>
          <ActivityIndicator color="#2563EB" />
        </View>
      </SafeAreaView>
    );
  }

  if (isError || !doc) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        {/* Un 404 aquí suele ser un documento que ya expiró, no un error de red. */}
        <ErrorState
          message="Este documento ya no está disponible."
          onRetry={refetch}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={2}>{doc.title}</Text>
        <Text style={styles.expiry}>
          Disponible hasta {formatLegalDocDate(doc.expiresAt)}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.text} selectable>
          {doc.content}
        </Text>
      </ScrollView>

      <View style={styles.actions}>
        {/* Un solo botón: la hoja del sistema ya ofrece guardar y enviar. */}
        <TouchableOpacity
          style={[styles.primaryBtn, pdf.busy !== null && styles.btnDisabled]}
          onPress={() =>
            void pdf.run(
              'pdf',
              () => downloadLegalDocPdf(doc.id),
              'Guardar o compartir el documento',
            )
          }
          disabled={pdf.busy !== null}
        >
          {pdf.busy !== null ? (
            <ActivityIndicator size="small" color="#fff" style={{ marginRight: 6 }} />
          ) : (
            <Ionicons name="document-outline" size={16} color="#fff" style={{ marginRight: 6 }} />
          )}
          <Text style={styles.primaryBtnText}>Guardar o compartir el PDF</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          onPress={() => void Share.share({ message: doc.content })}
          disabled={pdf.busy !== null}
        >
          <Text style={[styles.linkBtnText, pdf.busy !== null && styles.btnDisabled]}>
            Compartir texto
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10 },
  title: { fontSize: 17, fontWeight: '700', color: '#111827' },
  expiry: { fontSize: 12, color: '#92400E', marginTop: 4 },
  scroll: { padding: 16, paddingTop: 4 },
  text: { fontSize: 13, color: '#374151', lineHeight: 20 },
  actions: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 10 },
  primaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 10,
    paddingVertical: 12,
  },
  primaryBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  btnDisabled: { opacity: 0.5 },
  footer: { alignItems: 'center', paddingVertical: 12 },
  linkBtnText: { fontSize: 13, fontWeight: '600', color: '#2563EB' },
});
