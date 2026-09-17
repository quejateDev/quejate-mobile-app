import { renderHook, act } from '@testing-library/react-native';
import {
  describePushRegistration,
  getPushRegistrationStatus,
  resetPushRegistrationStatus,
  setPushRegistrationStatus,
  usePushRegistrationStatus,
} from '../pushRegistrationStatus';

describe('pushRegistrationStatus', () => {
  afterEach(() => resetPushRegistrationStatus());

  it('arranca en «pendiente»: todavía no se sabe nada del teléfono', () => {
    expect(getPushRegistrationStatus()).toEqual({ state: 'pending' });
  });

  it('avisa a quien lo mira cuando el registro termina', () => {
    const { result } = renderHook(() => usePushRegistrationStatus());

    act(() => setPushRegistrationStatus({ state: 'registered' }));

    expect(result.current).toEqual({ state: 'registered' });
  });

  // 🔴 Lo que hace útil este módulo: que cada salida del registro tenga un
  // texto propio. Si se añade un motivo sin etiqueta, esta prueba lo caza.
  it.each([
    ['permission-denied', 'Sin permiso de notificaciones'],
    ['missing-project-id', 'No disponibles en esta versión de la app'],
    ['token-unavailable', 'No se pudo activar en este teléfono'],
    [
      'backend-rejected',
      'No se pudieron activar; se reintenta al abrir la app',
    ],
  ] as const)('el motivo %s se explica al ciudadano', (reason, label) => {
    expect(describePushRegistration({ state: 'failed', reason })).toBe(label);
  });

  it('registrado y pendiente tienen su propio texto', () => {
    expect(describePushRegistration({ state: 'registered' })).toBe(
      'Activadas en este teléfono',
    );
    expect(describePushRegistration({ state: 'pending' })).toBe(
      'Comprobando…',
    );
  });
});
