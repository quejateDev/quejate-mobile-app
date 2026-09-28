type PluginEntry = string | [string, Record<string, unknown>];

const appConfig = require('../app.config.js') as {
  expo: {
    version: string;
    android: { versionCode: number; blockedPermissions?: string[] };
    plugins: PluginEntry[];
  };
};
const easJson = require('../eas.json') as {
  cli: { appVersionSource: string };
  build: { production: { autoIncrement?: boolean } };
};

/** Versión visible que hay hoy en Google Play. */
const PUBLISHED_VERSION = '1.0.0';

const SEMVER = /^(\d+)\.(\d+)\.(\d+)$/;

/** Opciones con las que se registra un plugin, o `{}` si va sin opciones. */
function pluginOptions(name: string): Record<string, unknown> {
  const entry = appConfig.expo.plugins.find((p) => (Array.isArray(p) ? p[0] : p) === name);
  return Array.isArray(entry) ? entry[1] : {};
}

function compare(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if (pa[i] !== pb[i]) return pa[i] - pb[i];
  }
  return 0;
}

describe('app.config.js', () => {
  it('declara una versión semver válida', () => {
    expect(appConfig.expo.version).toMatch(SEMVER);
  });

  // No hay OTA: cada entrega llega por tienda y la versión visible es lo único
  // que permite decirle a un ciudadano qué build tiene instalado.
  it('la versión visible sube por encima de la publicada', () => {
    expect(compare(appConfig.expo.version, PUBLISHED_VERSION)).toBeGreaterThan(0);
  });

  // El versionCode no se gestiona en el repositorio: eas.json usa
  // appVersionSource remote con autoIncrement, así que el valor del fichero es
  // solo un marcador de posición y EAS lo sobreescribe en cada build.
  it('deja el versionCode en manos de EAS', () => {
    expect(easJson.cli.appVersionSource).toBe('remote');
    expect(easJson.build.production.autoIncrement).toBe(true);
  });
});

describe('servicios en primer plano', () => {
  // expo-audio trae FOREGROUND_SERVICE y FOREGROUND_SERVICE_MEDIA_PLAYBACK en su
  // propio manifiesto. Play exige declarar cada tipo con un vídeo que lo muestre
  // y la app no usa ninguno, así que con ellos en el manifiesto no se puede
  // enviar una versión a revisión.
  it('bloquea los permisos que traen las librerías y la app no usa', () => {
    expect(appConfig.expo.android.blockedPermissions).toEqual(
      expect.arrayContaining([
        'android.permission.RECEIVE_BOOT_COMPLETED',
        'android.permission.FOREGROUND_SERVICE',
        'android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK',
        'android.permission.FOREGROUND_SERVICE_MICROPHONE',
        'android.permission.FOREGROUND_SERVICE_LOCATION',
      ]),
    );
  });

  // Con esos permisos bloqueados, arrancar un servicio en primer plano hace
  // fallar la app. Quien active una de estas opciones tiene que quitar el
  // bloqueo y declarar el tipo en Play Console, no solo cambiar este fichero.
  it('no activa ninguna opción de plugin que necesite un servicio en primer plano', () => {
    expect(pluginOptions('expo-audio').enableBackgroundRecording).toBeFalsy();
    expect(pluginOptions('expo-video').supportsBackgroundPlayback).toBeFalsy();
    expect(pluginOptions('expo-location').isAndroidForegroundServiceEnabled).toBeFalsy();
    expect(pluginOptions('expo-location').isAndroidBackgroundLocationEnabled).toBeFalsy();
  });
});
