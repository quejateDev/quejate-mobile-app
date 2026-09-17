import { useSyncExternalStore } from 'react';

/**
 * Por qué no se pudo registrar el teléfono para recibir avisos.
 *
 * 🔴 Estos cuatro motivos existen porque el registro tenía **cuatro salidas
 * mudas**: sin permiso, sin `projectId`, sin token de Expo o con el backend
 * rechazando el `POST`, la función volvía sin decir nada. El resultado era un
 * fallo invisible: las notificaciones aparecían dentro de la app —son filas en
 * la base— pero el teléfono nunca sonaba, y no había forma de saber por qué.
 *
 * Diagnosticado el 17/09/2026 con el responsable: en los registros del backend
 * **no había ni una petición** a `/push-token`, así que la app se detenía antes
 * de enviarlo. Cuál de las cuatro puertas se cerraba no se podía saber desde
 * fuera, y de ahí nace este módulo.
 */
export type PushRegistrationFailure =
  | 'permission-denied'
  | 'missing-project-id'
  | 'token-unavailable'
  | 'backend-rejected';

/** Estado del registro para recibir avisos en este teléfono. */
export type PushRegistrationStatus =
  | { state: 'pending' }
  | { state: 'registered' }
  | { state: 'failed'; reason: PushRegistrationFailure; detail?: string };

let status: PushRegistrationStatus = { state: 'pending' };
const listeners = new Set<() => void>();

/** Lee el estado actual. */
export function getPushRegistrationStatus(): PushRegistrationStatus {
  return status;
}

/** Publica un estado nuevo y avisa a quien lo esté mirando. */
export function setPushRegistrationStatus(next: PushRegistrationStatus): void {
  status = next;
  listeners.forEach((listener) => listener());
}

/** Solo para las pruebas: vuelve al estado inicial. */
export function resetPushRegistrationStatus(): void {
  setPushRegistrationStatus({ state: 'pending' });
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Suscribe un componente al estado del registro.
 *
 * Es un `useSyncExternalStore` y no un contexto porque el registro ocurre una
 * sola vez, fuera de React (al montar las pestañas), y lo consulta una única
 * pantalla. Un proveedor alrededor de toda la app sería más ceremonia que
 * ayuda.
 */
export function usePushRegistrationStatus(): PushRegistrationStatus {
  return useSyncExternalStore(subscribe, getPushRegistrationStatus);
}

/** Texto para el ciudadano. Sin jerga: quien lo lee no es quien lo programó. */
export function describePushRegistration(
  current: PushRegistrationStatus,
): string {
  switch (current.state) {
    case 'registered':
      return 'Activadas en este teléfono';
    case 'pending':
      return 'Comprobando…';
    default:
      return FAILURE_LABELS[current.reason];
  }
}

const FAILURE_LABELS: Record<PushRegistrationFailure, string> = {
  'permission-denied': 'Sin permiso de notificaciones',
  'missing-project-id': 'No disponibles en esta versión de la app',
  'token-unavailable': 'No se pudo activar en este teléfono',
  'backend-rejected': 'No se pudieron activar; se reintenta al abrir la app',
};
