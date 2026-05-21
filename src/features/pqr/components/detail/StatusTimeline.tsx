import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { statusMap } from '@core/types';
import type { PQRStatusHistoryEntry, PQRSStatus } from '@core/types';
import { styles } from './pqrDetailStyles';

const STATUS_ICON: Record<PQRSStatus, keyof typeof Ionicons.glyphMap> = {
  PENDING: 'document-outline',
  IN_PROGRESS: 'refresh-outline',
  RESOLVED: 'checkmark-circle-outline',
  REJECTED: 'close-circle-outline',
};

export function StatusTimeline({ history }: { history: PQRStatusHistoryEntry[] }) {
  if (history.length === 0) return null;
  return (
    <View style={timelineStyles.container}>
      <Text style={styles.sectionTitle}>Seguimiento</Text>
      {history.map((entry, idx) => {
        const isLast = idx === history.length - 1;
        const statusInfo = statusMap[entry.status] ?? { label: entry.status ?? '—' };
        const iconName = STATUS_ICON[entry.status] ?? 'ellipse-outline';
        const ts = new Date(entry.createdAt).getTime();
        const dateLabel = Number.isFinite(ts)
          ? new Date(ts).toLocaleDateString('es-CO', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })
          : '';
        return (
          <View key={entry.id} style={timelineStyles.row}>
            <View style={timelineStyles.lineCol}>
              <View style={[timelineStyles.dot, isLast && timelineStyles.dotActive]} />
              {!isLast && <View style={timelineStyles.line} />}
            </View>
            <View style={timelineStyles.content}>
              <View style={timelineStyles.labelRow}>
                <Ionicons
                  name={iconName}
                  size={14}
                  color={isLast ? '#2563EB' : '#9CA3AF'}
                  style={{ marginRight: 4 }}
                />
                <Text
                  style={[timelineStyles.statusLabel, isLast && timelineStyles.statusLabelActive]}
                >
                  {statusInfo.label}
                </Text>
                {entry.user?.name ? (
                  <Text style={timelineStyles.actor}> · {entry.user.name}</Text>
                ) : null}
              </View>
              {entry.comment ? (
                <Text style={timelineStyles.comment}>{entry.comment}</Text>
              ) : null}
              {dateLabel ? <Text style={timelineStyles.date}>{dateLabel}</Text> : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const timelineStyles = StyleSheet.create({
  container: { marginBottom: 8 },
  row: { flexDirection: 'row', marginBottom: 0 },
  lineCol: { width: 28, alignItems: 'center' },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#D1D5DB',
    borderWidth: 2,
    borderColor: '#D1D5DB',
    marginTop: 2,
  },
  dotActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  line: { width: 2, flex: 1, backgroundColor: '#E5E7EB', marginTop: 2, marginBottom: 0, minHeight: 20 },
  content: { flex: 1, paddingBottom: 16, paddingLeft: 8 },
  labelRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginBottom: 2 },
  statusLabel: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  statusLabelActive: { color: '#2563EB' },
  actor: { fontSize: 12, color: '#9CA3AF' },
  comment: { fontSize: 13, color: '#374151', lineHeight: 18, marginBottom: 3 },
  date: { fontSize: 11, color: '#9CA3AF' },
});
