# Cómo publicar una versión de la app en Google Play

Escrito el 26/10/2026, el día en que la 1.2.0 salió a producción, para quien publique la siguiente
sin haberlo hecho nunca. Solo cubre Android y Google Play: es la única tienda con perfil de envío
en `eas.json` (`submit.production.android`).

Cada orden lleva al lado de dónde sale:

- ✅ **Comprobada:** existe en `package.json`, o la ayuda del `eas-cli` instalado (18.4.0) la
  describe así, o la he ejecutado sin sesión.
- ⚠️ **Sin comprobar:** sale de la documentación de Expo o de Google, o de lo que se hizo en
  versiones anteriores, pero no la he podido ejecutar (necesita una sesión real de Expo o de Play
  Console, y este documento se escribió sin usar ninguna).

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

- Antes de compilar: `eas build:version:get --platform android`. ✅ `eas build:version:get --help`
  («get the latest version from EAS servers»); ⚠️ necesita sesión, no la he ejecutado. El 22/10,
  antes de compilar la 1.2.0, devolvía **10**.
- Durante la compilación: en el registro, fase `CONFIGURE_ANDROID_VERSION`, la línea
  `Version code: N` (así lo anotó la 1.2.0, §6 de su documento).
- En Play Console: **Explorador de app bundles** lista cada binario subido con su `versionCode`.

⚠️ No he comprobado qué `versionCode` recibió la 1.2.0. Si nadie compiló nada entre el 22/10 y la
publicación, fue el 11. Anótalo en su documento cuando lo mires.

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
- la dirección, opcional;
- lo que se manda a la entidad que eligió el ciudadano no cuenta como «compartido»;
- «Historial de búsqueda en la app», declarado: opcional, para la funcionalidad de la app;
- OpenAI y la información de salud, como en la 1.1.0 (⚠️ el repositorio no recoge qué se respondió
  entonces: el PR #26 las dejó como decisión, en su §5.3, y recomendaba declarar OpenAI como
  compartido);
- Google Analytics no se declara: desde el PR #194 de `quejate-app`, la web no carga Google Tag
  Manager en `/policy` ni en `/terms`, que son las páginas que la app abre dentro de un WebView
  (`src/shared/constants/legalUrls.ts`). Si la app empieza a abrir otra página de la web dentro de
  ella, vuelve a mirarlo.

### 8.2 Las declaraciones de permisos

Play pide una declaración (a veces con un vídeo) por cada permiso sensible del manifiesto: servicios
en primer plano, ubicación en segundo plano, fotos y vídeos, etc. Hoy el manifiesto no pide ninguno
de los que la obligan:

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
| 1.2.0 | ⚠️ 11 si nada se compiló entre medias | ⚠️ no consta; `main` estaba en `7f4174c` el 26/10 | `1.2.0/publicacion.md`, §2 |

Para la próxima, anota en su documento el `versionCode` y el commit que dice el registro del build:
sin eso, saber qué código tiene un teléfono es adivinar.

## 10. Lista corta

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
- [ ] Promocionar esa misma versión a producción y enviar a revisión.
- [ ] Anotar en el documento de la versión la fecha, el `versionCode` y el commit.
