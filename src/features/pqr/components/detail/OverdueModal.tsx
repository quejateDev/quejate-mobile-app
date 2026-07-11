import React from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  visible: boolean;
  daysExceeded: number;
  onConfirmResolved: () => void;
  onStartFollowup: () => void;
  onDismiss: () => void;
}

export function OverdueModal({
  visible,
  daysExceeded,
  onConfirmResolved,
  onStartFollowup,
  onDismiss,
}: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        {/* maxHeight + scroll: con fuentes del sistema grandes el contenido puede
            superar la pantalla; al estar centrado se recortaría por ambos extremos
            y las opciones quedarían inalcanzables. */}
        <View style={styles.modal}>
          {/* El indicador de scroll queda visible: es la única pista de que hay
              más contenido cuando el modal se desborda con fuentes grandes. */}
          <ScrollView>
            <View style={styles.headerRow}>
              <Ionicons name="warning" size={22} color="#D97706" />
              <Text style={styles.title}>Tiempo de respuesta excedido</Text>
              <View style={{ flex: 1 }} />
              <TouchableOpacity
                onPress={onDismiss}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityLabel="Cerrar"
              >
                <Ionicons name="close" size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.alertBox}>
              <Ionicons name="time-outline" size={18} color="#B45309" style={{ marginRight: 8 }} />
              <Text style={styles.alertText}>
                Tu PQRSD ha excedido el tiempo de respuesta por {daysExceeded} día
                {daysExceeded === 1 ? '' : 's'} hábil{daysExceeded === 1 ? '' : 'es'}
              </Text>
            </View>

            <Text style={styles.question}>
              ¿Has recibido una respuesta a tu solicitud o deseas realizar un seguimiento?
            </Text>

            <TouchableOpacity
              style={styles.optionGreen}
              onPress={onConfirmResolved}
              accessibilityRole="button"
            >
              <Ionicons name="checkmark-circle" size={24} color="#16A34A" style={{ marginRight: 12 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.optionTitleGreen}>Ya recibí respuesta</Text>
                <Text style={styles.optionSubtitleGreen}>
                  Marcar como resuelta y finalizar la solicitud
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.optionBlue}
              onPress={onStartFollowup}
              accessibilityRole="button"
            >
              <Ionicons name="document-text" size={24} color="#2563EB" style={{ marginRight: 12 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.optionTitleBlue}>No he recibido respuesta</Text>
                <Text style={styles.optionSubtitleBlue}>Iniciar proceso de seguimiento formal</Text>
              </View>
            </TouchableOpacity>

            <View style={styles.dismissRow}>
              <TouchableOpacity
                style={styles.dismissBtn}
                onPress={onDismiss}
                accessibilityRole="button"
              >
                <Text style={styles.dismissText}>Revisar más tarde</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 18,
    maxHeight: '85%',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#92400E',
    flexShrink: 1,
  },
  alertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderColor: '#FCD34D',
    borderWidth: 1,
    borderLeftWidth: 4,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
  },
  alertText: {
    flex: 1,
    fontSize: 13,
    color: '#B45309',
    fontWeight: '600',
    lineHeight: 18,
  },
  question: {
    fontSize: 13,
    color: '#374151',
    marginBottom: 12,
    lineHeight: 19,
  },
  optionGreen: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC',
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
  },
  optionTitleGreen: {
    fontSize: 14,
    fontWeight: '700',
    color: '#166534',
    marginBottom: 2,
  },
  optionSubtitleGreen: {
    fontSize: 12,
    color: '#16A34A',
    lineHeight: 16,
  },
  optionBlue: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    marginBottom: 14,
  },
  optionTitleBlue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E3A8A',
    marginBottom: 2,
  },
  optionSubtitleBlue: {
    fontSize: 12,
    color: '#2563EB',
    lineHeight: 16,
  },
  dismissRow: {
    alignItems: 'flex-end',
  },
  dismissBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  dismissText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '600',
  },
});
