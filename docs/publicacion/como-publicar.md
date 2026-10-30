# Cómo publicar una versión de la app en Google Play

Escrito el 26/10/2026, el día en que la 1.2.0 salió a producción, para quien publique la siguiente
sin haberlo hecho nunca. Solo cubre Android y Google Play: es la única tienda con perfil de envío
en `eas.json` (`submit.production.android`).

Cada orden lleva al lado de dónde sale:

- ✅ **Comprobada:** existe en `package.json`, o la ayuda del `eas-cli` instalado (18.4.0) la
  describe así, o la he ejecutado. Todo sin sesión, salvo dos lecturas de EAS del 27/10
  (`eas build:list` y `eas build:version:get`), que no compilan ni cambian nada.
- ⚠️ **Sin comprobar:** sale de la documentación de Expo o de Google, o de lo que se hizo en
  versiones anteriores, pero no la he podido ejecutar (necesita una sesión real de Expo o de Play
  Console, y este documento no ha usado ninguna para nada más).

Los documentos de cada versión publicada están en `docs/publicacion/<versión>/`. El de la 1.2.0
([`1.2.0/publicacion.md`](./1.2.0/publicacion.md)) es el ejemplo más completo de cómo se preparó
una: léelo antes de empezar.

## 1. Lo que hay que saber antes de tocar nada

- **No hay actualizaciones por aire (OTA).** `expo-updates` no está en `package.json`. Cada cambio,
  por pequeño que sea, llega al teléfono solo con un binario nuevo por Google Play, y cada binario
  publicado sigue funcionando con el código que llevaba el día que se compiló.
- **La app no obliga a actualizar.** No hay ninguna comprobación de versión mínima en `src/`. Quien
  no actualiza sigue con su versión indefinidamente.
- **Por eso el servidor no puede cambiar la forma de sus respuestas** (§9). Es lo más importante de
  este documento para quien mantenga el backend.
- **Una versión mal publicada no se arregla en el sitio.** Si sale con un fallo, la única salida es
  publicar otra, y la que tenía el fallo se queda en los teléfonos que la instalaron. De ahí el
  orden del §6: primero «Pruebas internas», mirarla en un teléfono, y solo después producción.
- 🔴 **Nunca envíes nada de prueba desde una versión de tienda.** Una PQRSD se envía por correo a
  una entidad real, y un oficio, a un ente de control real.

## 2. Las cuentas que hacen falta

Ninguna credencial está en el repositorio ni debe estarlo. Lo que sigue son nombres, para saber a
quién pedir acceso.

| Cuenta | Para qué | Cómo se reconoce |
|---|---|---|
| **Expo (EAS)** | Compilar el binario y guardar sus variables y su clave de firma | Organización `quejateapp`, proyecto `quejate-app` (`app.config.js`: `owner` y `slug`; el `projectId` está en `extra.eas.projectId`). Tu usuario de Expo tiene que ser miembro de esa organización con permiso para compilar |
| **Google Play Console** | Subir el binario, probarlo, publicarlo y rellenar los formularios de la ficha | La app con el paquete `co.quejate.app` (`app.config.js`: `android.package`). Tu usuario tiene que estar invitado con permiso para crear versiones en las pistas de prueba y en producción |
| **GitHub** | El código | Organización `quejateDev`, repositorio `quejate-mobile-app` |

⚠️ **No consta en el repositorio quién es el propietario** de la cuenta de desarrollador de Play
Console ni de la organización de Expo. Averígualo antes de necesitarlo: sin ese acceso no se puede
publicar nada.

Qué **no** hace falta para publicar como se publicó la 1.2.0:

- `play-service-account.json`: solo lo usa `eas submit` (`eas.json`, `submit.production.android`).
  Está en `.gitignore:33` y no existe en la máquina de trabajo. La subida a Play se hizo a mano
  (§6).
- `google-services.json` en tu máquina: el de las compilaciones de tienda vive en EAS como variable
  de tipo fichero, `GOOGLE_SERVICES_JSON` (el comentario del principio de `app.config.js` lo
  explica). Solo lo necesitas en local para compilar con `npm run android`.

## 3. Herramientas

- **Node y npm.** El repositorio usa npm (hay `package-lock.json`). Instala dependencias con
  `npm install`. ✅ `package-lock.json`
- **`eas-cli`, instalado de forma global.** No está en `package.json`; `eas.json` exige la 18.0.0 o
  posterior (`cli.version`). La máquina de trabajo tiene la 18.4.0, la que había cuando se preparó
  la 1.2.0.
  Se instala con `npm install -g eas-cli` (es lo que propone la propia herramienta al arrancar).
  ⚠️ El aviso dice que ya existe la 25.3.0; con ella no se ha compilado nunca esta app.
- **Entrar en Expo:** `eas login` y, para comprobar con qué usuario, `eas whoami`. ✅ ayuda del
  `eas-cli` 18.4.0 (`eas login --help`, `eas whoami --help`); ⚠️ no las he ejecutado.

## 4. Subir la versión en el código

Se hace en una rama propia, como cualquier cambio. Para la 1.2.0 fue `chore/release-1-2-0` (PR
#37).

1. **Parte de `main` actualizado:**

   ```sh
   git switch main
   git pull
   git switch -c chore/release-1-3-0
   ```

2. **Sube la versión visible** en `app.config.js`, el campo `version` (hoy `'1.2.0'`, en la línea
   20). Es la que ve la persona en la ficha de Play y en el pie del perfil. Hasta ahora se ha subido
   el número del medio en cada versión con novedades (1.0.0, 1.1.0, 1.2.0).

3. **Actualiza la versión publicada en la prueba:** en `__tests__/appConfig.test.ts:16`,
   `PUBLISHED_VERSION` tiene que ser la que está **hoy** en producción. Después de la 1.2.0, eso es
   `'1.2.0'` (el 26/10 todavía decía `'1.1.0'`). La prueba «la versión visible sube por encima de la
   publicada» falla si se te olvida subir `version`.

4. **No toques el `versionCode`.** El `versionCode: 1` de `app.config.js:44` es un marcador que EAS
   ignora (§5.2).

5. **Comprueba que todo pasa:**

   ```sh
   npm run typecheck
   npm test
   ```

   ✅ `package.json`, `scripts.typecheck` (`tsc --noEmit`) y `scripts.test` (`jest`). El 26/10,
   sobre `7f4174c`: 38 suites y 445 pruebas en verde, y el typecheck limpio. Jest avisa al final
   de que un proceso no terminó limpio; no hace fallar nada.

6. **Mira la versión que verá EAS**, sin compilar:

   ```sh
   npx expo config --type public
   ```

   ✅ Ejecutada el 26/10: con `main` en `7f4174c` da `version: '1.2.0'` y `versionCode: 1` (el
   marcador). No te dejes `--type public`: sin esa opción, la salida incluye la clave de Google
   Maps de tu `.env` local (comprobado el 26/10).

7. **Escribe el documento de la versión** en `docs/publicacion/<versión>/publicacion.md`: qué entra
   (los PR desde la última versión de tienda), las notas (§7) y lo que cambie en «Seguridad de los
   datos» (§8). Commit, PR y merge a `main`.

## 5. Compilar

### 5.1 El perfil y la orden

```sh
git switch main
git pull
git status
eas build --platform android --profile production
```

✅ `eas build --help`: `--platform android|ios|all` y `--profile`, que si se omite usa
`production`. Escríbelo igual: así no hay duda de qué perfil se usó.

- **`git status` tiene que salir limpio** en lo versionado. EAS sube tu directorio de trabajo; con
  el árbol limpio, lo que compila es exactamente el commit que dirá el registro. (El
  `assets/quejate-banner.png` sin versionar que hay en la máquina de trabajo no lo usa la app.)
- **El perfil `production`** de `eas.json` compila un **AAB** (`android.buildType: "app-bundle"`),
  que es lo que pide Play, y sube el `versionCode` solo (`autoIncrement: true`).
- **No uses `preview`** para la tienda: da un APK (`buildType: "apk"`) y carga las variables del
  entorno `preview`, no las de producción. Sirve para probar en un teléfono sin pasar por Play.
  `development` es un cliente de desarrollo.
- **No añadas `--auto-submit`.** Enviaría con el perfil de envío `production`, que necesita
  `play-service-account.json` (§2) y deja la versión en «Pruebas internas» (§6.1).

### 5.2 El `versionCode`

Play exige que cada binario subido tenga un `versionCode` mayor que todos los anteriores. Aquí no
se escribe a mano:

- `eas.json` declara `"appVersionSource": "remote"` (`cli`): el número vive en los servidores de
  EAS, no en el repositorio.
- El perfil `production` tiene `"autoIncrement": true`: cada `eas build --profile production` suma
  uno.
- La prueba «deja el versionCode en manos de EAS» (`__tests__/appConfig.test.ts`) falla si alguien
  cambia cualquiera de las dos cosas.

**Dónde se ve:**

- Antes de compilar: `eas build:version:get --platform android`. ✅ Ejecutada el 27/10 (con sesión;
  solo lee): devuelve **13**, así que el próximo binario de tienda será el 14. El 22/10,
  antes de compilar la 1.2.0, devolvía 10.
- Durante la compilación: en el registro, fase `CONFIGURE_ANDROID_VERSION`, la línea
  `Version code: N` (así lo anotó la 1.2.0, §6 de su documento).
- En Play Console: **Explorador de app bundles** lista cada binario subido con su `versionCode`.

La 1.2.0 publicada es el **13** (Play Console, 27/10), no el 11 que se esperaba: entre el 22 y el
23/10 se compilaron tres binarios de tienda, el 11 y el 12 desde el mismo commit y el 13 desde el
siguiente (§8.3 de [su documento](./1.2.0/publicacion.md)). Saltarse números no es un problema:
Play solo exige que cada `versionCode` sea mayor que los anteriores. Lo que sí importa es promocionar
el binario que se ha probado, y anotar cuál fue.

⚠️ EAS solo cuenta lo que compila él. Si alguna vez se sube a Play un binario hecho por otra vía,
hay que fijar el número remoto por encima con `eas build:version:set --platform android` (✅
existe en la ayuda; ⚠️ nunca se ha usado en este proyecto).

### 5.3 Las variables de la compilación

Las variables `EXPO_PUBLIC_*` se meten dentro del binario al compilar (§9). Las de tienda **no
salen de tu `.env`**: `.easignore` excluye `.env` y `.env.local`, así que EAS no los sube.

Salen del entorno **`production`** de EAS. El perfil no lo nombra (no tiene `environment`), y el
`eas-cli` lo deduce: un perfil sin `distribution` vale `store`, y `store` carga `production`. ✅
`@expo/eas-json` 18.4.0, `build/build/schema.js:44` (`distribution` por defecto `store`), y
`eas-cli` 18.4.0, `build/build/evaluateConfigWithEnvVarsAsync.js:62-69`.

| Variable | Para qué |
|---|---|
| `EXPO_PUBLIC_API_URL` | La API (`src/core/api/client.ts:13`). En tienda, `https://api.quejate.com.co/api` |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` | Entrar con Google |
| `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` | Mapas (`app.config.js`, `android.config.googleMaps`) |
| `EXPO_PUBLIC_RECAPTCHA_SITE_KEY` | El captcha al enviar una PQRSD |
| `GOOGLE_SERVICES_JSON` (fichero secreto) | Notificaciones push. Si falta, el binario sale sin ellas |

Los nombres son los de `.env.example` y los que cargó EAS el 22/10 (documento de la 1.2.0, §6).
Para ver los de hoy: `eas env:list production` (✅ ayuda; ⚠️ necesita sesión).

### 5.4 Qué mirar en el registro

En la página del build en expo.dev (el enlace lo da `eas build` al terminar, o
`eas build:list --platform android` ✅ ayuda):

- [ ] `EAS_BUILD_PROFILE=production` y `EAS_BUILD_GIT_COMMIT_HASH` con el commit de `git log -1`.
- [ ] Las `EXPO_PUBLIC_*` del §5.3, con la de Maps como `********`, y `GOOGLE_SERVICES_JSON` con una
  ruta.
- [ ] `READ_APP_CONFIG`: `"version"` con la nueva versión.
- [ ] `CONFIGURE_ANDROID_VERSION`: `Version code:` uno más que el anterior.
- [ ] `PREPARE_CREDENTIALS`: `Signing config injected`, con la clave que ya tiene EAS. 🔴 **Si EAS
  pregunta si genera credenciales nuevas, di que no:** Play rechaza un binario firmado con otra
  clave de subida.
- [ ] `BUILD SUCCESSFUL`.

La lista sale del §6 del documento de la 1.2.0, que es lo que se miró aquella vez.

## 6. Pruebas internas, el teléfono y producción

Este es el orden que funcionó con la 1.2.0. Los nombres de los menús de Play Console son los de la
consola en español y pueden cambiar; ⚠️ no los he podido revisar en la consola.

### 6.1 Subir a «Pruebas internas»

1. Descarga el AAB desde la página del build en expo.dev.
2. Play Console → Quéjate → **Pruebas internas** → crear una versión nueva → sube el AAB.
3. Pega las notas de la versión (§7) en español.
4. Revisa y lanza la versión **en esa pista**. No llega a ningún ciudadano: solo a la lista de
   verificadores de «Pruebas internas».

La alternativa es `eas submit --platform android --profile production --latest` (✅ `eas submit
--help`: `--latest` envía el último build). Con el `eas.json` de hoy deja la versión en «Pruebas
internas», porque el perfil de envío tiene `"track": "internal"`. ⚠️ Necesita
`play-service-account.json`, que no está en la máquina de trabajo, y nunca se ha usado para una
versión de tienda. Ojo si alguien cambia `track` a `production`: `releaseStatus` vale `completed`
por defecto (✅ `@expo/eas-json` 18.4.0, `build/submit/schema.js:9-12`), así que la versión saldría
al 100 % en cuanto Google la aprobara. El PR #26 propone separar los dos perfiles.

### 6.2 Mirarla en un teléfono

Instálala **desde Play**, con una cuenta de la lista de verificadores, no con un APK. El binario de
Play va firmado por Google con otra clave que el de EAS, y hay cosas (entrar con Google, las
notificaciones) que dependen de esa firma.

- [ ] **La versión.** Perfil, abajo del todo: tiene que decir «Quéjate v» seguido de la nueva
  versión. La lee de `Constants.expoConfig?.version`
  (`src/features/users/screens/UserProfileScreen.tsx:149` y `:330-332`), que es la configuración de
  `app.config.js` que EAS mete en el binario. Si dice la anterior, estás mirando otra instalación o
  el build no salió del commit que creías.
- [ ] **Entrar con Google.**
- [ ] **Perfil → Notificaciones:** «Activadas en este teléfono».
- [ ] **Lo que cambia en esta versión**, recorrido hasta el último paso **sin enviar nada**.

### 6.3 Promocionar a producción

1. En «Pruebas internas», promociona **esa misma versión** a **Producción**. Así lo que sale es el
   binario que has probado, no uno compilado de nuevo.
2. Elige el porcentaje de despliegue.
3. Envía a revisión. Google la revisa antes de publicarla.

Antes de enviar, repasa el §8. Con la 1.2.0, Play pidió una declaración de permisos antes de dejar
enviarla (§8.3).

## 7. Las notas de la versión

- **Tope de 500 caracteres.** Play no deja guardar más.
- Para ciudadanos, en español y sin raya (el signo largo de los incisos).
- Cuéntalas antes de pegarlas. Con el texto en un fichero:

  ```sh
  node -e "console.log(require('fs').readFileSync(process.argv[1], 'utf8').replace(/\n$/, '').length)" notas.txt
  ```

  Cada salto de línea cuenta uno.
- Solo lo que la persona puede hacer de verdad con esa versión. Si algo depende de que el backend
  tenga desplegado un cambio, compruébalo antes de prometerlo.
- **No cites normas ni plazos legales**, ni prometas que una entidad vaya a responder. La ficha se
  rechazó dos veces por «Misleading Claims»; el §7 del documento de la 1.2.0 cuenta por qué.
- Guarda el texto final en el documento de la versión, con de dónde sale cada línea. El §4 del de
  la 1.2.0 es el modelo.

## 8. «Seguridad de los datos» y las declaraciones de permisos

### 8.1 Cuándo hay que tocar «Seguridad de los datos»

Cuando la versión nueva cambia **qué datos salen del teléfono o quién los recibe**. Por ejemplo:

- un campo nuevo en un formulario, o un buscador que manda el texto al servidor (así entró el
  «Historial de búsqueda en la app» en la 1.2.0);
- una librería nueva que manda datos a un tercero (mira el diff de `package.json`);
- un destinatario nuevo de datos que ya se recogían;
- una página de la web abierta dentro de la app que cargue analítica: Play la cuenta como
  recopilación de la app.

Si nada de eso cambia, el formulario se queda como está. Para saberlo, compara contra el commit de
la última versión de tienda:

```sh
git diff <commit-de-la-anterior>..main -- package.json app.config.js src/
```

El formulario tiene que decir lo mismo que la política de privacidad de la web. El razonamiento de
cada respuesta está en `docs/publicacion/1.2.0/seguridad-de-los-datos.md` (y, para la 1.1.0, en el
PR #26).

**Cómo quedó el formulario con la 1.2.0** (lo que se respondió el 26/10, según el responsable):

- el documento de identidad que piden las entidades, en «Otra información», obligatorio;
- la dirección, opcional. Comprobado el 26/10 contra producción: de las 210 entidades, 11 tienen
  formulario, y el único campo obligatorio es «Documento de identidad»; ninguna pide la dirección
  como obligatoria. **Si una entidad la vuelve obligatoria, hay que cambiar esa respuesta en Play**;
- lo que se manda a la entidad que eligió el ciudadano no cuenta como «compartido»;
- «Historial de búsqueda en la app», declarado: opcional, para la funcionalidad de la app;
- OpenAI y la información de salud, como en la 1.1.0 (⚠️ el repositorio no recoge qué se respondió
  entonces: el PR #26 las dejó como decisión, en su §5.3, y recomendaba declarar OpenAI como
  compartido);
- Google Analytics no se declara: desde el PR #194 de `quejate-app`, la web no carga Google Tag
  Manager en `/policy` ni en `/terms`, que son las páginas que la app abre dentro de un WebView
  (`src/shared/constants/legalUrls.ts`). El cambio está en producción desde el 22/10, comprobado
  ese día. Si la app empieza a abrir otra página de la web dentro de ella, vuelve a mirarlo.

### 8.2 Las declaraciones de permisos

Play pide una declaración (a veces con un vídeo) por cada permiso sensible del manifiesto: servicios
en primer plano, ubicación en segundo plano, fotos y vídeos, etc. **Desde el 27/01/2027 eso incluye
la ubicación exacta, y el manifiesto sí la pide:** `ACCESS_FINE_LOCATION` está en
`app.config.js:47`. Qué hay que hacer está en el §10.4. De los demás, el manifiesto no pide ninguno:

- `app.config.js`, `android.blockedPermissions`, quita los servicios en primer plano
  (`FOREGROUND_SERVICE*`) y `RECEIVE_BOOT_COMPLETED`, que traen `expo-audio` y
  `expo-notifications` sin que la app los use. Están bloqueados desde el commit `1b34f68` (28/09) y
  el comentario de encima explica cada uno.
- La prueba «bloquea los permisos que traen las librerías y la app no usa»
  (`__tests__/appConfig.test.ts`) falla si alguien los quita.
- Las fotos y vídeos se eligen con el selector del sistema, sin `READ_MEDIA_IMAGES` (comentario en
  `android.permissions`).

Si una versión necesita de verdad uno de esos permisos (por ejemplo, grabar con la pantalla
apagada), hay que quitarlo de `blockedPermissions`, cambiar la prueba **y** declararlo en Play
Console con un vídeo que enseñe la función. Cambiar solo el código no basta.

### 8.3 🔴 La trampa: Play mira todas las pistas, no solo la que publicas

Al publicar la 1.2.0, Play Console pidió una **declaración de permisos de servicio en primer
plano**, aunque el binario de la 1.2.0 no los pide. La pedía la pista de prueba cerrada **«Alpha»**,
que seguía sirviendo el `versionCode` 4 (la 1.0.0, de antes del bloqueo).

- **La salida:** pausar la pista «Alpha» o publicar en ella la versión actual.
- **No hay que declarar** «Reproducción de contenido multimedia» ni «Otro». Declararlo sería decirle
  a Google que la app usa una función que no tiene.

Regla general: si Play pide una declaración que no encaja con lo que hace la versión nueva, antes
de rellenar nada mira **qué binario sirve cada pista** (producción, prueba abierta, prueba cerrada y
pruebas internas). Lo más probable es que la pida un binario viejo que sigue activo en alguna.

## 9. Por qué el servidor no puede cambiar la forma de sus respuestas

Esto es para quien toque `quejate-backend`.

- **La dirección de la API va compilada dentro del binario.** `EXPO_PUBLIC_API_URL` se sustituye por
  su valor al compilar (es lo que hace Expo con toda variable `EXPO_PUBLIC_*`; ⚠️ documentación de
  Expo, no comprobado en un binario). La leen `src/core/api/client.ts:13`,
  `src/core/auth/useAuth.ts:87` y `src/features/pqr/utils/legalDocShare.ts:24`. Hasta el nombre de
  la cookie de sesión depende de ella (`src/core/auth/SecureStorage.ts:3-6`).
- **El código que lee cada respuesta también va dentro**, y no se actualiza sin pasar por Play (§1).
- **La gente tarda en actualizar.** Play no obliga, la app tampoco, y un teléfono sin
  actualizaciones automáticas puede seguir meses con una versión vieja.

Consecuencias para el backend:

- **Solo cambios que sumen:** campos nuevos, sí. Quitar un campo, renombrarlo o cambiarle el tipo
  rompe las versiones que lo leen, y no hay forma de arreglarlas desde el servidor.
- **No exijas un campo nuevo en una petición** (`POST`, `PATCH`) sin aceptar también las que llegan
  sin él: las versiones viejas no lo mandan.
- **No retires un endpoint ni cambies de host** mientras haya versiones vivas que lo usen. Un cambio
  de host necesita una versión nueva de la app, y las anteriores seguirán llamando al host viejo.
- **Antes de quitar algo**, mira en Play Console qué versiones siguen instaladas (⚠️ en las
  estadísticas de la app; no he comprobado dónde exactamente) y busca el campo en el código de cada
  una: `git show <commit>:<fichero>`.

Commits de las versiones de tienda que constan:

| Versión | `versionCode` | Commit | Fuente |
|---|---|---|---|
| 1.0.0 | 4 | ⚠️ no consta | El responsable: es la que servía la pista «Alpha» |
| 1.1.0 | 10 | `a4a93fc` (merge del #27), compilada el 28/09 | `1.2.0/publicacion.md`, §3 |
| 1.2.0 | 13 | `7f4174c` (merge del #38), compilada el 23/10 | Play Console (27/10) y `eas build:list`; `1.2.0/publicacion.md`, §8.3 |

Para la próxima, anota en su documento el `versionCode` y el commit que dice el registro del build:
sin eso, saber qué código tiene un teléfono es adivinar.

## 10. Los avisos de Play Console y los plazos de Google (30/10/2026)

El 27/10, Play Console muestra tres avisos para el `versionCode` 13 (la 1.2.0). Los anotó el
responsable; yo no los he visto en la consola. Ninguno impidió publicarla, pero el primero tiene
plazo. **No hay nada hecho todavía:** `app.config.js` y el código siguen como estaban. Los apartados
10.1 a 10.3 explican de dónde sale cada aviso y qué supone arreglarlo.

Los apartados 10.4 y 10.5 salen de otro sitio: el
[aviso general de cambios de política del 29/10/2026](https://support.google.com/googleplay/android-developer/answer/18100766?hl=en),
que es para todas las apps, no para esta versión. Lo leí el 30/10 en la ayuda de Play, junto con las
páginas que enlaza.

**El resto de ese aviso no aplica a esta app:** red local, contactos, AppFunctions, suscripciones,
acceso a todos los archivos, accesibilidad, anuncios de familias, criptomonedas, SMS y registro de
llamadas, pagos, Japón, coches y Android XR. La app no pide ninguno de esos permisos, no vende nada,
no es un juego y no tiene versión para coches ni para XR.

✅ Comprobado el 30/10 sobre `fe9c8dd`. El manifiesto final sale de juntar varias capas, así que se
miraron todas, buscando `ACCESS_LOCAL_NETWORK`, `NEARBY_WIFI_DEVICES`, `READ_CONTACTS`,
`WRITE_CONTACTS`, `EXECUTE_APP_FUNCTIONS`, `com.android.vending.BILLING`,
`MANAGE_EXTERNAL_STORAGE`, `BIND_ACCESSIBILITY_SERVICE`, `com.google.android.gms.permission.AD_ID`,
`READ_SMS`, `SEND_SMS`, `RECEIVE_SMS`, `READ_CALL_LOG`, `WRITE_CALL_LOG`, `androidx.car.app`,
`android.hardware.xr` y `androidx.xr`. No apareció ninguno:

- **`app.config.js`, `package.json` y `src/`.** Tampoco hay librerías de pagos, anuncios ni
  criptomonedas en `package-lock.json`.
- **El manifiesto que genera Expo.** Se generó con `npx expo prebuild --platform android
  --no-install` en una copia sin `.env`, que es el paso que EAS hace en cada build. (El `android/` de
  la máquina de trabajo es de mayo y no sirve.) Pide diez permisos: los dos de ubicación, `CAMERA`,
  `INTERNET`, `MODIFY_AUDIO_SETTINGS`, `READ_EXTERNAL_STORAGE`, `RECORD_AUDIO`,
  `SYSTEM_ALERT_WINDOW`, `VIBRATE` y `WRITE_EXTERNAL_STORAGE`.
- **Las librerías.** Los `AndroidManifest.xml` de `node_modules` solo añaden `ACCESS_NETWORK_STATE` y
  `POST_NOTIFICATIONS`. Tampoco hay ninguno en los 145 AAR de la caché de Gradle de la máquina de
  trabajo, entre ellos `firebase-messaging` y Play Services.

⚠️ Falta el manifiesto del AAB publicado, que necesita sesión: la caché de Gradle es de compilaciones
locales anteriores, no de la 13. Repite la comprobación si entra una librería con código nativo.

**Lo que aparece y no es de esa lista.** `READ_EXTERNAL_STORAGE` y `WRITE_EXTERNAL_STORAGE` los traen
la plantilla de Expo, el plugin de `expo-file-system` y varias librerías; `SYSTEM_ALERT_WINDOW`, la
plantilla. Ninguno es el acceso a todos los archivos, que es `MANAGE_EXTERNAL_STORAGE`. Pero el
comentario de `app.config.js:51` se equivoca: dice que no se declara `READ_EXTERNAL_STORAGE`, y el
manifiesto generado lo lleva porque nadie lo bloquea.

**Lo que tampoco está en esa lista y sí hay que mirar:**

- **Memoria (febrero de 2027).** El aviso habla de «memoria y optimización del código», y el §10.1
  solo cubre lo segundo. Según la
  [página de esos requisitos](https://support.google.com/googleplay/android-developer/answer/17492799?hl=en),
  habrá umbrales de memoria por tipo de teléfono, medidos con los últimos 28 días. Se ven en Play
  Console, en **Android vitals**. ⚠️ No he visto los datos de la app.
- **Optimización (febrero de 2027).** Esa página pone el mínimo en un 25 % de ofuscación, otro de
  optimización y otro de reducción, y solo para apps con más de 10 MB de código DEX. ⚠️ No sé cuánto
  tiene la 13: se ve en el **Explorador de app bundles**. Míralo antes de activar R8 (§10.1), que
  obliga a probar la app entera.
- **Restaurar la sesión (abril de 2027).** Está en esa página, aunque el aviso no lo nombra: las apps
  con inicio de sesión tendrán que restaurarlo sin pedir nada al pasar a un teléfono nuevo
  (*zero-tap sign-in restoration*, con la API Restore Credentials). La app tiene inicio de sesión y
  ni `src/` ni `@react-native-google-signin` usan esa API. ⚠️ Nadie ha mirado qué supone, y Google
  dice que publicará más detalles.
- **«Comportamiento engañoso» y Play Age Signals.** No piden nada a esta app. El primero aclara que
  no se puede manipular la revisión de Play; el segundo es una API que la app no usa.

### 10.1 «DEX code optimization is below our threshold» (con plazo)

- **Qué dice:** la ofuscación del código está al 2 %. Play pide arreglarlo **antes de febrero de
  2027**; si no, puede afectar a la visibilidad de la app y a la publicación de versiones nuevas.
- **Por qué pasa:** la compilación de release no activa R8, el optimizador y ofuscador de Android.
  El proyecto nativo no está en el repositorio (`android/` está en `.gitignore` y en `.easignore`),
  así que EAS lo genera en cada build desde la plantilla de la SDK 54. En esa plantilla,
  `minifyEnabled` lee la propiedad `android.enableMinifyInReleaseBuilds` y vale `false` si nadie la
  pone. Fuente: la plantilla `expo-template-bare-minimum` 54.0.54, `android/app/build.gradle:69` y
  `:118`.
- **La opción que lo activa** en Expo SDK 54 es `enableMinifyInReleaseBuilds`, dentro de `android`
  en el plugin `expo-build-properties`. La documentación dice: «Enable R8 in release builds to
  obfuscate Java code and reduce app size.» Fuentes: la
  [documentación de `expo-build-properties` para la SDK 54](https://docs.expo.dev/versions/v54.0.0/sdk/build-properties/)
  y el tipo de la versión que instala esta SDK (`~1.0.10`, según
  `node_modules/expo/bundledNativeModules.json`): `build/pluginConfig.d.ts:51`. El plugin la escribe
  en `gradle.properties` como `android.enableMinifyInReleaseBuilds` (`build/android.js:62`), que es
  la propiedad que lee la plantilla. La documentación propone usarla junto con
  `enableShrinkResourcesInReleaseBuilds`, que quita los recursos que no se usan.
- **Cómo se activaría** (⚠️ no lo he hecho ni compilado): `npx expo install expo-build-properties`
  (hoy no está en `package.json`) y, en `plugins` de `app.config.js`:

  ```js
  ['expo-build-properties', { android: { enableMinifyInReleaseBuilds: true } }],
  ```

- 🔴 **Después hay que probar la app entera**, no solo lo nuevo. R8 quita y renombra las clases que
  cree que nadie usa, y eso rompe las librerías que las buscan por reflexión. El fallo no sale al
  compilar: sale al usar esa función, y solo en el binario de release. Si una librería se rompe, las
  reglas para conservar sus clases van en `extraProguardRules`, del mismo plugin. Prueba, con un
  binario instalado desde «Pruebas internas» (§6.2) y **sin enviar nada**: entrar y salir con
  Google, las notificaciones, crear una PQRSD con foto, vídeo y ubicación hasta la confirmación, el
  mapa, el sonómetro, la tutela y el oficio hasta el borrador, y descargar y compartir los PDF.
- ⚠️ Con el código ofuscado, los informes de fallos de Play solo se leen si Play tiene el fichero
  de desofuscación de esa versión. No he comprobado si llega solo con el AAB de EAS: míralo en Play
  Console antes de fiarte de esos informes.

### 10.2 «Your app uses deprecated APIs or parameters for edge-to-edge»

- `app.config.js:38` tiene `edgeToEdgeEnabled: true`: la app ya se dibuja de borde a borde. El
  aviso va de otra cosa: el binario llama a APIs que Android 15 marcó como obsoletas para colorear
  las barras del sistema (`Window.setStatusBarColor`, `Window.setNavigationBarColor`) o a los modos
  de recorte `LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES` y `_DEFAULT`. Suele venir de librerías que
  aún las usan, no del código de la app: `src/` no tiene código nativo.
- **Candidatos** en el código Android de las librerías instaladas (búsqueda en `node_modules` del
  27/10):

  | Librería | Versión | Dónde |
  |---|---|---|
  | React Native | 0.81.5 | `ReactAndroid/.../modules/statusbar/StatusBarModule.kt:73` y `:78` (color de la barra de estado); `ReactAndroid/.../views/view/WindowUtil.kt:78`, `:96` y `:132` (modos de recorte) |
  | react-native-screens | 4.16.0 | `android/.../rnscreens/ScreenWindowTraits.kt:116` (barra de estado) y `:224` (barra de navegación) |
  | expo-image-picker | 17.0.11 | `android/.../imagepicker/ExpoCropImageUtils.kt:84` (la pantalla de recortar) |

- ⚠️ **Por averiguar:** cuáles de esos señala Play de verdad. Las dependencias que llegan ya
  compiladas (androidx, Material Components, Google Sign-In, o
  `com.vanniktech:android-image-cropper` 4.6.0, que trae expo-image-picker) no se pueden buscar así
  y también pueden estar detrás. Si el detalle del aviso en Play Console nombra clases,
  compáralas con la tabla. Lo esperable es que se arregle al actualizar esas librerías (en la
  práctica, con una SDK de Expo nueva), no tocando la app.

### 10.3 «Remove resizability and orientation restrictions» (pantallas grandes)

- `app.config.js:21` fija `orientation: 'portrait'`: la app pide ir siempre en vertical.
- **En tabletas con Android 16 eso ya no se cumple.** La 1.2.0 se compila para el API 36 (Android
  16): la SDK 54 toma el `targetSdk` de `node_modules/react-native/gradle/libs.versions.toml:4`
  (⚠️ deducido del código instalado, no leído del binario). Para esas apps, Android 16 ignora
  `screenOrientation` y las restricciones de tamaño en pantallas de 600 dp o más de ancho mínimo
  (tabletas, plegables abiertos): la app llena la pantalla y gira. En los teléfonos sigue en
  vertical. Fuente: [cambios de comportamiento de Android 16](https://developer.android.com/about/versions/16/behavior-changes-16),
  «Adaptive layouts».
- **Quitar `orientation: 'portrait'`** haría girar la app también en los teléfonos. Obliga a revisar
  todas las pantallas en tableta y en horizontal: los formularios con el teclado abierto, el mapa,
  la cámara, el sonómetro, las listas y los modales. ⚠️ No consta que nadie haya mirado la app en
  una tableta ni en horizontal, y por lo de arriba, en una tableta con Android 16 ya puede verse así.
- Android deja aplazarlo con la propiedad `android.window.PROPERTY_COMPAT_ALLOW_RESTRICTED_RESIZABILITY`,
  pero va en sentido contrario a lo que pide el aviso, y la misma página avisa de que deja de valer
  cuando la app apunte al API 37.

### 10.4 La ubicación exacta (antes del 27/01/2027)

**Qué pide Google**, según el aviso y la
[página de alcance mínimo de la ubicación](https://support.google.com/googleplay/android-developer/answer/17033915?hl=en):

- **Alcance mínimo:** cada app tiene que usar solo la ubicación que necesita su función.
- **Botón de ubicación de Android:** obligatorio en los usos puntuales para las apps con API 37 o
  superior (Android 17). Como ejemplos, la página pone buscar cerca, compartir la posición una vez,
  añadir un lugar a lo que publica la persona y rellenar una dirección.
- **Declaración en Play Console:** las apps con `ACCESS_FINE_LOCATION` tienen que justificar por qué
  no les basta la ubicación aproximada ni ese botón. La página dice que estará disponible en
  noviembre de 2026.
- **Fechas:** la política es obligatoria el **27/01/2027**. La página anuncia una prórroga de 30 días
  que se pide en Play Console.

**Qué hace la app hoy** (✅ leído el 30/10 sobre `fe9c8dd`). `app.config.js:47-48` declara
`ACCESS_FINE_LOCATION` y `ACCESS_COARSE_LOCATION`, solo en primer plano: la prueba «no activa ninguna
opción de plugin que necesite un servicio en primer plano» (`__tests__/appConfig.test.ts:75`) falla
si alguien activa el segundo plano. Se compila para el API 36 (§10.3), así que el botón todavía no se
le exige. La posición se lee en tres sitios:

| Dónde | Cuándo se lee | Para qué | ¿Necesita la exacta? |
|---|---|---|---|
| `src/features/map/components/MiniMap.tsx:67-69` (dentro de `LocationPicker.tsx:142`) | Cuando la persona pulsa «Mi ubicación» | Poner en el mapa el lugar del problema | Es el único caso con argumento |
| `src/features/entities/hooks/useEntityLocationFilter.ts:43-46` | **Sola, al abrir la pestaña Entidades** (`:70-76`), y con «Filtrar por mi ubicación» (`EntityListScreen.tsx:225`) | Detectar el departamento y el municipio | No |
| `src/features/pqr/components/create/EntitySelector.tsx:117-119` | **Sola, al entrar a radicar** sin entidad ni categoría elegidas (`:146-153`, `CreatePQRScreen.tsx:368-372`), y con su botón (`:253`) | Detectar el departamento y el municipio | No |

`src/features/pqr/components/detail/DetailHeader.tsx:60` también usa `expo-location`, pero no lee el
teléfono: convierte en dirección las coordenadas de una PQRSD.

Tres datos que hay que tener delante al responder:

- **La app nunca pide más que `Balanced`.** `MiniMap` no indica precisión y ese es el valor por
  defecto en Android (`expo-location` 19.0.8, `LocationArguments.kt:22`). Android lo
  [describe](https://developer.android.com/develop/sensors-and-location/location/change-location-settings)
  como la precisión de una cuadra, unos 100 m. La aproximada tiene un margen de
  [unos 3 km²](https://developer.android.com/develop/sensors-and-location/location/permissions).
- **La ubicación es opcional.** El punto se puede poner tocando el mapa, sin ningún permiso
  (`MiniMap.tsx:61-64`), y una PQRSD se radica también sin él.
- **La app ya funciona con la aproximada.** Si la persona la elige en el diálogo de Android,
  `expo-location` da el permiso por concedido (`LocationModule.kt:314-331`) y el pin cae con ese
  margen, sin avisarle. ⚠️ Leído en el código, no probado en un teléfono.

**Qué responder en la declaración.** Según esa página, hace dos preguntas (⚠️ no he visto el
formulario):

1. *Qué funciones necesitan `ACCESS_FINE_LOCATION`.* Elige **«Location tagging by user»** (añadir un
   lugar a lo que crea la persona) y nombra solo «Mi ubicación», al crear una PQRSD.
2. *Por qué no bastan `ACCESS_COARSE_LOCATION` ni el botón, y por qué hace falta la exacta de forma
   continuada.* Un borrador que se ajusta a lo que hace la app:

   > Quéjate permite señalar en el mapa el lugar de un problema para que la entidad competente pueda
   > encontrarlo. El botón «Mi ubicación» lee la posición una sola vez, con la app abierta y cuando
   > la persona lo pulsa. La ubicación aproximada, con un margen de unos 3 km², no distingue la
   > calle ni la cuadra. La app se compila hoy para el API 36 y todavía no usa el botón de ubicación
   > de Android, que Google exige desde el API 37. No hay seguimiento continuo ni ubicación en
   > segundo plano. La ubicación es opcional: la persona también puede marcar el punto tocando el
   > mapa.

Antes de enviarla:

- 🔴 **Esa respuesta es débil, y conviene saberlo.** Las preguntas frecuentes de la página dicen que
  `ACCESS_FINE_LOCATION` solo vale para una función central y continua, como la navegación paso a
  paso, y ponen añadir un lugar como caso del botón. «Mi ubicación» es una lectura puntual: no hay
  nada «continuado» que justificar, y Google puede rechazarla.
- 🔴 **No digas que la app solo lee la ubicación cuando la persona lo pide.** Dos de los tres sitios
  la leen solos. Ya lo señala el §1.3 de
  [`1.1.0/seguridad-de-los-datos.md`](./1.1.0/seguridad-de-los-datos.md), con la frase de la política
  de privacidad con la que choca.
- **No justifiques la exacta con el departamento o el municipio.** Los ejemplos de ubicación
  aproximada que da Google son de este nivel: lo que pasa en una ciudad o en una zona.
- **Tiene que decir lo mismo que «Seguridad de los datos».** El §5.2 de ese documento propone la
  ubicación precisa para el punto de la PQRSD y la aproximada para el departamento y el municipio.

**Si Google no la acepta,** o si se decide no pedirla, la salida es quitar la exacta. Envía la
declaración en cuanto se abra, para que quede tiempo de publicar ese binario antes de la fecha.

- Hay que añadir `android.permission.ACCESS_FINE_LOCATION` a `blockedPermissions` y borrar
  `app.config.js:47`. Borrar la línea no basta: `expo-location` lo pide en su propio manifiesto y en
  su plugin.
- «Mi ubicación» dejaría el pin con el margen de la aproximada, y la persona tendría que corregirlo
  tocando el mapa.
- Necesita un binario nuevo (§1) y repasar «Seguridad de los datos» (§8.1). Si un binario viejo con
  el permiso sigue activo en alguna pista, puede seguir contando (§8.3).
- ⚠️ No lo he compilado ni probado en un teléfono.

**Cuando la app pase al API 37,** el botón será obligatorio para «Mi ubicación». Míralo al subir de
SDK de Expo: el `targetSdk` sale de `node_modules/react-native/gradle/libs.versions.toml:4`.
`expo-location` 19.0.8 no trae ese botón, así que hará falta una versión que lo traiga o código
nativo, y el permiso tendrá que ir con `android:usesPermissionFlags="onlyForLocationButton"`.
⚠️ No he mirado cómo se pone esa marca desde Expo.

**Qué no se pudo comprobar:**

- 🔴 **El aviso no aclara si la declaración se exige ya a una app con API 36.** Hay que mirarlo en
  Play Console, y no hay que darlo por seguro en ningún sentido. La página de alcance mínimo habla de
  «all apps requesting precise location», sin nombrar ningún API, pero sus fechas hablan de las apps
  «in scope» sin definirlas, y la
  [tabla de plazos de Google](https://support.google.com/googleplay/android-developer/table/12921780?hl=en)
  tampoco nombra ningún API. Desde noviembre de 2026, busca en **Contenido de la app** si la consola
  la pide para esta app. Hasta verlo, trabaja como si la pidiera: si no, puede tocar publicar un
  binario con prisa.
- ⚠️ Cómo es el formulario de verdad: si pide vídeo y cuánto tarda la revisión.
- ⚠️ Qué le pasa a una app con API 36 que llegue al 27/01/2027 sin declaración. La página solo dice
  que las apps «in scope» quedan expuestas a medidas de Google.
- ⚠️ El `targetSdk` del binario publicado: el API 36 está deducido del código instalado (§10.3).

### 10.5 El estado de comerciante (desde noviembre de 2026)

- **Qué pide Google.** Toda cuenta de desarrollador activa tiene que declarar si es comerciante o no
  (*trader* o *non-trader*) según las leyes del Espacio Económico Europeo y del Reino Unido, se
  distribuya o no allí. El aviso dice que hay que hacerlo desde noviembre de 2026, y la
  [página de ayuda](https://support.google.com/googleplay/android-developer/answer/17594752?hl=en)
  da el límite de las cuentas existentes: **el 01/02/2027**.
- **Si no se hace:** esa página avisa de bloqueo de actualizaciones y de retirada de Play en todo el
  mundo.
- **Es un dato de la cuenta, no de la app.** No se toca el código ni hace falta compilar. Lo hace
  **el dueño de la cuenta**, en Play Console: *Manage account > Account details > About you*
  (⚠️ ruta de la ayuda en inglés; no la he visto en la consola). El §2 dice que no consta quién es:
  sin esa persona, esto no se puede hacer.
- **Qué responder lo decide el dueño, no quien publica.** No consta en el repositorio y no es una
  decisión técnica. Lo que dice la página:
  - Comerciante es quien actúa por su oficio o negocio. Da como criterios el ánimo de lucro, el
    volumen, llevar las apps como una empresa y tener personalidad jurídica (por ejemplo, un
    D-U-N-S).
  - Quien no distribuye en el Espacio Económico Europeo ni en el Reino Unido puede declararse
    *non-trader*. ⚠️ Una nota de junio de 2026 dice que la app salió solo en Colombia, pero ningún
    documento del repositorio lo recoge: míralo en Play Console.
  - Declararse *non-trader* sin serlo puede acabar en la suspensión de la cuenta.
  - Google no asesora en esto y recomienda a un profesional si hay dudas.
- **Si se declara comerciante, hay más pasos, también sin código:** confirmar el estado de la app en
  *Monitor and improve > Policy and programs > App content*, comprometerse a cumplir las leyes
  aplicables y dar el enlace a los términos de la app. Desde el 01/03/2027, Play enseña los datos de
  contacto, y en una cuenta personal, también el teléfono y la dirección.

## 11. Lista corta

- [ ] Rama desde `main`: `version` en `app.config.js` y `PUBLISHED_VERSION` en
  `__tests__/appConfig.test.ts`.
- [ ] `npm run typecheck` y `npm test` en verde.
- [ ] Documento de la versión con qué entra, las notas (500 caracteres como mucho) y lo que cambie
  en «Seguridad de los datos». PR y merge.
- [ ] `main` actualizado y `git status` limpio.
- [ ] `eas build --platform android --profile production`, y el registro revisado (§5.4).
- [ ] AAB a «Pruebas internas» con las notas.
- [ ] Instalada desde Play: «Quéjate v» con la versión nueva, entrar con Google, notificaciones, lo
  nuevo sin enviar nada.
- [ ] «Seguridad de los datos» y declaraciones al día. Si Play pide una declaración que no encaja,
  mira qué sirve cada pista (§8.3).
- [ ] Los avisos de Play Console (§10): si sigue alguno abierto y si su plazo vence antes de la
  siguiente versión. Fechas: el estado de comerciante se declara desde noviembre de 2026 y hasta el
  01/02/2027, y lo hace el dueño de la cuenta (§10.5); la ubicación exacta, antes del 27/01/2027
  (§10.4); la optimización del código vence en febrero de 2027 (§10.1).
- [ ] Promocionar esa misma versión a producción y enviar a revisión.
- [ ] Anotar en el documento de la versión la fecha, el `versionCode` y el commit.
