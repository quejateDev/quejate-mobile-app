jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

/**
 * `SESSION_TOKEN_KEY` se decide en tiempo de carga del módulo a partir de
 * EXPO_PUBLIC_API_URL. Si el cambio de host alterara esa clave, SecureStore
 * dejaría de encontrar el token guardado y cerraría la sesión de todos los que
 * actualicen — sin forma de parchearlo, porque no hay OTA.
 */
function loadSessionTokenKey(apiUrl: string | undefined): string {
  let key = '';
  jest.isolateModules(() => {
    if (apiUrl === undefined) delete process.env.EXPO_PUBLIC_API_URL;
    else process.env.EXPO_PUBLIC_API_URL = apiUrl;
    key = require('../SecureStorage').SESSION_TOKEN_KEY;
  });
  return key;
}

describe('SESSION_TOKEN_KEY', () => {
  const originalApiUrl = process.env.EXPO_PUBLIC_API_URL;

  afterEach(() => {
    if (originalApiUrl === undefined) delete process.env.EXPO_PUBLIC_API_URL;
    else process.env.EXPO_PUBLIC_API_URL = originalApiUrl;
  });

  it('el host nuevo mantiene la misma clave que el host antiguo', () => {
    expect(loadSessionTokenKey('https://api.quejate.com.co/api')).toBe(
      loadSessionTokenKey('https://www.quejate.com.co/api'),
    );
  });

  it('usa la cookie __Secure- con el host nuevo (https)', () => {
    expect(loadSessionTokenKey('https://api.quejate.com.co/api')).toBe(
      '__Secure-authjs.session-token',
    );
  });

  it('usa la cookie sin prefijo contra un backend local por http', () => {
    expect(loadSessionTokenKey('http://localhost:3000/api')).toBe('authjs.session-token');
  });

  it('sin variable definida cae a la cookie sin prefijo', () => {
    expect(loadSessionTokenKey(undefined)).toBe('authjs.session-token');
  });
});
