import React from 'react';
import { View, Text } from 'react-native';
import { styles } from './createPQRStyles';

interface Props {
  label: string;
  value: string;
}

export function SummaryRow({ label, value }: Props) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}
