import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';
import type { MapPressEvent } from 'react-native-maps';
import * as Location from 'expo-location';

interface MiniMapProps {
  latitude: number | null;
  longitude: number | null;
  onLocationChange: (lat: number | null, lng: number | null, address: string | null) => void;
  mapHeight?: number;
}

const COLOMBIA_REGION: Region = {
  latitude: 4.711,
  longitude: -74.0721,
  latitudeDelta: 8,
  longitudeDelta: 8,
};

export function MiniMap({ latitude, longitude, onLocationChange, mapHeight = 250 }: MiniMapProps) {
  const mapRef = useRef<MapView>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);

  async function reverseGeocode(lat: number, lng: number) {
    setIsGeocoding(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
        {
          headers: {
            'Accept-Language': 'es',
            'User-Agent': 'QuejateApp/1.0',
          },
        },
      );
      const json = (await res.json()) as { display_name?: string };
      const addr = json.display_name ?? null;
      setAddress(addr);
      onLocationChange(lat, lng, addr);
    } catch {
      onLocationChange(lat, lng, null);
    } finally {
      setIsGeocoding(false);
    }
  }

  function handleMapPress(e: MapPressEvent) {
    const { latitude: lat, longitude: lng } = e.nativeEvent.coordinate;
    reverseGeocode(lat, lng);
  }

  async function handleMyLocation() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return;
    const loc = await Location.getCurrentPositionAsync({});
    const { latitude: lat, longitude: lng } = loc.coords;
    mapRef.current?.animateToRegion(
      { latitude: lat, longitude: lng, latitudeDelta: 0.01, longitudeDelta: 0.01 },
      500,
    );
    reverseGeocode(lat, lng);
  }

  function handleClearPin() {
    setAddress(null);
    onLocationChange(null, null, null);
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={[styles.map, { height: mapHeight }]}
        initialRegion={
          latitude != null && longitude != null
            ? { latitude, longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 }
            : COLOMBIA_REGION
        }
        onPress={handleMapPress}
      >
        {latitude != null && longitude != null && (
          <Marker coordinate={{ latitude, longitude }} />
        )}
      </MapView>

      <View style={styles.controls}>
        <TouchableOpacity style={styles.locationBtn} onPress={handleMyLocation}>
          <Text style={styles.locationBtnText}>Mi ubicación</Text>
        </TouchableOpacity>
        {latitude != null && (
          <TouchableOpacity style={styles.clearBtn} onPress={handleClearPin}>
            <Text style={styles.clearBtnText}>Quitar pin</Text>
          </TouchableOpacity>
        )}
      </View>

      {isGeocoding && (
        <View style={styles.statusRow}>
          <ActivityIndicator size="small" color="#2563EB" />
          <Text style={styles.statusText}>Obteniendo dirección…</Text>
        </View>
      )}
      {address != null && !isGeocoding && (
        <View style={styles.addressRow}>
          <Text style={styles.addressText} numberOfLines={2}>
            {address}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: '#E5E7EB' },
  map: { height: 250, width: '100%' },
  controls: {
    flexDirection: 'row',
    gap: 8,
    padding: 8,
    backgroundColor: '#fff',
  },
  locationBtn: {
    flex: 1,
    backgroundColor: '#2563EB',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  locationBtnText: { fontSize: 13, fontWeight: '600', color: '#fff' },
  clearBtn: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  clearBtnText: { fontSize: 13, fontWeight: '600', color: '#374151' },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingBottom: 8,
    backgroundColor: '#fff',
  },
  statusText: { fontSize: 12, color: '#6B7280' },
  addressRow: {
    backgroundColor: '#F0FDF4',
    borderTopWidth: 1,
    borderTopColor: '#BBF7D0',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  addressText: { fontSize: 12, color: '#15803D', lineHeight: 18 },
});
