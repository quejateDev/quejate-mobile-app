import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import type { AppStackParamList } from '@navigation/navigationRef';
import {
  DBFS_SILENCE,
  dbfsFromPower,
  dbfsToApproxDb,
  leqDbfs,
  nextEmaPower,
  powerFromDbfs,
} from '@features/pqr/utils/sonometer';

type Nav = NativeStackNavigationProp<AppStackParamList, 'Sonometro'>;
type RouteProps = NativeStackScreenProps<AppStackParamList, 'Sonometro'>['route'];

function levelColor(db: number): string {
  if (db >= 85) return '#DC2626'; // dañino
  if (db >= 70) return '#D97706'; // molesto
  return '#16A34A'; // tolerable
}

function levelLabel(db: number): string {
  if (db >= 85) return 'Nivel dañino';
  if (db >= 70) return 'Nivel molesto';
  return 'Nivel tolerable';
}

const recordingOptions = { ...RecordingPresets.LOW_QUALITY, isMeteringEnabled: true };

export default function SonometerScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProps>();
  const insets = useSafeAreaInsets();

  const recorder = useAudioRecorder(recordingOptions);
  const recorderState = useAudioRecorderState(recorder, 200);

  const [permission, setPermission] = useState<'unknown' | 'granted' | 'denied'>('unknown');
  const [measuring, setMeasuring] = useState(false);
  const [currentDb, setCurrentDb] = useState<number | null>(null); // en vivo (suavizado)
  const [avgDb, setAvgDb] = useState<number | null>(null); // Leq — lo que se adjunta
  const [peakDb, setPeakDb] = useState<number | null>(null); // pico instantáneo (informativo)
  // Acumuladores en dominio de ENERGÍA (potencia lineal = amplitud²).
  const emaPowerRef = useRef<number | null>(null);
  const sumPowerRef = useRef(0);
  const countRef = useRef(0);
  const peakDbfsRef = useRef(DBFS_SILENCE);
  const startingRef = useRef(false);

  // Detiene el recorder sin propagar errores. useAudioRecorder libera el objeto
  // nativo en el unmount y puede hacerlo ANTES de que llamemos stop(); si ya fue
  // liberado, stop() puede lanzar de forma SÍNCRONA → por eso el try/catch
  // envuelve también la llamada, no solo la promesa.
  const safeStop = useCallback(() => {
    try {
      // Promise.resolve cubre el rechazo async; el try/catch cubre un throw
      // SÍNCRONO de stop() cuando el objeto nativo ya fue liberado.
      void Promise.resolve(recorder.stop()).catch(() => {});
    } catch {
      // objeto nativo ya liberado: nada que detener
    }
  }, [recorder]);

  // Reaccionamos al metering (dBFS) que reporta el recorderState mientras grabamos.
  // En Android el metering es el PICO de la ventana, así que trabajamos en
  // potencia lineal: el promedio queda como un Leq real y los transitorios
  // (clic de tecla) dejan de dominar el número.
  useEffect(() => {
    if (!measuring) return;
    const metering = recorderState.metering;
    if (typeof metering !== 'number' || !Number.isFinite(metering)) return;

    const power = powerFromDbfs(metering);
    emaPowerRef.current = nextEmaPower(emaPowerRef.current, power);
    sumPowerRef.current += power;
    countRef.current += 1;
    peakDbfsRef.current = Math.max(peakDbfsRef.current, metering);

    setCurrentDb(dbfsToApproxDb(dbfsFromPower(emaPowerRef.current)));
    setAvgDb(dbfsToApproxDb(leqDbfs({ sumPower: sumPowerRef.current, count: countRef.current })));
    setPeakDb(dbfsToApproxDb(peakDbfsRef.current));
  }, [recorderState.metering, measuring]);

  // Detenemos la grabación si la pantalla se desmonta.
  useEffect(() => safeStop, [safeStop]);

  async function startMeasuring() {
    if (startingRef.current || measuring) return; // evita doble-tap durante el await
    startingRef.current = true;
    try {
      const status = await AudioModule.requestRecordingPermissionsAsync();
      if (!status.granted) {
        setPermission('denied');
        return;
      }
      setPermission('granted');
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      emaPowerRef.current = null;
      sumPowerRef.current = 0;
      countRef.current = 0;
      peakDbfsRef.current = DBFS_SILENCE;
      setCurrentDb(null);
      setAvgDb(null);
      setPeakDb(null);
      await recorder.prepareToRecordAsync(recordingOptions);
      recorder.record();
      setMeasuring(true);
    } catch {
      Alert.alert('Error', 'No se pudo iniciar la medición. Intenta de nuevo.');
    } finally {
      startingRef.current = false;
    }
  }

  function stopMeasuring() {
    safeStop();
    setMeasuring(false);
  }

  // Finaliza la grabación y arma el adjunto de audio de la medición. No sirve
  // como prueba pericial, pero da una idea del ruido medido. Best-effort: si algo
  // falla, devolvemos undefined y se continúa sin audio.
  async function stopAndCaptureAudio(): Promise<
    { uri: string; name: string; type: string; size: number } | undefined
  > {
    try {
      await recorder.stop(); // finaliza el archivo en disco
    } catch {
      // ya estaba detenido (p. ej. tras "Detener"): el archivo sigue válido
    }
    const uri = recorder.uri;
    if (!uri) return undefined;
    try {
      const blob = await (await fetch(uri)).blob();
      const ext = uri.split('.').pop()?.toLowerCase();
      const type =
        ext === 'm4a' ? 'audio/m4a' : ext === 'caf' ? 'audio/x-caf' : ext === 'wav' ? 'audio/wav' : 'audio/mp4';
      return {
        uri,
        name: `medicion_ruido_${Date.now()}.${ext ?? 'm4a'}`,
        type,
        size: blob.size,
      };
    } catch {
      return undefined;
    }
  }

  async function handleUseMeasurement() {
    // Adjuntamos el PROMEDIO (Leq), no el pico: es la métrica de ruido ambiental
    // y es robusta a transitorios puntuales.
    const reading = avgDb ?? currentDb;
    if (reading == null) {
      Alert.alert('Sin medición', 'Toma una medición de unos segundos antes de continuar.');
      return;
    }
    const noiseAudio = await stopAndCaptureAudio();
    navigation.navigate('CreatePQR', {
      entityNameHint: route.params?.entityNameHint,
      categoryHint: route.params?.categoryHint,
      categoryId: route.params?.categoryId,
      noiseLevelDb: reading,
      noiseAudio,
    });
  }

  function skipToForm() {
    safeStop();
    navigation.navigate('CreatePQR', {
      entityNameHint: route.params?.entityNameHint,
      categoryHint: route.params?.categoryHint,
      categoryId: route.params?.categoryId,
    });
  }

  const display = currentDb ?? 0;
  const color = levelColor(display);
  const meterFill = Math.max(0, Math.min(100, display - 30)); // escala [30,130] → 0–100%

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.content}>
        <Text style={styles.title}>Sonómetro</Text>
        <Text style={styles.subtitle}>
          Mide el nivel de ruido del lugar y adjúntalo a tu reporte de contaminación auditiva.
        </Text>

        {permission === 'denied' ? (
          <View style={styles.permissionBox}>
            <Ionicons name="mic-off-outline" size={40} color="#9CA3AF" style={{ marginBottom: 12 }} />
            <Text style={styles.permissionTitle}>Micrófono no disponible</Text>
            <Text style={styles.permissionText}>
              Habilita el permiso de micrófono en los ajustes del sistema para medir el ruido.
            </Text>
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => Linking.openSettings()}>
              <Text style={styles.secondaryBtnText}>Abrir ajustes</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.meterBox}>
            <Text style={[styles.dbValue, { color }]}>
              {currentDb != null ? currentDb : '--'}
            </Text>
            <Text style={styles.dbUnit}>dB aprox.</Text>

            <View style={styles.meterTrack}>
              <View style={[styles.meterFill, { width: `${meterFill}%`, backgroundColor: color }]} />
            </View>

            {currentDb != null && (
              <Text style={[styles.levelLabel, { color }]}>{levelLabel(currentDb)}</Text>
            )}

            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Text style={styles.statLabel}>Promedio (Leq)</Text>
                <Text style={[styles.statValue, styles.statValueStrong]}>
                  {avgDb != null ? `${avgDb} dB` : '--'}
                </Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statLabel}>Pico</Text>
                <Text style={styles.statValue}>{peakDb != null ? `${peakDb} dB` : '--'}</Text>
              </View>
            </View>
          </View>
        )}

        <Text style={styles.disclaimer}>
          Se adjunta el promedio (Leq) de la medición, no el pico. Es una estimación SIN calibrar:
          depende del micrófono y del control de ganancia de cada equipo, por lo que sirve como
          referencia, no como prueba pericial. Mide unos segundos para un valor estable.
        </Text>
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        {permission !== 'denied' && (
          measuring ? (
            <TouchableOpacity style={[styles.primaryBtn, styles.stopBtn]} onPress={stopMeasuring}>
              <Ionicons name="stop" size={18} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.primaryBtnText}>Detener</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.primaryBtn} onPress={startMeasuring}>
              <Ionicons name="mic" size={18} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.primaryBtnText}>
                {avgDb != null ? 'Medir de nuevo' : 'Iniciar medición'}
              </Text>
            </TouchableOpacity>
          )
        )}

        <TouchableOpacity
          style={styles.continueBtn}
          onPress={handleUseMeasurement}
          disabled={avgDb == null}
        >
          <Text style={[styles.continueBtnText, avgDb == null && styles.continueBtnTextDisabled]}>
            Continuar con esta medición
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.skipBtn} onPress={skipToForm}>
          <Text style={styles.skipBtnText}>Continuar sin medir</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB', justifyContent: 'space-between' },
  content: { padding: 20 },
  title: { fontSize: 24, fontWeight: '800', color: '#111827' },
  subtitle: { fontSize: 14, color: '#6B7280', marginTop: 6, lineHeight: 20 },
  meterBox: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 28,
    paddingHorizontal: 20,
    marginTop: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  dbValue: { fontSize: 64, fontWeight: '800', lineHeight: 70 },
  dbUnit: { fontSize: 14, color: '#9CA3AF', fontWeight: '600', marginTop: -2 },
  meterTrack: {
    width: '100%',
    height: 10,
    borderRadius: 5,
    backgroundColor: '#E5E7EB',
    marginTop: 20,
    overflow: 'hidden',
  },
  meterFill: { height: '100%', borderRadius: 5 },
  levelLabel: { fontSize: 15, fontWeight: '700', marginTop: 14 },
  statsRow: { flexDirection: 'row', gap: 32, marginTop: 20 },
  stat: { alignItems: 'center' },
  statLabel: { fontSize: 12, color: '#9CA3AF', fontWeight: '600' },
  statValue: { fontSize: 16, color: '#111827', fontWeight: '700', marginTop: 2 },
  statValueStrong: { color: '#2563EB' },
  disclaimer: { fontSize: 12, color: '#9CA3AF', marginTop: 20, lineHeight: 17 },
  permissionBox: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    marginTop: 24,
    alignItems: 'center',
  },
  permissionTitle: { fontSize: 16, fontWeight: '700', color: '#374151', marginBottom: 6 },
  permissionText: { fontSize: 14, color: '#9CA3AF', textAlign: 'center', lineHeight: 20 },
  footer: { paddingHorizontal: 20, gap: 10 },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 15,
  },
  stopBtn: { backgroundColor: '#DC2626' },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  continueBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 15,
    borderWidth: 1.5,
    borderColor: '#2563EB',
  },
  continueBtnText: { color: '#2563EB', fontSize: 16, fontWeight: '700' },
  continueBtnTextDisabled: { color: '#9CA3AF' },
  secondaryBtn: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#2563EB',
    borderRadius: 8,
  },
  secondaryBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  skipBtn: { alignItems: 'center', paddingVertical: 8 },
  skipBtnText: { color: '#6B7280', fontSize: 14, fontWeight: '600' },
});
