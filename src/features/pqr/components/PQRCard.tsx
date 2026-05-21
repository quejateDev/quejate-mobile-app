import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { PQRS, PQRSStatus } from '@core/types';
import { typeMap, statusMap } from '@core/types';

const STATUS_COLORS: Record<PQRSStatus, { bg: string; text: string }> = {
  PENDING:     { bg: '#FEF3C7', text: '#D97706' },
  IN_PROGRESS: { bg: '#DBEAFE', text: '#2563EB' },
  RESOLVED:    { bg: '#DCFCE7', text: '#16A34A' },
  REJECTED:    { bg: '#FEE2E2', text: '#991B1B' },
};

interface Props {
  pqr: PQRS;
  onPress: () => void;
}

function PQRCardBase({ pqr, onPress }: Props) {
  const type = typeMap[pqr.type] ?? { label: pqr.type ?? '—', color: '#6B7280' };
  const status = statusMap[pqr.status] ?? { label: pqr.status ?? '—' };
  const statusColors = STATUS_COLORS[pqr.status] ?? { bg: '#F3F4F6', text: '#6B7280' };
  const authorName = pqr.anonymous ? 'Anónimo' : (pqr.creator?.name ?? 'Desconocido');
  const dueTime = pqr.dueDate ? new Date(pqr.dueDate).getTime() : NaN;
  const daysLeft = Number.isFinite(dueTime) ? Math.ceil((dueTime - Date.now()) / 86400000) : NaN;
  const isExpired = Number.isFinite(daysLeft) && daysLeft < 0;
  const isExpiringSoon = Number.isFinite(daysLeft) && daysLeft <= 3;
  const likes = pqr._count?.likes ?? 0;
  const comments = pqr._count?.comments ?? 0;
  const entityName = pqr.entity?.name ?? '';

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={`Ver PQRSD: ${pqr.subject ?? pqr.type}`}
    >
      <View style={styles.header}>
        <View style={[styles.typeBadge, { backgroundColor: type.color + '18' }]}>
          <Text style={[styles.typeBadgeText, { color: type.color }]}>{type.label}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}>
          <Text style={[styles.statusBadgeText, { color: statusColors.text }]}>{status.label}</Text>
        </View>
        {isExpiringSoon && (
          <View style={styles.dueBadge}>
            <Text style={styles.dueBadgeText}>{isExpired ? 'Vencida' : daysLeft === 0 ? 'Hoy' : `${daysLeft}d`}</Text>
          </View>
        )}
      </View>

      {pqr.subject ? (
        <Text style={styles.subject} numberOfLines={2}>{pqr.subject}</Text>
      ) : null}
      {pqr.description ? (
        <Text style={styles.description} numberOfLines={3}>{pqr.description}</Text>
      ) : null}

      <View style={styles.meta}>
        <Text style={styles.metaText} numberOfLines={1}>
          {authorName}
          {entityName ? `  ·  ${entityName}` : ''}
          {pqr.department?.name ? `  ·  ${pqr.department.name}` : ''}
        </Text>
      </View>

      <View style={styles.footer}>
        <View style={styles.counter}>
          <Ionicons name="heart-outline" size={14} color="#9CA3AF" />
          <Text style={styles.counterText}>{likes}</Text>
        </View>
        <View style={styles.counter}>
          <Ionicons name="chatbubble-outline" size={13} color="#9CA3AF" />
          <Text style={styles.counterText}>{comments}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const PQRCard = React.memo(PQRCardBase);
export default PQRCard;

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 99,
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  statusBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 99,
  },
  statusBadgeText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  dueBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 99,
  },
  dueBadgeText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '700',
  },
  subject: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
    lineHeight: 20,
  },
  description: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 19,
    marginBottom: 10,
  },
  meta: {
    marginBottom: 10,
  },
  metaText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  footer: {
    flexDirection: 'row',
    gap: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 10,
  },
  counter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  counterText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
});
