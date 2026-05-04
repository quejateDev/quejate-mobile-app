import React, { Dispatch, SetStateAction } from 'react';
import { View, Text, TouchableOpacity, Modal, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MiniMap } from '@features/map/components/MiniMap';
import { styles } from './createPQRStyles';

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

  return (
    <View testID="step4-content">
      <Text style={styles.stepTitle}>Paso 4 — Ubicación en el mapa (opcional)</Text>
      <Text style={styles.stepHint}>
        Marca dónde ocurrió el problema. Este paso es opcional.
      </Text>

      <View style={styles.locationCard}>
        {pinAddress ? (
          <Text style={styles.locationCardText} numberOfLines={3}>{pinAddress}</Text>
        ) : pinLatitude != null && pinLongitude != null ? (
          <Text style={styles.locationCardText}>
            {pinLatitude.toFixed(5)}, {pinLongitude.toFixed(5)}
          </Text>
        ) : (
          <Text style={styles.locationCardEmpty}>Sin ubicación seleccionada</Text>
        )}
        <TouchableOpacity
          style={styles.locationCardBtn}
          onPress={() => setMapModalVisible(true)}
          activeOpacity={0.8}
        >
          <Text style={styles.locationCardBtnText}>
            {pinLatitude != null ? 'Cambiar ubicación' : 'Seleccionar en mapa'}
          </Text>
        </TouchableOpacity>
      </View>

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
              <Text style={styles.mapModalBack}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.mapModalTitle}>Seleccionar ubicación</Text>
            <TouchableOpacity
              onPress={() => setMapModalVisible(false)}
              disabled={pinLatitude == null}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={[styles.mapModalDone, pinLatitude == null && styles.mapModalDoneDisabled]}>
                Listo
              </Text>
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
