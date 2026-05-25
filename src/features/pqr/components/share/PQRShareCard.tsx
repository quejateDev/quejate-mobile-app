import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import type { PQRS } from '@core/types';
import { typeMap, statusMap } from '@core/types';

const LOGO = require('../../../../../assets/LogotipoEditableterpng.png');

type SharePQR = Pick<
  PQRS,
  'id' | 'type' | 'status' | 'subject' | 'description' | 'entity' | 'dueDate'
>;

interface Props {
  pqr: SharePQR;
  imageUri?: string | null;
  onImageLoad?: () => void;
}

export const PQRShareCard = React.forwardRef<View, Props>(function PQRShareCard(
  { pqr, imageUri, onImageLoad },
  ref,
) {
  const type = typeMap[pqr.type] ?? { label: pqr.type ?? '—', color: '#6B7280' };
  const status = statusMap[pqr.status] ?? { label: pqr.status ?? '—' };
  const dueTime = pqr.dueDate ? new Date(pqr.dueDate).getTime() : NaN;
  const isExpired = Number.isFinite(dueTime) && dueTime < Date.now();

  return (
    <View ref={ref} collapsable={false} style={styles.card}>
      <View style={styles.header}>
        <Image source={LOGO} style={styles.logo} resizeMode="contain" />
        <View style={[styles.typePill, { backgroundColor: type.color }]}>
          <Text style={styles.typePillText}>{type.label}</Text>
        </View>
      </View>

      {imageUri ? (
        <Image
          source={{ uri: imageUri }}
          style={styles.banner}
          resizeMode="cover"
          onLoad={onImageLoad}
        />
      ) : null}

      <View style={styles.body}>
        <View style={styles.badgeRow}>
          <View style={styles.statusBadge}>
            <Text style={styles.statusBadgeText}>{status.label}</Text>
          </View>
          {isExpired ? (
            <View style={styles.overdueBadge}>
              <Text style={styles.overdueBadgeText}>Tiempo excedido</Text>
            </View>
          ) : null}
        </View>

        {pqr.subject ? (
          <Text style={styles.subject} numberOfLines={3}>
            {pqr.subject}
          </Text>
        ) : null}
        {pqr.entity?.name ? (
          <Text style={styles.entity} numberOfLines={1}>
            {pqr.entity.name}
          </Text>
        ) : null}
        {pqr.description ? (
          <Text style={styles.description} numberOfLines={4}>
            {pqr.description}
          </Text>
        ) : null}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Reporta y haz seguimiento en</Text>
        <Text style={styles.footerBrand}>quejate.com.co</Text>
      </View>
    </View>
  );
});

const CARD_WIDTH = 360;

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    backgroundColor: '#fff',
    borderRadius: 0,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 12,
  },
  logo: {
    width: 130,
    height: 34,
  },
  typePill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
  },
  typePillText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  banner: {
    width: CARD_WIDTH,
    height: 200,
    backgroundColor: '#F3F4F6',
  },
  body: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 6,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  statusBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeText: {
    color: '#2563EB',
    fontSize: 12,
    fontWeight: '700',
  },
  overdueBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  overdueBadgeText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '700',
  },
  subject: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    lineHeight: 24,
    marginBottom: 6,
  },
  entity: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563EB',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingHorizontal: 18,
    paddingVertical: 14,
    marginTop: 8,
  },
  footerText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  footerBrand: {
    fontSize: 12,
    color: '#2563EB',
    fontWeight: '800',
  },
});
