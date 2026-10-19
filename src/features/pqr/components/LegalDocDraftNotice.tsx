import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LEGAL_DOC_DRAFT_NOTICE } from '@features/pqr/utils/legalDocsCopy';

/**
 * Aviso de que el documento es un borrador redactado con IA. Va encima del
 * texto de una tutela o de un oficio, para que se lea antes que el documento.
 * Mismo aspecto que en la web (`LegalDocumentDraftNotice`).
 */
export function LegalDocDraftNotice({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.box, style]}>
      <Ionicons name="warning-outline" size={16} color="#92400E" style={styles.icon} />
      <Text style={styles.text}>{LEGAL_DOC_DRAFT_NOTICE}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFBEB',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
    padding: 12,
    marginHorizontal: 16,
    marginTop: 12,
  },
  icon: { marginRight: 8, marginTop: 1 },
  text: { flex: 1, fontSize: 12, color: '#92400E', lineHeight: 17 },
});
