const appConfig = require('../app.config.js') as {
  expo: { version: string; android: { versionCode: number } };
};
const easJson = require('../eas.json') as {
  cli: { appVersionSource: string };
  build: { production: { autoIncrement?: boolean } };
};

/** Versión visible que hay hoy en Google Play. */
const PUBLISHED_VERSION = '1.0.0';

const SEMVER = /^(\d+)\.(\d+)\.(\d+)$/;

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
