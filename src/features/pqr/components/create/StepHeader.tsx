import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Props {
  step: number;
  total?: number;
  title: string;
  optional?: boolean;
}

export function StepHeader({ step, total = 5, title, optional }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{step}</Text>
      </View>
      <View style={styles.textBlock}>
        <Text style={styles.meta}>
          Paso {step} de {total}{optional ? ' · Opcional' : ''}
        </Text>
        <Text style={styles.title}>{title}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  badge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  badgeText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  textBlock: { flex: 1 },
  meta: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  title: { fontSize: 18, fontWeight: '700', color: '#111827' },
});
