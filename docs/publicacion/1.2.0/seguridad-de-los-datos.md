# Seguridad de los datos en Google Play: qué cambia en la 1.2.0

No rehace el inventario. Parte del de la 1.1.0, `docs/publicacion/1.1.0/seguridad-de-los-datos.md`
(rama `docs/play-release-1-1-0`, PR #26 sin mergear), y en concreto de su §5.2, que es el
formulario que se recomendó entonces. **No he visto lo que se envió de verdad en Play Console:** si
el formulario publicado se apartó de ese §5.2, hay que comparar contra lo publicado.

Fuentes, leídas el 22/10/2026:

- **App:** `origin/main` en `d925e6d`. Las rutas sin prefijo son de este repositorio.
- **Backend:** `quejate-backend`, `origin/main` en `2f8a1f4`. Se cita como `backend:ruta:línea`.
  Todo su `CHANGELOG.md` está bajo `[Unreleased]`, así que desde aquí no sé qué está desplegado;
  el encargo dice que el formulario de cada entidad se hace cumplir desde el 15/10.
- **Web:** `quejate-app`, `origin/master` en `d9cc091`. Se cita como `web:ruta:línea`. La política
  es `web:app/policy/page.tsx`, «En vigor a partir del 13/10/2026» (`:12`); se cita como
  `política:línea`.
- **Play:** la ayuda de Play Console sobre la sección de seguridad de los datos
  ([10787469](https://support.google.com/googleplay/android-developer/answer/10787469?hl=es-419)),
  en español. Los nombres de tipos y finalidades son los de esa página; el documento de la 1.1.0
  usaba otros parecidos («Gestión de la cuenta» es «Administración de la cuenta»).

## 0. Las reglas de Play que deciden esta revisión

Citas literales de la ayuda:

- **Recopilar:** «"Recopilar" significa transmitir datos desde tu app hacia fuera del dispositivo
  de un usuario».
- **Compartir:** «El "uso compartido" hace referencia a cuando se transfieren a un tercero los
  datos del usuario recopilados desde tu app». No cuentan como compartido, entre otros:
  - «**Proveedores de servicios.** Se refiere a la transferencia de datos del usuario a un
    "proveedor de servicios" que los procese en nombre del desarrollador».
  - «**Acción iniciada por el usuario o divulgación destacada y consentimiento del usuario.**
    Transferencia de datos del usuario a un tercero en función de una acción específica iniciada
    por el usuario, en la que el usuario espera de manera razonable que se compartan los datos, o
    en base a una divulgación destacada en la app y un consentimiento que cumple con los requisitos
    detallados en nuestra Política de datos del usuario».
- **Efímero:** «implica acceder a ellos y usarlos mientras se almacenan solo en la memoria, y
  retenerlos no más del tiempo necesario para atender la solicitud específica en tiempo real». Y
  aun así: «Los datos del usuario transmitidos hacia fuera del dispositivo que se procesan de forma
  efímera deben incluirse en la respuesta del formulario».
- **Opcional u obligatorio:** «puedes declarar un tipo de datos como "opcional" cuando un usuario
  controla su recopilación y puede usar la app sin proporcionarlos, o en los casos en que un usuario
  puede decidir manualmente si proporciona ese tipo de datos. Si la funcionalidad principal de la
  app requiere el tipo de datos, debes declararlos como "obligatorios"». Y en las preguntas
  frecuentes: «No debes describir la recopilación como opcional si es obligatoria para alguno de
  los usuarios de tu app».
- **WebView:** la recopilación «También incluye datos del usuario recopilados de una WebView que se
  abrió desde tu app, si esta controla el código o comportamiento que se implementa a través de esa
  WebView».
- **Tipos que importan aquí:**
  - *ID de usuario:* «identificadores relacionados con una persona identificable. Por ejemplo, un
    ID, número o nombre de cuenta».
  - *Dirección:* «la dirección de un usuario, como una dirección particular o de correo postal».
  - *Otra información:* «cualquier otra información personal, como la fecha de nacimiento, la
    identidad de género, la condición de veterano de guerra, etcétera».
  - *Historial de búsqueda en la app:* «información sobre las búsquedas que realizó el usuario en
    la app».

## 1. Resumen: qué cambia respecto al formulario de la 1.1.0

| Tipo de Play | En la 1.1.0 (§5.2) | En la 1.2.0 | Por qué | ¿Hay que decidir? |
|---|---|---|---|---|
| Actividad en la app → **Historial de búsqueda en la app** | No se recoge | **Recogido: sí.** Compartido: no. No efímero. Opcional. Funcionalidad de la app | El buscador de personas envía al servidor el nombre escrito (§4) | No |
| Información personal → **Otra información** o **ID de usuario** | Otra información: recogido; compartido «sí (conservador)»; opcional | Fuente nueva: el **documento de identidad** que pide la entidad | Los campos propios de cada entidad (§2) | **Sí:** en qué tipo va y si es opcional (§2.3 y §2.4) |
| Información personal → **Dirección** | Recogido; compartido «sí (conservador)»; opcional | Fuente nueva: la **dirección de correspondencia** que pide la entidad | Ídem (§2) | **Sí:** si es opcional (§2.4) |
| Información personal → Nombre, Dirección de correo, Número de teléfono | Sin cambio | Destinatario nuevo: el **ente de control**. No cuenta como compartido | El oficio desde la app (§3) | No, salvo que se quiera la línea conservadora (§3.2) |
| Actividad en la app → Otro contenido generado por usuarios | Compartido «sí (conservador)»: OpenAI | Sin cambio en las respuestas. El oficio desde la app es otra vía hacia OpenAI | §3 | No |
| Actividad en la app → **Interacciones en la app**; **Dispositivo u otros ID** | Recogido y compartido (SDK de Maps). Finalidad: funcionalidad | Posible finalidad nueva: **Análisis**, por Google Analytics en la política y los términos abiertos dentro de la app | No es nuevo de la 1.2.0, pero la 1.1.0 no lo recogió, y la 1.2.0 lo pone en el paso de enviar (§5) | **Sí** (§5.2) |

Lo demás no cambia (§6). Las dos decisiones que la 1.1.0 dejó abiertas (si OpenAI cuenta como
compartido y si se declara información de salud, su §5.3) siguen igual; el oficio desde la app
solo añade otra vía por la que llegan a OpenAI los mismos datos.

## 2. Los datos que pide cada entidad: documento de identidad y dirección

### 2.1 Qué hace la app

El mecanismo no es nuevo: está igual en la 1.1.0. Lo nuevo es que las entidades lo usan para pedir
el documento y la dirección (decisión de la dirección del 05/10/2026,
`backend:src/pqr/custom-field-privacy.ts:16-18`) y que el servidor lo hace cumplir.

- El paso 3 del formulario pinta los campos que configuran la entidad y el área, bajo «Campos
  requeridos por la entidad» (`src/features/pqr/components/create/Attachments.tsx:36-58`), unidos
  por nombre (`src/features/pqr/screens/CreatePQRScreen.tsx:178-201`).
- Un campo marcado como obligatorio no deja pasar de paso si está vacío
  (`CreatePQRScreen.tsx:221-228`), y el servidor rechaza con `400` el envío que llegue sin él
  (`backend:src/pqr/pqr-form.ts:112-145`).
- En una PQRSD anónima, la app no muestra ni envía los campos marcados como no aptos para anónimas
  (`CreatePQRScreen.tsx:203-207`), y el servidor los descarta si llegan
  (`backend:src/pqr/pqr-form.ts:136-144`).
- Los valores salen del teléfono en el cuerpo de `POST /pqr` (`CreatePQRScreen.tsx:279-300`,
  `src/features/pqr/hooks/useCreatePQR.ts:75-93`), por HTTPS.

### 2.2 Adónde van

- **Se guardan** con la PQRSD (`backend:src/pqr/pqr-creation.service.ts:387-388`): no es efímero.
- **Van en el correo a la entidad**, bajo «Información adicional»
  (`backend:src/pqr/pqr-creation.service.ts:554`, `backend:src/pqr/mail/pqr-mail.service.ts:719-726`).
- **Solo los leen** el autor, el personal de la entidad destinataria y `SUPER_ADMIN`; al resto les
  llegan vacíos en el muro, el perfil y el detalle
  (`backend:src/pqr/custom-field-privacy.ts:64-72`, aplicado en `backend:src/pqr/pqr.service.ts:392`,
  `:486` y `:569`). La app no los pinta en ninguna pantalla después de enviar.
- **No van a OpenAI**: la tutela tiene su propio formulario y el oficio se arma sin ellos
  (`src/features/pqr/utils/oversightLetter.ts:47-63`).
- **La política** lo dice: «Datos que solicita la entidad destinataria» (`política:117-127`).

### 2.3 🔴 Decisión: en qué tipo de Play se declara el documento de identidad

Play no tiene un tipo propio para un documento de identidad. Hay dos candidatos, y la respuesta de
«compartido» no cambia con ninguno (§2.5):

1. **Otra información.** Es donde la 1.1.0 puso la cédula de la tutela y el documento del abogado.
   Si se elige, la fila solo gana una fuente y sigue siendo una sola para todos los documentos.
2. **ID de usuario.** Su definición («identificadores relacionados con una persona identificable»)
   describe literalmente un número de cédula, aunque sus ejemplos son de cuentas. En la 1.1.0 esa
   fila es la cuenta, ya marcada como **obligatoria** y con la finalidad de administración de la
   cuenta; habría que añadirle «Funcionalidad de la app». Si se elige, por coherencia la cédula de
   la tutela y el documento del abogado deberían pasar también ahí.

Declarar las dos no contradice a Play, pero hace que el mismo dato aparezca dos veces en la ficha.

### 2.4 🔴 Decisión: opcional u obligatorio (documento y dirección)

Afecta a «Otra información» (o «ID de usuario») y a «Dirección», que en la 1.1.0 eran opcionales:

- **A favor de opcional:** la persona escribe el dato a mano y solo si va a enviar una PQRSD a una
  entidad que lo pide; el resto de la app funciona sin él. Encaja con «un usuario puede decidir
  manualmente si proporciona ese tipo de datos».
- **A favor de obligatorio:** con una entidad que lo marque como obligatorio, la PQRSD no se puede
  enviar sin él (`CreatePQRScreen.tsx:224-227`, y el `400` del servidor), y enviar una PQRSD es la
  función principal de la app. La propia política dice que la entidad «puede exigirlos como
  obligatorios para dar trámite a la solicitud» (`política:117-127`), y Play dice que no se
  describa como opcional lo que es obligatorio «para alguno de los usuarios».
- Si para el documento se elige «ID de usuario» (§2.3), esa fila ya es obligatoria y la pregunta
  queda solo para «Dirección».

No he comprobado qué entidades tienen hoy estos campos configurados ni si los marcan como
obligatorios. El 13/10 ninguna PQRSD del muro traía valores
(`backend:src/pqr/custom-field-privacy.ts:24-26`).

### 2.5 Compartido: la entidad no cuenta

Llevar el dato a la entidad que el ciudadano eligió es «una acción específica iniciada por el
usuario, en la que el usuario espera de manera razonable que se compartan los datos». Desde el #34,
además, la confirmación lo dice junto al botón: «Al enviar, autorizas a Quéjate a enviar tu PQRSD a
{entidad}» (`src/features/pqr/components/create/Confirmation.tsx:161-166`), con los valores a la
vista justo encima (`Confirmation.tsx:100-106`). Es la misma regla con la que la 1.1.0 trató el
nombre y el correo que recibe la entidad.

- Si el documento va en **Otra información** y la dirección en **Dirección**, las dos filas ya
  estaban en «compartido: sí (conservador)» por OpenAI: no cambia nada.
- Si el documento va en **ID de usuario**, esa fila sigue en «compartido: no».
- ⚠️ La política usa la palabra en sentido llano: «Estos datos se comparten únicamente con la
  entidad destinataria» (`política:117-127`). No contradice el «no» de Play, que tiene su propia
  definición, pero si se quiere que el formulario use la misma palabra que la política, la opción
  conservadora es marcar «sí». Entonces, por coherencia, también el nombre y el correo, que la
  entidad recibe igual.

## 3. El oficio al ente de control desde la app (#33)

### 3.1 Qué sale y adónde

- **Redactar** (`POST /legal-docs/document`): el nombre del autor (también si la PQRSD es anónima),
  el ente, la entidad, el tipo, la fecha, los días de retraso, la descripción y el departamento y
  municipio **de la entidad**, no del ciudadano (`src/features/pqr/utils/oversightLetter.ts:47-63`,
  `src/features/pqr/hooks/useOversightLetter.ts:56-59` y `:87-108`). El servidor arma el texto con
  OpenAI (`backend:src/legal/prompts/oversight.prompt.ts:83-88`,
  `backend:src/legal/openai/openai-chat.client.ts:14-26`) y lo guarda seis meses
  (`src/features/pqr/utils/legalDocsCopy.ts:11-12`).
- **Enviar** (`POST /legal-docs/:id/send`): de la app solo salen identificadores
  (`useOversightLetter.ts:128-140`, `src/features/pqr/screens/OversightLetterScreen.tsx:147-150`).
  El servidor manda al ente el oficio en PDF y el **nombre, el correo y, si lo hay, el teléfono**
  del ciudadano, que saca de su cuenta (`backend:src/legal/oversight-dispatch.service.ts:217-251`,
  `backend:src/legal/mail/oversight-mail.ts:208-213`). El buzón sale del directorio.
- **Antes de enviar**, la app pide confirmación con el nombre y el correo del ente y avisa: «Al
  enviar el oficio, el ente de control recibirá tu nombre y tus datos de contacto, para que pueda
  responderte y actuar frente a la entidad que no respondió tu solicitud»; si la PQRSD es anónima,
  antes: «Tu PQRSD es anónima ante la entidad, pero el oficio no lo es»
  (`OversightLetterScreen.tsx:162-174`, `legalDocsCopy.ts:32-40`).

### 3.2 Cómo queda cada fila

| Tipo | Qué cambia | Qué marcar |
|---|---|---|
| Nombre | Llega también al ente de control, y a OpenAI desde la app | Sin cambio. El ente no cuenta como compartido: el ciudadano pulsa «Enviar» después de un aviso que nombra al ente y los datos. OpenAI ya estaba en «sí (conservador)» |
| Dirección de correo | Llega al ente | Sin cambio («no»), por la misma excepción |
| Número de teléfono | Llega al ente si está en el perfil | Sin cambio («no»), por la misma excepción |
| Otro contenido generado por usuarios | La descripción va a OpenAI y, en el PDF, al ente | Sin cambio |
| Dirección | Nada: la ciudad y el departamento del oficio son los de la entidad | Sin cambio |

Aquí la excepción de Play aplica sin dudas: es una acción concreta del usuario, con un aviso previo
que dice qué datos recibe quién. Marcar «sí» en correo y teléfono solo tendría sentido si se decide
la línea conservadora del §2.5 para todo.

## 4. Buscar personas (#28)

- **La app** pregunta al servidor mientras se escribe: `GET /users/search?q=<texto>`, con 300 ms
  de espera entre teclas y a partir de dos letras (`src/features/users/hooks/useUserSearch.ts:7-11`
  y `:57-68`). Se llega desde el muro (`src/features/pqr/screens/PQRListScreen.tsx:294-299`).
- **El servidor** escribe la URL de cada petición, con sus parámetros, en todas las líneas de su
  log (`backend:src/common/logging/logger.options.ts:100-104`). El texto buscado queda guardado: no
  es efímero.
- **En la 1.1.0** el inventario decía que no se recogía el historial de búsquedas porque las tres
  búsquedas de la app filtraban en el teléfono (§5.2 de ese documento). Ya no es así para esta. Las
  otras dos siguen igual: el muro (#29) y Mis PQRSD (#30) descargan páginas sin el texto y filtran
  en el teléfono (`src/features/pqr/hooks/useWallSearch.ts:38-45`,
  `src/features/pqr/hooks/useMyPQRsFilter.ts:42-44`).

**Qué marcar:** Actividad en la app → **Historial de búsqueda en la app**: recogido, sí; compartido,
no (solo lo recibe el servidor de Quéjate, y el alojamiento del log es un proveedor de servicios);
efímero, no; **opcional** (solo si se usa el buscador); finalidad, **Funcionalidad de la app**.

Aunque algún día el servidor dejara de guardar la URL, habría que declararlo igual: Play pide incluir
también lo efímero. Los resultados (nombres, fotos y recuentos de otras personas) son datos que
la app recibe, no que recoge, y no van en el formulario.

## 5. La autorización al enviar y el aviso de facilitador (#34)

### 5.1 No añaden datos

`submitPQR` envía el mismo cuerpo que antes (`useCreatePQR.ts:75-93`). La autorización es un texto
junto al botón y nada la registra (`Confirmation.tsx:161-183`). El aviso de facilitador, el de
anónima y el de borrador con IA solo se leen. Lo que sí hacen es reforzar la excepción del §2.5: la
persona lee, antes de pulsar, a quién se envía su PQRSD.

### 5.2 🔴 Decisión: Google Analytics dentro de la app

Los enlaces de la autorización abren la política y los términos **dentro de la app**, en un WebView
con JavaScript (`Confirmation.tsx:200-207` → `src/features/users/components/profile/WebViewModal.tsx:62-72`).
Perfil → Configuración ya lo hacía en la 1.1.0 (`src/features/users/screens/UserProfileScreen.tsx:282`
y `:288`).

- La web carga Google Tag Manager en todas sus páginas salvo la del enlace de la entidad
  (`web:app/layout.tsx:40`, `web:components/SiteGoogleTagManager.tsx`), con el contenedor
  `GTM-K8H7JGNP`. El contenedor público carga una etiqueta de Google con el ID de Google Analytics
  4 `G-Y90YW994EJ` (leído en `gtm.js` el 22/10/2026). Está así desde el 25/09/2025.
- `quejate.com.co` es nuestra, así que es una WebView cuyo código controla el desarrollador: Play
  la cuenta como recopilación de la app. El inventario de la 1.1.0 no la recogió. No es nuevo de la
  1.2.0, pero la 1.2.0 la pone en el paso de enviar una PQRSD.
- Google Analytics registra, como mínimo, las páginas vistas y un identificador propio en una
  cookie. No he visto la configuración de la propiedad (si comparte datos con Google), que decide si
  Google cuenta como proveedor de servicios.

Opciones:

1. **Declararlo.** En «Interacciones en la app» y «Dispositivo u otros ID», añadir la finalidad
   **Análisis**. Las dos filas ya están como recogidas y compartidas con Google por el SDK de Maps,
   así que el sí o el no no cambian; cambia la finalidad. Para ser exhaustivos, también la
   «Ubicación aproximada», que Analytics deduce de la IP y Play pide declarar («se debe divulgar la
   ubicación aproximada que se infiere, por ejemplo, a través de la dirección IP»); esa fila ya está
   como recogida.
2. **Quitarlo de lo que abre la app**, en la web: no cargar Tag Manager cuando la página se abre
   desde la app. No hace falta versión nueva de la app, pero la app no se identifica: `WebViewModal`
   no pone ni parámetro ni agente de usuario propio (`WebViewModal.tsx:62-72`), y fiarse de la marca
   genérica de los WebView de Android afectaría también a otras apps. Sería un encargo de la web.

## 6. Lo que no cambia el formulario

- **#29 a #32:** el muro, Mis PQRSD y el perfil público piden más páginas de lo que ya pedían; no
  sale nada nuevo del teléfono.
- **#35:** apaga «anónima» cuando la entidad no la admite y enseña el motivo de un rechazo. No
  cambia lo que se envía.
- **La ubicación:** ningún cambio. El oficio usa la ubicación de la entidad (§3.2).
- **SDK y permisos:** el diff entre la 10 (`a4a93fc`) y `d925e6d` no toca `package.json`,
  `package-lock.json`, `app.config.js` ni `eas.json`. No hay ningún SDK nuevo que recoja datos.
- **El enlace privado de la entidad** (`backend:CHANGELOG.md`, R-42, sin desplegar según el propio
  registro): la entidad leerá su PQRSD, con los campos propios, desde un enlace sin sesión. Sigue
  siendo el destinatario que eligió el ciudadano, y esa página no carga Tag Manager.

## 7. Qué queda por decidir

1. **El documento de identidad:** «Otra información» o «ID de usuario» (§2.3).
2. **Opcional u obligatorio** para el documento y la dirección (§2.4).
3. **Si se sigue la línea conservadora** con lo que recibe la entidad (§2.5). Si no, nada cambia
   en «compartido».
4. **Google Analytics en el WebView:** declararlo o quitarlo de lo que abre la app (§5.2).
5. **Las dos de la 1.1.0** que no sé si se tomaron: OpenAI como compartido y la información de
   salud (§5.3 de ese documento).

Y una sin decisión: añadir **Historial de búsqueda en la app** (§4).

### Para la política (no bloquea el formulario)

- 🟠 **El ente de control recibe el nombre, el correo y el teléfono del ciudadano, y el oficio.** La
  política describe el oficio como texto que se redacta con OpenAI y se guarda
  (`política:140-147`, `:1154-1191`), pero no dice que Quéjate lo envíe por correo al ente con los
  datos de contacto. La app sí lo avisa antes de enviar (§3.1).
- 🟡 **La ciudad del oficio.** La política dice que a OpenAI se envía «su ciudad o su departamento»,
  del usuario (`política:1176-1180`); la app manda los de la entidad
  (`oversightLetter.ts:60-61`).
- 🟡 **Google Analytics.** La política habla de cookies «al acceder a la plataforma»
  (`política:178`) y de «dirección IP, cookies, logs de acceso» (`política:88`), sin nombrar a
  Google Analytics.
- No he vuelto a revisar uno por uno los huecos del §1 del inventario de la 1.1.0.
