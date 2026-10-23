# Publicación 1.2.0 en Google Play

Preparada el 22/10/2026 sobre `origin/main` en `d925e6d`. Esta rama cambia la versión visible
(`app.config.js:20`) y la prueba que la compara con la publicada (`__tests__/appConfig.test.ts:16`),
hace que el pie del perfil lea esa versión en lugar de un número escrito a mano (§2), y añade estos
dos documentos. No toca `eas.json` ni el resto del código. Compilar, subir y enviar a revisión lo
hace el responsable.

Lo que cambia en el formulario de «Seguridad de los datos» está aparte, en
[`seguridad-de-los-datos.md`](./seguridad-de-los-datos.md).

## 1. Estado de `main`

- `origin/main` está en `d925e6d` (merge del #35), igual que el `main` local de la máquina de
  trabajo.
- En esta rama, con la versión ya en `1.2.0`: `npm run typecheck` limpio y `npm test` con 36 suites
  y 430 pruebas en verde.
- El árbol está limpio salvo `assets/quejate-banner.png` sin versionar, que ya estaba y la app no
  usa.
- ⚠️ **El PR #36** (`fix/oversight-in-brand-blue`, el oficio en azul en lugar de morado) sigue
  abierto y **no está en `main`**. Si se mergea antes de compilar, las notas no cambian; cambia el
  commit que hay que buscar en el registro de EAS (§6).

## 2. Versión y `versionCode`

- **Versión visible: `1.2.0`** (`app.config.js:20`). La publicada es la `1.1.0`
  (`__tests__/appConfig.test.ts:16`; la prueba exige que la nueva sea mayor).
- **El `versionCode` lo asigna EAS**: `eas.json:4` declara `appVersionSource: "remote"` y el
  perfil `production` tiene `autoIncrement` (`eas.json:18`). Hoy vale **10**
  (`eas build:version:get --platform android`, leído el 22/10 sin compilar nada). **El próximo AAB
  será el 11**, y el registro lo dice en la fase `CONFIGURE_ANDROID_VERSION` (`Version code: 11`).
- El `versionCode: 1` de `app.config.js:44` es un marcador que EAS ignora. La prueba
  `deja el versionCode en manos de EAS` (`__tests__/appConfig.test.ts:49-52`) comprueba
  `appVersionSource` y `autoIncrement`.
- **Nada nativo ha cambiado desde la 10.** Entre `a4a93fc` (la 10) y `d925e6d`, el diff no toca
  `package.json`, `package-lock.json`, `app.config.js` ni `eas.json`: mismas dependencias, mismos
  permisos y el mismo manifiesto. La 1.2.0 es código JavaScript sobre la base de la 10, más el
  número de versión de esta rama.

### El pie del perfil lee la versión de la configuración

Hasta ahora el pie del perfil tenía la versión escrita a mano, `const APP_VERSION = '1.0.0'`, desde
mayo (`d52110d`): la 1.1.0 publicada enseña «Quéjate v1.0.0». En esta rama la lee de
`Constants.expoConfig?.version` (`src/features/users/screens/UserProfileScreen.tsx:149`), que en el
binario es la configuración de `app.config.js` que EAS mete en la compilación. Es el mismo objeto del
que `usePushNotifications.ts:37` saca el `projectId` de las notificaciones, que funcionan en la
versión de tienda. Si no llega ninguna versión, el pie no se pinta (`:330-334`).

La prueba (`src/features/users/screens/__tests__/UserProfileScreen.test.tsx`) tiene que darle a
`expo-constants` la configuración de `app.config.js`, porque en Jest llega vacía. Comprueba que el
pie dice `Quéjate v` más la versión de `app.config.js`, y que no dice nada sin configuración, sin
versión o con la versión vacía. Con el literal de antes fallan las cuatro. Que el binario la traiga
de verdad solo se ve en el teléfono (§6).

## 3. Qué entra

La 10 se compiló desde `a4a93fc` (merge del #27) el 28/09/2026, la última de tienda
(`eas build:list --platform android`). Desde entonces han entrado los PR #28 a #35 y el #38:

| PR | Qué nota el ciudadano | Dónde |
|---|---|---|
| #28 | Buscar personas por nombre desde el muro y abrir su perfil | Icono en la cabecera del muro (`PQRListScreen.tsx:294`), pantalla «Buscar personas» (`AppNavigator.tsx:58`) |
| #29 | La búsqueda del muro mira todo el muro (hasta las 500 PQRSD más recientes) y no solo lo cargado; no distingue tildes ni mayúsculas, pero la ñ no casa con la n | `useWallSearch.ts:9-20` |
| #30 | Mis PQRSD filtra por estado y cuenta sobre la lista entera, no sobre las páginas cargadas | `MyPQRsScreen.tsx`, `useMyPQRsFilter.ts` |
| #31 | El perfil público enseña el estado que el detalle acaba de refrescar | `PublicProfileScreen.tsx` |
| #32 | Si falla cargar más PQRSD, el muro se queda en pantalla con «Reintentar» | `PQRListScreen.tsx:275-278` |
| #33 | Oficio al ente de control: tercera tarjeta de «Seguimiento formal» para una PQRSD vencida; se elige el ente, se redacta el borrador, se descarga en PDF o se envía por correo | `FormalFollowupScreen.tsx:81-82`, `OversightLetterScreen.tsx` |
| #34 | Antes de enviar: el aviso de facilitador y la autorización junto al botón; al marcar «anónima», qué implica; el aviso de borrador con IA en la tutela y el oficio; el recordatorio de esperar la nueva fecha antes de una tutela. Nombres nuevos: «N.º de seguimiento», «constancia de envío» y «enviadas» en Mis PQRSD | `Confirmation.tsx:144-183`, `TypeAndContent.tsx:30`, `OverdueModal.tsx:64-65`, `DetailHeader.tsx:209`, `PQRActionsSheet.tsx:150`, `MyPQRsScreen.tsx:207` |
| #35 | «Anónima» se apaga sola si la entidad no la admite; si el servidor rechaza el envío, se lee el motivo; tras un envío fallido se vuelve a pedir el captcha | `CreatePQRScreen.tsx:149`, `:311-325` |
| #38 | En el detalle de su PQRSD, el autor ve «Seguimiento del envío»: enviada a la entidad, cuándo la entidad abrió el enlace del correo y cuándo confirmó que la recibió, con su radicado, en hora de Colombia. Solo en las PQRSD enviadas desde el 21/10 y con el PR #80 del backend desplegado | `DetailHeader.tsx:355`, `EntityLinkTimeline.tsx` |

## 4. Notas de la versión

Para ciudadanos, en español, dentro del límite de 500 caracteres de Play.

**Para pegar** (498 caracteres):

```text
Novedades:
• Si tu PQRSD venció, en Seguimiento formal prepara un oficio al ente de control, descárgalo en PDF o envíalo por correo.
• En tus PQRSD nuevas ves cuándo la entidad abrió el enlace y si confirmó que la recibió.
• Busca personas por nombre desde el muro.
• Buscar en el muro y filtrar Mis PQRSD ya no se limita a lo cargado.
• Antes de enviar te contamos qué hace Quéjate y qué implica la opción anónima.
• El código es ahora número de seguimiento, y el certificado, constancia de envío.
```

Contadas con `node` sobre el texto de arriba: 498 caracteres con los seis saltos de línea, sin
salto final; cada viñeta cuenta uno. Por línea: 10, 121, 89, 42, 69, 79 y 82. No llevan raya.

Con la línea del seguimiento del envío (#38) salían 562. Para bajar de 500 se acortaron el oficio,
el muro, la anónima y los nombres sin quitar ninguna novedad: la última línea usa los nombres que
enseña la 1.1.0 publicada («Código» y «Descargar certificado», en `a4a93fc`).

### De dónde sale cada línea

| Línea | PR | Por qué se puede decir así |
|---|---|---|
| Oficio al ente de control | #33 | La tarjeta solo aparece con la PQRSD vencida (`FormalFollowupScreen.tsx:81-82`); el borrador se descarga en PDF y se envía desde la app (`OversightLetterScreen.tsx:228-260`) |
| Cuándo la entidad abrió el enlace y si confirmó | #38 | «Seguimiento del envío» en el detalle (`DetailHeader.tsx:355`, `EntityLinkTimeline.tsx`), con `entityLink` de `GET /pqr/:id` (PR #80 del backend). Solo le llega al autor y solo en las PQRSD enviadas desde el 21/10: de ahí «nuevas» |
| Buscar personas | #28 | Icono «Buscar personas» en la cabecera del muro (`PQRListScreen.tsx:294-299`) |
| Muro y Mis PQRSD sin el límite de lo cargado | #29, #30 | El muro se pide entero hasta 500 (`useWallSearch.ts:9-20`); Mis PQRSD filtra y cuenta sobre la lista completa |
| Qué hace Quéjate y qué implica la anónima | #34 | Aviso de facilitador y autorización en la confirmación (`Confirmation.tsx:144-183`); texto de anónima al encender el interruptor (`TypeAndContent.tsx:30`, `:188-192`) |
| Número de seguimiento y constancia de envío | #34 | `DetailHeader.tsx:209`, `PQRActionsSheet.tsx:150`; antes «Código» y «Descargar certificado» (`a4a93fc`, los mismos ficheros) |

### Lo que las notas no dicen, a propósito

- **Que el ente de control o la entidad vayan a responder o a actuar.** La app envía el oficio; lo
  que haga el ente no depende de ella.
- **Que la entidad vaya a abrir el enlace o a confirmar, ni que el seguimiento salga en todas las
  PQRSD.** La sección lo avisa debajo, y solo existe en las enviadas desde el 21/10 y para su autor.
- **Que el oficio siempre se pueda enviar.** Solo si el ente tiene correo en el directorio; si no,
  la app lo dice y deja descargarlo (`OversightLetterScreen.tsx:392-399`). «Puedes … o enviarlo»
  no promete el envío en todos los casos.
- **«Radicar».** La app ya no lo usa para lo que hace Quéjate (#34), y las notas tampoco.
- **#31, #32 y #35, y el aviso de borrador con IA.** Son arreglos o avisos que no cambian lo que se
  puede hacer; no caben en 500 caracteres sin quitar algo más útil.
- **El oficio en azul (#36).** No está en `main`.

## 5. Antes de compilar: lo que hay que decidir hoy

- [ ] ¿Entra el #36? (§1)
- [ ] ¿Está desplegado el PR #80 del backend? Sin él, `GET /pqr/:id` no manda `entityLink`: la app
  no falla, pero la sección del #38 no sale y la segunda línea de las notas promete algo que no se
  ve.
- [ ] Formulario de «Seguridad de los datos»: las decisiones de
  [`seguridad-de-los-datos.md`](./seguridad-de-los-datos.md) (§7 de ese documento).

## 6. Compilar, comprobar el commit y subir

**Código**

- [ ] Mergea este PR (y lo que se decida en el §5). Después,
  `git switch main && git pull` y `git log -1`: debe ser el merge de este PR o uno posterior.
- [ ] `git status` sin cambios en ficheros versionados. EAS sube el directorio de trabajo; con el
  árbol limpio, lo que compila es exactamente el commit que dirá el registro.

**Compilar**

```sh
eas build --platform android --profile production
```

El entorno de variables es `production` (lo resuelve EAS por el perfil). El 22/10,
`eas build:version:get` cargó de ese entorno `EXPO_PUBLIC_API_URL`,
`EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`,
`EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` y `EXPO_PUBLIC_RECAPTCHA_SITE_KEY`. El fichero secreto
`GOOGLE_SERVICES_JSON` no sale en esa lista, así que no he comprobado que siga ahí. No he leído ni
comparado ningún valor.

**Qué mirar en el registro del build**

- [ ] `EAS_BUILD_PROFILE=production` y `EAS_BUILD_GIT_COMMIT_HASH` con el commit de `git log -1`.
- [ ] *Project environment variables*: `EXPO_PUBLIC_API_URL=https://api.quejate.com.co/api` y las
  otras `EXPO_PUBLIC_*`, con la de Maps como `********`. En *Environment secrets*,
  `GOOGLE_SERVICES_JSON` con una ruta: es el fichero que se cambió el 28/09 y con el que las
  notificaciones funcionan desde la 9. Si falta, el AAB sale sin notificaciones.
- [ ] `READ_APP_CONFIG`: `"version": "1.2.0"`.
- [ ] `CONFIGURE_ANDROID_VERSION`: `Version code: 11`.
- [ ] `PREPARE_CREDENTIALS`: `Signing config injected`, con el keystore que ya tiene EAS. No
  generes credenciales nuevas: Play rechaza un AAB con otra clave de subida.
- [ ] `RUN_GRADLEW`: `> Task :app:processReleaseGoogleServices` y `BUILD SUCCESSFUL`.

**Subir el AAB**

El perfil de envío de hoy (`eas.json:24-30`) no sirve para publicar en producción:

- Tiene `"track": "internal"`: `eas submit --platform android --profile production` deja el
  paquete en **pruebas internas**, sin error.
- No fija `releaseStatus`, que en el `@expo/eas-json` 18.4.0 del `eas-cli` instalado vale
  **`completed`** por defecto (`build/submit/schema.js`, junto a `track`): si alguien cambia solo
  `track` a `production`, la versión sale al 100 % en cuanto Google la aprueba.
- Apunta a `./play-service-account.json`, que no existe en la máquina de trabajo (está en
  `.gitignore:33`): desde ahí, `eas submit` fallaría.

La propuesta de la 1.1.0 para separar `internal` y `production` (con `releaseStatus: "draft"`)
sigue en el PR #26, sin aplicar. Esta rama no toca `eas.json`. Así que la subida es a mano:

1. Descarga el AAB de la página del build en EAS.
2. Play Console → Quéjate → **Pruebas internas** → Crear versión → sube el AAB. Las notas van en
   «Notas de la versión», en español (es-419).
3. Instálalo desde Play en un teléfono y recorre: entrar con Google; Perfil → Notificaciones
   («Activadas en este teléfono»); el pie del perfil, que debe decir «Quéjate v1.2.0»; el muro y
   «Buscar personas»; una PQRSD vencida hasta la pantalla del oficio, **sin enviarlo**; el detalle
   de la PQRSD de prueba a «Quéjate», con «Seguimiento del envío» igual que en la web.
4. Promueve **esa misma versión** a Producción, con el porcentaje de despliegue que decidas, y
   envíala a revisión.

🔴 **No envíes nada de prueba con la app de producción.** Una PQRSD se envía por correo a una
entidad real, y un oficio, a un ente de control real.

## 7. Qué comprobar en Play Console

- [ ] **Explorador de app bundles**: el mayor `versionCode` subido es el 10. EAS solo cuenta lo que
  ha compilado él; si alguna vez se subió un AAB por otra vía, el 11 tiene que seguir siendo mayor.
- [ ] **Producción** tiene la 1.1.0 (10). Si tuviera la 9 o la 8, las notas valen igual: la 10 solo
  añadió el bloqueo de permisos del #27, que no se ve.
- [ ] **Seguridad de los datos**: actualizada con el segundo documento antes de enviar la versión.
- [ ] **Permisos y declaraciones**: el manifiesto es el de la 10 (§2), así que no debería pedir
  declaraciones nuevas. Si Play avisa de un permiso, no es de esta versión: hay que mirarlo antes de
  seguir.
- [ ] **Acceso a la app**: la cuenta de prueba de la revisión sigue siendo la misma. No la borres.
- [ ] **Ficha de la tienda**: si se añade el oficio a la descripción, conserva el aviso de que
  Quéjate no es una entidad del gobierno y las fuentes oficiales, que fueron la causa de los dos
  rechazos por «Misleading Claims». Las notas de la versión no los necesitan porque no citan
  normas ni plazos.
