import React, { Dispatch, SetStateAction } from 'react';
import { StepHeader } from './StepHeader';
import { View, Text, TouchableOpacity, Modal, Dimensions, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Marker } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { MiniMap } from '@features/map/components/MiniMap';
import { styles } from './createPQRStyles';

const SANTA_MARTA = {
  latitude: 11.2408,
  longitude: -74.199,
  latitudeDelta: 0.18,
  longitudeDelta: 0.18,
};

interface Props {
  pinLatitude: number | null;
  pinLongitude: number | null;
  pinAddress: string | null;
  mapModalVisible: boolean;
  setMapModalVisible: Dispatch<SetStateAction<boolean>>;
  onLocationChange: (lat: number | null, lng: number | null, addr: string | null) => void;
}

export function LocationPicker({
  pinLatitude,
  pinLongitude,
  pinAddress,
  mapModalVisible,
  setMapModalVisible,
  onLocationChange,
}: Props) {
  const insets = useSafeAreaInsets();
  const hasPin = pinLatitude != null && pinLongitude != null;

  const region = hasPin
    ? {
        latitude: pinLatitude!,
        longitude: pinLongitude!,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }
    : SANTA_MARTA;

  return (
    <View testID="step4-content">
      <StepHeader step={4} title="Ubicación en el mapa" optional />
      <Text style={styles.stepHint}>
        La ubicación es opcional. Si tu PQRSD es pública, las coordenadas serán visibles en el mapa ciudadano.
      </Text>

      <TouchableOpacity
        testID="open-map-modal"
        accessibilityLabel="Seleccionar en mapa"
        style={previewStyles.mapPreviewContainer}
        onPress={() => setMapModalVisible(true)}
        activeOpacity={0.92}
      >
        <MapView
          style={previewStyles.mapPreview}
          region={region}
          scrollEnabled={false}
          zoomEnabled={false}
          pitchEnabled={false}
          rotateEnabled={false}
          pointerEvents="none"
        >
          {hasPin && (
            <Marker coordinate={{ latitude: pinLatitude!, longitude: pinLongitude! }} />
          )}
        </MapView>

        {!hasPin && (
          <View style={previewStyles.emptyOverlay}>
            <View style={previewStyles.emptyBadge}>
              <Ionicons name="location-outline" size={22} color="#2563EB" />
              <Text style={previewStyles.emptyTitle}>Toca para seleccionar ubicación</Text>
              <Text style={previewStyles.emptySubtitle}>Santa Marta, Colombia</Text>
            </View>
          </View>
        )}

        <View style={previewStyles.mapOverlay}>
          <View style={previewStyles.mapOverlayLeft}>
            <Ionicons
              name={hasPin ? 'location' : 'map-outline'}
              size={16}
              color={hasPin ? '#16A34A' : '#6B7280'}
              style={{ marginRight: 6 }}
            />
            {hasPin ? (
              pinAddress ? (
                <Text style={previewStyles.mapAddress} numberOfLines={2}>
                  {pinAddress}
                </Text>
              ) : (
                <Text style={previewStyles.mapCoords}>
                  {pinLatitude!.toFixed(5)}, {pinLongitude!.toFixed(5)}
                </Text>
              )
            ) : (
              <Text style={previewStyles.mapCoords}>Sin ubicación seleccionada</Text>
            )}
          </View>
          <Text style={previewStyles.mapChangeBtn}>{hasPin ? 'Cambiar' : 'Abrir'}</Text>
        </View>
      </TouchableOpacity>

      {hasPin && (
        <TouchableOpacity
          style={previewStyles.clearRow}
          onPress={() => onLocationChange(null, null, null)}
        >
          <Ionicons name="close-circle-outline" size={16} color="#DC2626" style={{ marginRight: 4 }} />
          <Text style={previewStyles.clearText}>Quitar ubicación</Text>
        </TouchableOpacity>
      )}

      <Modal
        visible={mapModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setMapModalVisible(false)}
      >
        <View style={[styles.mapModalContainer, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          <View style={styles.mapModalHeader}>
            <TouchableOpacity
              onPress={() => setMapModalVisible(false)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
            <Text style={styles.mapModalTitle}>Seleccionar ubicación</Text>
            <TouchableOpacity
              onPress={() => setMapModalVisible(false)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.mapModalDone}>Listo</Text>
            </TouchableOpacity>
          </View>
          <View style={{ flex: 1 }}>
            <MiniMap
              latitude={pinLatitude}
              longitude={pinLongitude}
              mapHeight={Dimensions.get('window').height - insets.top - insets.bottom - 140}
              onLocationChange={onLocationChange}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const previewStyles = StyleSheet.create({
  mapPreviewContainer: {
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 4,
    marginHorizontal: -4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    height: 320,
    backgroundColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  mapPreview: { width: '100%', height: '100%' },
  emptyOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  emptyBadge: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginTop: 6,
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  mapOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255,255,255,0.96)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  mapOverlayLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  mapAddress: { flex: 1, fontSize: 12, color: '#374151', lineHeight: 16 },
  mapCoords: { flex: 1, fontSize: 12, color: '#6B7280' },
  mapChangeBtn: { fontSize: 13, color: '#2563EB', fontWeight: '700' },
  clearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginTop: 4,
  },
  clearText: { fontSize: 13, color: '#DC2626', fontWeight: '600' },
});
