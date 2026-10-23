# Publicación 1.1.0 en Google Play

Preparada el 26/09/2026 sobre `origin/main` en `9298575`. Es solo documentación: no cambia código, ni
`app.config.js`, ni `eas.json`. La subida a Play la hace el responsable a mano en la consola, que es
donde se fija el porcentaje de despliegue.

El inventario para el formulario de «Seguridad de los datos» está aparte, en
[`seguridad-de-los-datos.md`](./seguridad-de-los-datos.md).

## 1. Estado de `main`

- `origin/main` está en `9298575` (merge del #25). No ha derivado.
- `npm test`: 16 suites, 134 pruebas en verde. `npm run typecheck`: limpio.
- El árbol está limpio salvo `assets/quejate-banner.png` sin versionar, que ya estaba.
- ⚠️ El `main` **local** de la máquina de trabajo estaba en `8513f51`: le faltaba el #25. Antes de
  compilar hay que hacer `git switch main && git pull`, y comprobar en el log de EAS que
  `EAS_BUILD_GIT_COMMIT_HASH` empieza por `9298575`.

## 2. Versión y `versionCode`

- **Versión visible: `1.1.0`** (`app.config.js:20`). La publicada es la `1.0.0`
  (`__tests__/appConfig.test.ts:10`).
- **El `versionCode` lo asigna EAS**, no el repositorio: `eas.json:4` declara
  `appVersionSource: "remote"`. Hoy vale **7** (`eas build:version:get --platform android`).
- El perfil `production` tiene `autoIncrement` (`eas.json:18`): al empezar el build, EAS sube el
  contador remoto y lo inyecta. El próximo AAB será el **8**, y el log lo dice en la fase
  `CONFIGURE_ANDROID_VERSION` (`Version code: 8`).
- Los builds `preview` no incrementan: el último APK (`7a916cd`) salió con `Version code: 7`, el
  mismo número que el último AAB de tienda. No pasa nada, porque los APK de preview no se suben a
  Play.
- El `versionCode: 1` de `app.config.js:44` es un marcador; EAS avisa de que lo ignora. Lo fija
  `__tests__/appConfig.test.ts:34-40`.
- Play rechaza un `versionCode` que no supere a todos los subidos antes. EAS solo cuenta lo que
  EAS ha compilado: si alguna vez se subió a Play un AAB compilado por otra vía, hay que comprobar
  en Play Console (Explorador de app bundles) que el 8 sigue siendo el mayor.

## 3. Qué hay publicado y desde dónde se cuentan los cambios

Builds de tienda, todos `1.0.0`
(`eas build:list --platform android --buildProfile production`):

| `versionCode` | Commit | Fecha |
|---|---|---|
| 4 | `09d3250` | 19/06/2026 |
| 5 | `ff490d5` | 11/07/2026 |
| 6 | `93ad514` | 22/07/2026 |
| 7 | `d700339` | 22/07/2026 |

EAS no sabe cuál está en producción, porque la subida es manual: eso se ve en Play Console. Las
notas cuentan desde `d700339` (versionCode 7). La 6 ya incluye `718f2cc` (las listas enseñaban
estados viejos) y la 7 añade `b1b1088` (permiso de arranque), que no se ve. Solo si en producción
sigue la 5 hace falta la línea opcional de las listas.

## 4. Notas de la versión

Para ciudadanos, en español, dentro del límite de 500 caracteres de Play.

**Para pegar** (435 caracteres):

```text
Novedades:
• Guarda o comparte en PDF la tutela que generes.
• «Mis documentos legales», en tu perfil: tus documentos y hasta cuándo están disponibles.
• Certificado de radicación de tus PQRSD en PDF, desde su menú de opciones.
• El mapa ya no se limita a 50 PQRSD: muestra las públicas con ubicación.
• Al cerrar sesión puedes entrar con otra cuenta de Google.
• En tu perfil ves si las notificaciones están activas y, si no, por qué.
```

**Si en producción está la versionCode 5**, añade al final (493 en total):

```text
• Las listas muestran el estado actualizado de tus PQRSD.
```

**Solo si se ha comprobado el §5** en un teléfono con la app instalada desde Play, cambia la última
línea por esta (mismo total):

```text
• Las notificaciones vuelven a llegar; en tu perfil ves si están activas.
```

**Versión de una línea** (153 caracteres):

```text
Tutela y certificado de radicación en PDF, historial de documentos legales, mapa sin el límite de 50 PQRSD y cambio de cuenta de Google al cerrar sesión.
```

### De dónde sale cada línea

| Línea | Commit | Dónde se ve en la app |
|---|---|---|
| Tutela en PDF | `0be0e82`, `989bb69` | Botón «Guardar o compartir el PDF» (`GenerateTutelaScreen.tsx:180`) |
| Mis documentos legales | `f7604a2`, `7a916cd` | Perfil → Asesoría legal (`UserProfileScreen.tsx:224-240`); «Disponible hasta» (`MyLegalDocsScreen.tsx:34`) |
| Certificado de radicación | `81d7fc7` | «Descargar certificado» en el menú de la PQRSD (`PQRActionsSheet.tsx:150`) |
| Mapa sin límite de 50 | `45b9bc2` | Antes pedía `GET /pqr?limit=50`; ahora `GET /pqr/map`, hasta 1.000 puntos |
| Otra cuenta de Google | `2b2f7d6` | El cierre de sesión suelta la cuenta de Google (`useAuth.ts:94-118`) |
| Estado de las notificaciones | `b66df5e` | Perfil → Notificaciones (`UserProfileScreen.tsx:251-265`) |
| Listas actualizadas (opcional) | `718f2cc` | Solo si en producción sigue la versionCode 5 |

### Lo que las notas no dicen, a propósito

- **«Las notificaciones vuelven a llegar.»** Ningún commit de esta versión cambia el envío: ver §5.
- **Los oficios a entes de control.** La app no los genera; solo aparecen en el historial si se
  generaron en la web (`7a916cd`). Nombrarlos invitaría a buscar un botón que no existe.
- **La conexión directa a `api.quejate.com.co`** (`da0c9e3`). No es algo que el ciudadano note.

## 5. 🔴 Las notificaciones push en el binario de tienda

**Nada en esta versión arregla el envío de las push.** `b66df5e` cambia el registro solo para que
diga por qué falla: las cuatro salidas que antes eran silenciosas ahora dejan su motivo en Perfil
→ Notificaciones (`pushRegistrationStatus.ts:70-83`) y una línea `[push]` en la consola del
teléfono. El diagnóstico del 17/09 (PR #19) fue que el backend no recibía ni una petición a
`/push-token`, así que el teléfono se para antes de enviarla.

Dos causas encajan con ese síntoma y con que los APK de preview sí funcionen. Ninguna es de
código:

1. **El `google-services.json` de producción puede ser el roto de mayo.** En EAS, `production` y
   `preview` tienen registros distintos de `GOOGLE_SERVICES_JSON`: el de `production` se creó el
   20/05/2026 a las 20:09 y el de `preview` a las 23:06, tres horas después. Según las notas de
   trabajo de ese día (no versionadas), el arreglo del `FIS_AUTH_ERROR` fue volver a descargar ese
   fichero con la clave del proyecto de Firebase y subirlo a EAS, y se validó solo con un APK de
   preview. No he comparado el contenido de los dos registros: son secretos y le toca al
   responsable.
2. **La clave Android de Firebase puede no aceptar la firma de Play.** Según las mismas notas, esa
   clave se restringió a `co.quejate.app` y al SHA-1 del keystore de EAS. La app que se instala
   desde Play la vuelve a firmar Play con su propia clave (Play App Signing). En junio ese SHA-1 se
   añadió al cliente OAuth de Google Sign-In y a la clave de Maps, pero las notas no dicen que se
   añadiera a la de Firebase. Si falta, Firebase rechaza la app de Play y acepta los APK de
   preview. Esto se arregla en Google Cloud, sin compilar de nuevo.

**Cómo salir de dudas:** sube el AAB a pruebas internas, instálalo desde Play en un teléfono real y
abre Perfil → Notificaciones. Tiene que decir «Activadas en este teléfono». Si dice «No se pudo
activar en este teléfono», es una de las dos causas; `adb logcat | grep "\[push\]"` enseña el error
de Firebase.

## 6. 🔴 El perfil de envío dice `internal`

`eas.json:24-30` define el perfil de envío `production` con `"track": "internal"`. Quien ejecute
`eas submit --platform android --profile production` creyendo que publica deja el paquete en
**pruebas internas**, y sin error: el comando termina bien.

Comprobado en `@expo/eas-json` 18.4.0, la versión que usa el `eas-cli` instalado
(`build/submit/schema.js`):

- Sin `--profile`, `eas submit` usa el perfil `production` si existe (`eas submit --help`).
- `track` vale `internal` por defecto. Borrar la línea no cambia nada.
- 🔴 `releaseStatus` vale **`completed` por defecto**: el despliegue es al 100 % en cuanto Google
  aprueba la revisión. Si alguien cambia solo `track` a `production`, publica para todos sin pasar
  por el porcentaje.
- `rollout` (entre 0 y 1) solo se admite con `releaseStatus: "inProgress"`.
- `play-service-account.json` no existe en la máquina de trabajo (está en `.gitignore:33`), así que
  hoy `eas submit` fallaría desde ahí de todas formas.

**No se cambia en este trabajo.** Propuesta para decidir en su propia rama:

```json
"submit": {
  "internal": {
    "android": {
      "serviceAccountKeyPath": "./play-service-account.json",
      "track": "internal"
    }
  },
  "production": {
    "android": {
      "serviceAccountKeyPath": "./play-service-account.json",
      "track": "production",
      "releaseStatus": "draft"
    }
  }
}
```

- `internal` se queda, con un nombre que dice lo que hace. Es el único sitio donde se puede probar
  el binario firmado por Play antes de producción, y eso es justo lo que pide el §5.
- `production` apunta a producción, pero con `releaseStatus: "draft"`: crea un borrador y el
  porcentaje se sigue fijando a mano en la consola. Nunca `track: "production"` sin
  `releaseStatus`, porque el valor por defecto es el 100 %.

## 7. Lista de comprobación previa al build

**Código**

- [ ] `git switch main && git pull`; `git log -1` en `9298575`, o en el commit que se decida
  publicar.

**Variables de EAS en `production`** (`eas env:list --environment production`)

| Variable | Qué debe tener | La lee |
|---|---|---|
| `EXPO_PUBLIC_API_URL` | `https://api.quejate.com.co/api` (comprobado el 26/09) | `client.ts:13`, `SecureStorage.ts:3`, `useAuth.ts:87`, `legalDocShare.ts:24` |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | Cliente OAuth web del proyecto `398000745519` (empieza por `398000745519-`) | `useGoogleAuth.ts:13` |
| `EXPO_PUBLIC_RECAPTCHA_SITE_KEY` | La clave de sitio registrada para `www.quejate.com.co`, pareja del secreto del backend | `CreatePQRScreen.tsx:428` |
| `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` (sensible) | La clave de Maps restringida a `co.quejate.app` con los SHA-1 de EAS y de Play App Signing | `app.config.js:65` |
| `GOOGLE_SERVICES_JSON` (fichero, sensible) | 🔴 El mismo fichero que en `preview`, del proyecto de Firebase (§5.1) | `app.config.js:8-10` |

- Cada entorno tiene sus propios registros; solo `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` es
  compartido. **Que un APK de preview funcione no prueba nada sobre `production`.**
- `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` está en EAS, pero el código no la lee.

**Credenciales de FCM**

- [ ] `eas credentials --platform android`, aplicación `co.quejate.app`, apartado de la cuenta de
  servicio de Google para notificaciones (FCM V1): debe estar la del proyecto de Firebase. Según
  las notas del 20/05 es `firebase-adminsdk-fbsvc@quejateapp-b480a`. No he podido comprobarlo
  porque el comando es interactivo. Sin ella, Expo no puede entregar avisos en Android aunque el
  teléfono se registre.
- [ ] Google Cloud → proyecto de Firebase → clave Android: además del SHA-1 de EAS, debe estar el de
  Play App Signing (Play Console → Integridad de la app) (§5.2).

**Qué revisar en el log del build** (`eas build --platform android --profile production`)

- [ ] `EAS_BUILD_PROFILE=production` y `EAS_BUILD_GIT_COMMIT_HASH` con el commit esperado.
- [ ] *Project environment variables*: `EXPO_PUBLIC_API_URL=https://api.quejate.com.co/api` y las
  otras `EXPO_PUBLIC_*`, con la de Maps como `********`. En *Environment secrets*,
  `GOOGLE_SERVICES_JSON` con una ruta; si falta, el AAB sale sin FCM.
- [ ] `READ_APP_CONFIG`: `"version": "1.1.0"`.
- [ ] `CONFIGURE_ANDROID_VERSION`: `Version code: 8`.
- [ ] `PREPARE_CREDENTIALS`: `Signing config injected`. Firma con el keystore que ya tiene EAS; no
  generes credenciales nuevas, porque Play rechaza un AAB con otra clave de subida.
- [ ] `RUN_GRADLEW`: aparece `> Task :app:processReleaseGoogleServices` y termina en
  `BUILD SUCCESSFUL`.
- Ruido conocido del último build, que no bloquea: `expo doctor` da 17/18 por versiones de parche
  (`expo` 54.0.35 frente a ~54.0.37, `expo-constants`, `expo-file-system`, `jest-expo`), que no se
  tocan en una entrega sin funcionalidad nueva; *«The android project is malformed, project files
  will be cleared and reinitialized»*, normal porque `android/` no se versiona y EAS lo regenera; y
  avisos de deprecación de npm y Kotlin.

**Antes de pasar a producción**

- [ ] Sube el AAB a pruebas internas e instálalo desde Play. Comprueba Perfil → Notificaciones
  (§5), entrar con Google, cerrar sesión y volver a ver el selector de cuentas, el mapa y Mis
  documentos legales.
- [ ] 🔴 **No radiques PQRSD de prueba con la app de producción**: se envían por correo a entidades
  reales.
- [ ] Formulario de «Seguridad de los datos» actualizado y huecos de la política resueltos
  ([`seguridad-de-los-datos.md`](./seguridad-de-los-datos.md)).
