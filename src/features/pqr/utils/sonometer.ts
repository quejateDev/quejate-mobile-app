/** Matemática del sonómetro, separada de la pantalla para poder probarla.
 *
 *  expo-audio entrega `metering` en dBFS (-160..0): en Android es el PICO de la
 *  ventana (maxAmplitude), en iOS el promedio RMS. Para un sonómetro de ruido
 *  ambiental trabajamos en DOMINIO DE ENERGÍA (potencia lineal) y reportamos un
 *  Leq (nivel equivalente), que es robusto a transitorios puntuales como el clic
 *  de una tecla. El número en vivo se suaviza con una EMA "slow".
 *
 *  La conversión dBFS→dB NO está calibrada a SPL: el offset sube/baja todo el
 *  rango y depende del micrófono y del AGC de cada equipo. La PENDIENTE sí es
 *  física (1:1), así que la dinámica (qué tan fuerte vs. silencio) es estable
 *  entre equipos; solo el cero absoluto varía. */

export const DBFS_TO_DB_OFFSET = 80;
export const EMA_ALPHA = 0.2;
export const DB_FLOOR = 30;
export const DB_CEIL = 130;
/** Piso de dBFS que reporta el nativo en silencio (Android: -160). */
export const DBFS_SILENCE = -160;

/** dBFS → potencia lineal normalizada (amplitud²). Siempre > 0 para dBFS finito. */
export function powerFromDbfs(dbfs: number): number {
  return 10 ** (dbfs / 10);
}

/** potencia lineal (> 0) → dBFS. */
export function dbfsFromPower(power: number): number {
  return 10 * Math.log10(power);
}

/** Mapea dBFS a una escala dB aproximada con pendiente 1:1 + offset, acotada a
 *  [DB_FLOOR, DB_CEIL]. Entrada no finita → piso (defensivo; no debería ocurrir). */
export function dbfsToApproxDb(dbfs: number): number {
  if (!Number.isFinite(dbfs)) return DB_FLOOR;
  return Math.round(Math.max(DB_FLOOR, Math.min(DB_CEIL, dbfs + DBFS_TO_DB_OFFSET)));
}

/** Siguiente valor de la EMA (respuesta "slow") en dominio de potencia. */
export function nextEmaPower(prev: number | null, power: number): number {
  return prev == null ? power : EMA_ALPHA * power + (1 - EMA_ALPHA) * prev;
}

/** Acumulador de energía para el Leq (suma de potencias y número de muestras). */
export interface EnergyAccumulator {
  sumPower: number;
  count: number;
}

/** Leq en dBFS a partir del acumulador. Sin muestras → silencio. */
export function leqDbfs(acc: EnergyAccumulator): number {
  if (acc.count <= 0 || acc.sumPower <= 0) return DBFS_SILENCE;
  return dbfsFromPower(acc.sumPower / acc.count);
}
