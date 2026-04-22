import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { PQRS } from '@core/types';
import { typeMap, statusMap } from '@core/types';

interface Props {
  pqr: PQRS;
  onPress: () => void;
}

export default function PQRCard({ pqr, onPress }: Props) {
  const type = typeMap[pqr.type];
  const status = statusMap[pqr.status];
  const authorName = pqr.anonymous ? 'Anónimo' : (pqr.creator?.name ?? 'Desconocido');
  const daysLeft = Math.ceil((new Date(pqr.dueDate).getTime() - Date.now()) / 86400000);
  const isExpired = daysLeft < 0;
  const isExpiringSoon = daysLeft <= 3;
  const likes = pqr._count?.likes ?? 0;
  const comments = pqr._count?.comments ?? 0;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.header}>
        <View style={[styles.typeBadge, { backgroundColor: type.color + '18' }]}>
          <Text style={[styles.typeBadgeText, { color: type.color }]}>{type.label}</Text>
        </View>
        <View style={styles.statusBadge}>
          <Text style={styles.statusBadgeText}>{status.label}</Text>
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
          {'  ·  '}
          {pqr.entity.name}
          {pqr.department ? `  ·  ${pqr.department.name}` : ''}
        </Text>
      </View>

      <View style={styles.footer}>
        <View style={styles.counter}>
          <Text style={styles.counterIcon}>♡</Text>
          <Text style={styles.counterText}>{likes}</Text>
        </View>
        <View style={styles.counter}>
          <Text style={styles.counterIcon}>○</Text>
          <Text style={styles.counterText}>{comments}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

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
  counterIcon: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  counterText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
});
