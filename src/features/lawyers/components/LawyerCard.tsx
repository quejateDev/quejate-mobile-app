import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { Lawyer } from '@core/types';
import { RatingStars } from './RatingStars';

function getInitials(name: string): string {
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export function LawyerCard({ lawyer, onPress }: { lawyer: Lawyer; onPress: () => void }) {
  const { user } = lawyer;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.row}>
        {user.image ? (
          <Image source={{ uri: user.image }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarText}>{getInitials(user.name)}</Text>
          </View>
        )}

        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>{user.name}</Text>
            {lawyer.isVerified && (
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedText}>Verificado</Text>
              </View>
            )}
          </View>

          <View style={styles.ratingRow}>
            <RatingStars score={lawyer.averageRating} size={13} />
            <Text style={styles.ratingText}>
              {lawyer.averageRating.toFixed(1)} ({lawyer.ratingCount})
            </Text>
          </View>

          {lawyer.specialties.length > 0 && (
            <Text style={styles.specialties} numberOfLines={1}>
              {lawyer.specialties.slice(0, 2).join(' · ')}
            </Text>
          )}
        </View>

        {lawyer.feePerHour != null && (
          <View style={styles.feeBox}>
            <Text style={styles.feeAmount}>${lawyer.feePerHour.toLocaleString()}</Text>
            <Text style={styles.feeLabel}>/hora</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
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
  row: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 52, height: 52, borderRadius: 26, marginRight: 12 },
  avatarFallback: {
    width: 52, height: 52, borderRadius: 26, backgroundColor: '#2563EB',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  avatarText: { fontSize: 18, fontWeight: '700', color: '#fff' },
  info: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  name: { fontSize: 15, fontWeight: '700', color: '#111827', flexShrink: 1 },
  verifiedBadge: {
    backgroundColor: '#DCFCE7', borderRadius: 99, paddingHorizontal: 6, paddingVertical: 1,
  },
  verifiedText: { fontSize: 10, color: '#16A34A', fontWeight: '600' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 3 },
  ratingText: { fontSize: 12, color: '#6B7280' },
  specialties: { fontSize: 12, color: '#9CA3AF' },
  feeBox: { alignItems: 'flex-end', marginLeft: 8 },
  feeAmount: { fontSize: 15, fontWeight: '700', color: '#2563EB' },
  feeLabel: { fontSize: 11, color: '#6B7280' },
});
