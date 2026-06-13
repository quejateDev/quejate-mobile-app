import { useCallback, useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';
import { useDepartments, useMunicipalities } from '@features/pqr/hooks/useLocations';
import { findByName } from '@shared/utils/geoMatch';

/** Filtro por ubicación para la pestaña "Entidades". Reusa el mismo matcher
 *  difuso (normalize/findByName) y el flujo de expo-location de EntitySelector:
 *  permiso → posición → reverseGeocode → cruce nombre→ID contra
 *  /regional-departments y /municipalities.
 *
 *  departmentId = regionalDepartmentId (geográfico); municipalityId tiene
 *  prioridad. Si el permiso es denegado o no hay match, no se aplica filtro
 *  (nunca bloquea la pantalla).
 *
 *  Auto-detecta una vez al montar (cuando los departamentos ya cargaron); el
 *  ciudadano puede limpiar el filtro ("ver todas") o volver a detectar. */
export function useEntityLocationFilter() {
  const { departments } = useDepartments();
  const [departmentId, setDepartmentId] = useState<string | undefined>();
  const [municipalityId, setMunicipalityId] = useState<string | undefined>();
  const [label, setLabel] = useState<string | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [pendingCity, setPendingCity] = useState<string | null>(null);
  const autoTriedRef = useRef(false);

  const { municipalities } = useMunicipalities(departmentId);

  // Cuando los municipios del departamento detectado cargan, intentamos cruzar
  // la ciudad. Si no hay match, queda el filtro a nivel departamento.
  useEffect(() => {
    if (!pendingCity || municipalities.length === 0) return;
    const match = findByName(municipalities, pendingCity);
    if (match) {
      setMunicipalityId(match.id);
      setLabel(match.name);
    }
    setPendingCity(null);
  }, [municipalities, pendingCity]);

  const detect = useCallback(async (): Promise<boolean> => {
    setDetecting(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return false;
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const results = await Location.reverseGeocodeAsync({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      });
      const r = results[0];
      if (!r) return false;
      const region = r.region ?? r.subregion ?? '';
      const city = r.city ?? r.district ?? r.subregion ?? '';
      const depMatch = region ? findByName(departments, region) : undefined;
      if (!depMatch) return false;
      setDepartmentId(depMatch.id);
      setMunicipalityId(undefined);
      setLabel(city || depMatch.name);
      setPendingCity(city || null);
      return true;
    } catch {
      return false;
    } finally {
      setDetecting(false);
    }
  }, [departments]);

  // Auto-detección inicial (una sola vez, cuando ya hay departamentos para cruzar).
  useEffect(() => {
    if (autoTriedRef.current) return;
    if (departments.length === 0) return;
    autoTriedRef.current = true;
    void detect();
  }, [departments, detect]);

  const clear = useCallback(() => {
    setDepartmentId(undefined);
    setMunicipalityId(undefined);
    setLabel(null);
    setPendingCity(null);
  }, []);

  return {
    departmentId,
    municipalityId,
    label,
    detecting,
    isActive: !!departmentId,
    detect,
    clear,
  };
}
