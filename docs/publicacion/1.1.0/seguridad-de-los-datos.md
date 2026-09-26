# Seguridad de los datos en Google Play: inventario de la 1.1.0

Sirve para rellenar Play Console → Contenido de la app → Seguridad de los datos sin contradecir la
política de privacidad. Está leído del código, no supuesto:

- **App:** `origin/main` en `9298575`. Las rutas sin prefijo son de este repositorio.
- **Backend:** `quejate-backend`, `origin/main` en `279e46f`. Se cita como `backend:ruta:línea`.
- **Política:** <https://quejate.com.co/policy>, «En vigor a partir del 24/9/2026». La fuente es
  `quejate-app`, `origin/master` en `aa89cb7`, fichero `app/policy/page.tsx`; se cita como
  `política:línea`.

⚠️ `docs/legal/privacy-policy.md` de este repositorio es un borrador de junio con los campos `[[ ]]`
sin rellenar. **No es la política vigente** y no sirve para el formulario.

## 0. Las reglas de Play

Según la ayuda de Play Console ([10787469](https://support.google.com/googleplay/android-developer/answer/10787469)):

- **Recogido** es todo lo que sale del teléfono. Lo que solo se procesa en el teléfono no se
  declara.
- **Compartido** es lo que se transfiere a un tercero. No cuenta como compartido: (a) lo que va a un
  **proveedor de servicios** que trata los datos en nombre del desarrollador y según sus
  instrucciones; (b) lo que se entrega por una obligación legal; (c) lo que se transfiere por una
  **acción concreta del usuario** que espera que se comparta; y (d) los datos anonimizados.
- Lo que recogen los **SDK de terceros** incluidos en la app también se declara.
- **Efímero** es lo que solo vive en memoria mientras se atiende la petición. Lo que queda en un
  log no es efímero.

## 1. 🔴 Lo que la política NO cubre (para Jhoiner)

Estos puntos no son un detalle del formulario. En cada uno, la app hace algo que la política no
dice, o dice lo contrario.

### 1.1 🔴 Grabaciones de audio con el micrófono

- **La app:** el sonómetro graba con el micrófono (`src/features/pqr/screens/SonometerScreen.tsx:141-165`)
  y, al usar la medición, adjunta la grabación a la PQRSD (`SonometerScreen.tsx:167-183`,
  `src/features/pqr/screens/CreatePQRScreen.tsx:86-87`). Se sube como cualquier adjunto y se publica
  con la PQRSD si es pública. Puede captar voces de otras personas. Permiso `RECORD_AUDIO` en
  `app.config.js:49`.
- **La política:** los datos multimedia son «imágenes, videos y documentos», y la app «puede
  solicitar acceso a la cámara y a la galería» (`política:102-109`). En todo el texto no aparecen
  ni el audio ni el micrófono.
- Según las notas de trabajo de junio, el formulario de Play ya declara audio. Si es así, **el
  formulario y la política se contradicen hoy**, antes de esta versión.

### 1.2 🔴 Los adjuntos privados y el documento de identidad de los abogados son públicos por URL

- **El backend:** todas las subidas van a S3 con `ACL: 'public-read'`
  (`backend:src/files/storage/s3-storage.service.ts:128-133`). Es el resto declarado del hallazgo
  **H-20**. Afecta a los adjuntos de las PQRSD privadas, a las fotos de perfil y a las imágenes del
  **documento de identidad y la tarjeta profesional** de los abogados (carpeta `lawyers`,
  `src/features/lawyers/hooks/useLawyers.ts:128-129`). Quien tenga la URL los abre sin sesión.
- **La política:** los adjuntos «se rigen por las mismas reglas de visibilidad (pública/privada)»
  (`política:108-109`).

### 1.3 🔴 La app lee la ubicación del teléfono sin que el usuario la pida

- **La app:** lee el GPS sin que el usuario toque nada en dos sitios:
  - al abrir la pestaña Entidades (`src/features/entities/screens/EntityListScreen.tsx:145` →
    `src/features/entities/hooks/useEntityLocationFilter.ts:70-76`);
  - al entrar a radicar una PQRSD sin entidad ni categoría elegidas
    (`CreatePQRScreen.tsx:335-339` → `src/features/pqr/components/create/EntitySelector.tsx:143-153`).

  La primera vez pide el permiso; después ya no pregunta.
- Con esa posición pide la dirección al geocodificador del sistema (`useEntityLocationFilter.ts:48`,
  `EntitySelector.tsx:120`). En Android es el `Geocoder` de la plataforma; en los teléfonos con
  servicios de Google, lo resuelve Google. Después envía al servidor el departamento y el municipio
  como filtro (`src/features/entities/hooks/useEntities.ts:25`), y el backend registra la URL de
  cada petición con sus parámetros (`backend:src/common/logging/logger.options.ts:78`).
- **La política:** «La Plataforma no accede ni registra la ubicación del dispositivo del usuario en
  tiempo real sin su acción explícita» (`política:1204-1205`). La geolocalización solo se describe
  como el punto opcional de la PQRSD (`política:92-99`).

### 1.4 🔴 Terceros que reciben datos personales y la política no nombra

La política solo nombra a OpenAI (`política:1131-1170`). Para el resto, habla en general de
«computación en la nube» (`política:992`).

- **OpenStreetMap Foundation (Nominatim).** Según su propia política de privacidad, guarda los
  datos en Reino Unido y Países Bajos. Recibe las coordenadas del punto de la PQRSD dos veces:
  - desde el teléfono, junto con la IP y el User-Agent `QuejateApp/1.0`
    (`src/features/map/components/MiniMap.tsx:38-46`);
  - desde el servidor al radicar, para poner la dirección en el correo a la entidad
    (`backend:src/pqr/pqr-creation.service.ts:202`, `:267-277`, `:494`;
    `backend:src/pqr/geocoding/reverse-geocoding.service.ts:4`).

  Además, contradice que las coordenadas se usen «exclusivamente para mostrar la PQRSD en el mapa»
  (`política:1189`).
- **Google**, por cinco vías:
  - el SDK de Maps, que según Google recoge y comparte metadatos del dispositivo, la IP, un
    identificador del SDK, datos de fallos e interacciones con el mapa;
  - reCAPTCHA, al radicar (`CreatePQRScreen.tsx:426-430`);
  - el inicio de sesión con Google;
  - Firebase Cloud Messaging;
  - el geocodificador del sistema (§1.3).
- **Expo** (EE. UU.). Recibe el token de notificaciones y el texto de cada aviso, que incluye
  nombres de otros usuarios y el asunto de la PQRSD
  (`backend:src/notifications/notification-catalog.ts:188-351`). Expo se declara encargado y dice
  que no guarda el contenido.
- **Amazon Web Services (S3).** Guarda todos los adjuntos (`src/shared/utils/s3Upload.ts:17-33`).

### 1.5 🟠 Las PQRSD son públicas por defecto

- **La app:** el formulario empieza con «privada» desactivado (`CreatePQRScreen.tsx:109`). Si el
  ciudadano no lo cambia, la PQRSD entra en el muro y en el mapa públicos con la descripción, los
  adjuntos, el punto del mapa y su nombre, salvo que sea anónima.
- **La política:** habla de las PQRSD «configuradas como públicas por el usuario»
  (`política:1195-1197`).

### 1.6 🟠 La entidad recibe el nombre y el correo del ciudadano

- **El backend:** el correo a la entidad lleva el nombre y el correo del autor, salvo en las
  anónimas (`backend:src/pqr/pqr-creation.service.ts:548-565`). El teléfono solo iría con
  `includePhone`, y la app nunca lo envía (`CreatePQRScreen.tsx:269-283`).
- **La política:** no lo dice. Solo habla de «Gestionar solicitudes, quejas y reclamos,
  direccionándolos a las áreas responsables» (`política:241`). Tampoco explica el envío anónimo,
  que la app le promete al ciudadano
  (`src/features/pqr/components/create/TypeAndContent.tsx:28`).

### 1.7 🟠 Abogados: documento de identidad y consulta a la Rama Judicial

- **La app:** el registro como abogado sube imágenes del documento de identidad y de la tarjeta
  profesional, y envía el tipo y número de documento, el número de licencia, las especialidades y
  las tarifas (`useLawyers.ts:123-141`).
- **El backend:** al registrar, consulta ese documento en el SIRNA de la Rama Judicial
  (`backend:src/lawyers/lawyers.service.ts:220`,
  `backend:src/lawyers/judicial/judicial-registry.service.ts:9-10`).
- **La política:** incluye a los abogados como titulares (`política:639`) y habla de «verificar
  información aportada» (`política:369`). No dice que se guarden imágenes del documento ni que se
  consulte a la Rama Judicial.

### 1.8 🟡 Copias que quedan en el teléfono

- **La app:** nunca borra lo que deja en su caché, salvo el cuerpo de una descarga fallida y la
  copia anterior del mismo PDF (`src/features/pqr/utils/legalDocShare.ts:102`, `:119`). Quedan los
  PDF, la grabación del sonómetro y las imágenes, y siguen ahí después de cerrar sesión y de
  eliminar la cuenta (§3).
- **La política:** los documentos se borran a los seis meses y al eliminar la cuenta
  (`política:1244`, `:1259-1264`). Habla de la copia del servidor; no dice nada de la del teléfono.

### 1.9 🟡 Datos de salud en texto libre

La descripción de los hechos puede traer datos de salud, y viaja a OpenAI. La política lo prevé
(`política:1164-1168`). Play lo pregunta aparte, en «Salud y actividad física → Información de
salud»; decidir si se declara es parte de la revisión (§5.3).

## 2. Qué envía la app al servidor de Quéjate

Todo va por HTTPS. El tráfico en claro está desactivado (`app.config.js:41`).

| Pantalla o acción | Datos | Código | ¿Obligatorio? |
|---|---|---|---|
| Registro | Nombre, correo, contraseña | `src/features/auth/hooks/useRegister.ts:35` | Sí |
| Inicio de sesión | Correo y contraseña | `src/core/auth/useAuth.ts:40-43` | Sí (o Google) |
| Inicio de sesión con Google | El `idToken` de Google; el servidor saca de él el nombre, el correo y la foto | `useAuth.ts:61-64` | No |
| Recuperar contraseña | Correo; luego código y contraseña nueva | `src/features/auth/components/ForgotPasswordModal.tsx:88`, `:113-117` | — |
| Editar perfil | Nombre, teléfono (opcional), foto de perfil (a S3) | `src/features/users/hooks/useProfileActions.ts:40-56` | Nombre sí |
| Cambiar contraseña / eliminar cuenta | Contraseñas; borrado de la cuenta | `useProfileActions.ts:71-76`, `:97` | — |
| Radicar PQRSD | Tipo, entidad, área, asunto, descripción, anónima, privada, id del autor, **latitud y longitud** (opcional), campos personalizados (incluido el nivel de ruido), **adjuntos**: fotos, vídeos con su miniatura, PDF y **audio** (a S3), token de reCAPTCHA | `CreatePQRScreen.tsx:269-283`, `src/features/pqr/hooks/useCreatePQR.ts:56-91` | Tipo, entidad, asunto y descripción sí (`createPQRTypes.ts:4-15`); ubicación y adjuntos no |
| Comentar, me gusta, seguir | Texto del comentario; me gusta; seguir a un usuario | `src/features/pqr/hooks/useComments.ts:26`, `usePQRActions.ts:101`, `PublicProfileScreen.tsx:58` | No |
| Privacidad y estado de una PQRSD propia | `private`; `RESOLVED` | `src/features/pqr/hooks/usePQRActions.ts:22`, `:40` | No |
| **Generar tutela** | **Nombre completo, número de documento, departamento, ciudad**, derecho vulnerado, entidad, tipo, fecha, días de retraso, **descripción de los hechos** | `src/features/pqr/hooks/useLegalDocs.ts:6-17`, `:49`; `GenerateTutelaScreen.tsx:107-119` | No |
| Pedir un abogado | Mensaje, correo o teléfono de contacto, PQRSD | `src/features/lawyers/screens/LawyerDetailScreen.tsx:92-98` | No |
| Calificar a un abogado | Puntuación y comentario | `useLawyers.ts:110`, `:154` | No |
| **Registrarse como abogado** | Tipo y número de documento, **imagen del documento de identidad**, **imagen de la tarjeta profesional**, número de licencia, especialidades, descripción, tarifas | `useLawyers.ts:123-141` | No |
| Pestaña Entidades y paso de entidad al radicar | Departamento y municipio **deducidos del GPS**, como filtro | `useEntityLocationFilter.ts:40-76`, `EntityListScreen.tsx:148-151`, `EntitySelector.tsx:115-153`, `useEntities.ts:25` | No |
| Notificaciones | Token de Expo del teléfono | `src/core/notifications/usePushNotifications.ts:82-86` | No |

**Lo que el servidor hace después con esos datos:**

- La tutela va a **OpenAI** (`gpt-4o-mini`, `backend:src/legal/openai/openai-chat.client.ts:15`,
  `:26`; `backend:src/legal/legal.service.ts:98-100`) y se guarda seis meses.
- La PQRSD va **por correo a la entidad**, con nombre y correo salvo que sea anónima (§1.6).
- El punto del mapa va a **Nominatim** (§1.4).
- El número de documento del abogado va al **SIRNA** (§1.7).
- El `idToken` de Google se verifica contra Google
  (`backend:src/auth/google/google-token.service.ts:5`), y el token de reCAPTCHA también
  (`backend:src/pqr/recaptcha/recaptcha.service.ts:5`).

**Lo que no pasa por el servidor, porque lo inicia el usuario:** compartir desde la hoja del
sistema, escribir a soporte desde su propia app de correo
(`src/features/users/components/profile/SupportModal.tsx:84-89`) y «Abrir en Google Maps»
(`src/features/pqr/components/detail/DetailHeader.tsx:123-129`).

## 3. Qué recibe y guarda el teléfono

| Qué | Dónde | Contiene | Cuándo se borra |
|---|---|---|---|
| Token de sesión | SecureStore (`src/core/auth/SecureStorage.ts:8-12`) | La sesión | Al cerrar sesión o si caduca |
| **PDF de documentos legales** | Caché: `legal-docs/doc-<id>/` (`legalDocShare.ts:86`, `:116`) | **Tutela: nombre, cédula, ciudad y descripción de los hechos**; oficio: nombre, ciudad y hechos | **Nunca por la app** |
| **PDF del certificado de radicación** | Caché: `legal-docs/certificado-<id>/` | Nombre del autor (salvo anónima), asunto, descripción y enlaces a los adjuntos (`backend:src/pqr/pdf/certificate.pdf.ts:14-16`) | **Nunca por la app** |
| Grabación del sonómetro | Fichero del grabador (`SonometerScreen.tsx:149`) | Audio ambiente | Nunca por la app |
| Imagen para compartir una PQRSD | Caché: `share-src-<id>.<ext>` y la captura de la tarjeta (`src/features/pqr/utils/pqrShare.ts:38`, `PQRActionsSheet.tsx:67-70`) | Primera foto y datos públicos de la PQRSD | Nunca por la app |
| Fotos, avatares y adjuntos vistos | Caché de imágenes en disco (`cachePolicy="memory-disk"`, p. ej. `PQRCard.tsx:66`) | Imágenes de PQRSD y perfiles | La gestiona la librería |
| Cuenta de Google | Servicios de Google del teléfono | La cuenta usada para entrar | Al cerrar sesión (`useAuth.ts:94-118`) |

- Los datos de pantalla (listas, detalle, perfil) viven solo en memoria: no hay persistencia de
  consultas en el código.
- La caché de la app no entra en las copias de seguridad automáticas de Android, pero sobrevive al
  cierre de sesión y a la eliminación de la cuenta. Solo la vacía el sistema o el usuario (borrar
  datos o desinstalar). En un teléfono compartido, los PDF del anterior titular siguen dentro del
  almacenamiento de la app; la app no ofrece forma de verlos, pero no los borra.

## 4. Qué sale hacia terceros

| Tercero | Qué recibe | Desde | ¿Proveedor de servicios? | «Compartido» para Play |
|---|---|---|---|---|
| **OpenAI** (EE. UU.) | Tutela: nombre, cédula, ciudad, departamento, entidad, derecho, fechas y hechos. Oficio: lo mismo sin cédula, más el ente de control (`política:1148-1157`) | Servidor | Solo si hay contrato de encargo (DPA). Por defecto no entrena con los datos de la API y guarda registros de abuso hasta 30 días (documentación de OpenAI) | **Recomendado: sí** (§5.3) |
| **OpenStreetMap Foundation** (Nominatim; Reino Unido y Países Bajos) | Coordenadas, IP, User-Agent | Teléfono y servidor | No: servicio público con su propia política, sin contrato | **Sí** |
| **Google: SDK de Maps** | Metadatos del dispositivo (SO, modelo, marca), IP, identificador del SDK, fallos, interacciones con el mapa | Teléfono | No: Google declara esos datos como compartidos | **Sí** |
| **Google: reCAPTCHA** | Datos técnicos de la carga en el WebView y la cookie `_GRECAPTCHA` para su análisis de riesgo | Teléfono | Dudoso | **Sí** (conservador) |
| Google: geocodificador del sistema | Coordenadas del GPS | Teléfono (por el sistema) | Zona gris | No cambia el formulario: la ubicación precisa ya va como compartida |
| Google: Sign-In | Inicio de sesión | Teléfono | — | No: lo inicia el usuario |
| Google: Firebase Cloud Messaging | ID de instalación, versión de la app | Teléfono | Sí, según Firebase: solo lo cede a sus subencargados | No |
| Expo (EE. UU.) | Token de notificaciones; texto de los avisos | Teléfono y servidor | Sí (se declara encargado y no guarda el contenido) | No |
| AWS S3, alojamiento, base de datos y correo del backend | Todo lo anterior, para guardarlo o enviarlo | Servidor y teléfono | Sí | No |
| Entidad destinataria | PQRSD con nombre y correo (salvo anónima) | Servidor, por correo | — | No: lo inicia el usuario al radicar |
| Abogado | Mensaje y contacto | Servidor | — | No: lo inicia el usuario |
| Rama Judicial (SIRNA) | Tipo y número de documento del abogado | Servidor | No | Conservador: sí (no cambia el formulario, ver §5.2) |
| Público (muro y mapa) | PQRSD públicas: nombre (salvo anónima), texto, adjuntos, ubicación | — | — | No: lo publica el usuario, pero ver §1.5 |

Datos de los SDK de Google según sus páginas de declaración para Play: [Maps SDK for
Android](https://developers.google.com/maps/documentation/android-sdk/play-data-disclosure) y
[Firebase](https://firebase.google.com/docs/android/play-data-disclosure). De Expo:
[expo.dev/privacy-explained](https://expo.dev/privacy-explained).

## 5. Cómo rellenar el formulario

### 5.1 Preguntas generales

| Pregunta | Respuesta | Por qué |
|---|---|---|
| ¿Recoge o comparte datos de usuario? | Sí | §2 y §4 |
| ¿Se cifran en tránsito? | Sí | `app.config.js:41`; todas las URL son HTTPS |
| ¿Permite crear cuenta? | Sí: usuario y contraseña, y OAuth (Google) | `useRegister.ts:35`, `useAuth.ts:61-64` |
| ¿Pueden pedir que se borren sus datos? | Sí: en la app (Perfil → Eliminar cuenta, `UserProfileScreen.tsx:300`) y en <https://quejate.com.co/delete-account>, que respondía 200 el 26/09/2026 | |

### 5.2 Tipos de datos

Donde pone **Sí (conservador)**, la transferencia podría no contar como «compartida». Se recomienda
declararla porque así el formulario nunca contradice a la política.

| Categoría de Play → tipo | Recogido | Compartido | ¿Opcional? | Finalidades | Origen |
|---|---|---|---|---|---|
| Ubicación → Ubicación precisa | Sí | **Sí** (Nominatim) | Opcional | Funcionalidad de la app | Punto de la PQRSD |
| Ubicación → Ubicación aproximada | Sí (no efímero: queda en el log de peticiones) | No | Opcional | Funcionalidad de la app | Departamento y municipio del GPS (§1.3) |
| Información personal → Nombre | Sí | **Sí (conservador)**: OpenAI | Obligatorio | Funcionalidad; Gestión de la cuenta | Cuenta, perfil, tutela |
| Información personal → Dirección de correo | Sí | No | Obligatorio | Gestión de la cuenta; Funcionalidad | Cuenta; contacto con un abogado |
| Información personal → ID de usuario | Sí | No | Obligatorio | Gestión de la cuenta | Cuenta |
| Información personal → Dirección | Sí | **Sí (conservador)**: OpenAI | Opcional | Funcionalidad | Ciudad y departamento de la tutela |
| Información personal → Número de teléfono | Sí | No | Opcional | Funcionalidad; Gestión de la cuenta | Perfil; contacto con un abogado |
| Información personal → Otra información | Sí | **Sí (conservador)**: OpenAI y Rama Judicial | Opcional | Funcionalidad; Prevención de fraude | Cédula de la tutela; documento y licencia del abogado |
| Salud y actividad física → Información de salud | **Lo decide la revisión** (§5.3) | | | | Texto libre de los hechos |
| Mensajes → Otros mensajes en la app | Sí | No | Opcional | Funcionalidad | Mensaje a un abogado |
| Fotos y videos → Fotos | Sí | No | Opcional | Funcionalidad; Gestión de la cuenta | Adjuntos, foto de perfil, documento y tarjeta del abogado |
| Fotos y videos → Videos | Sí | No | Opcional | Funcionalidad | Adjuntos |
| Archivos de audio → Grabaciones de voz o sonido | Sí | No | Opcional | Funcionalidad | Sonómetro (§1.1) |
| Archivos y documentos | Sí | No | Opcional | Funcionalidad | PDF adjuntos |
| Actividad en la app → Otro contenido generado por el usuario | Sí | **Sí (conservador)**: OpenAI | Opcional | Funcionalidad | Asunto y descripción, comentarios, reseñas, campos personalizados |
| Actividad en la app → Otras acciones | Sí | No | Opcional | Funcionalidad | Me gusta, seguir |
| Actividad en la app → Interacciones con la app | Sí (SDK de Maps) | **Sí** (Google) | Obligatorio al usar un mapa | Funcionalidad | Movimiento y zoom del mapa |
| Información y rendimiento → Registros de fallos | Sí (SDK de Maps) | **Sí** (Google) | Obligatorio | Funcionalidad | SDK de Maps |
| Información y rendimiento → Diagnóstico | Sí (SDK de Maps) | **Sí** (Google) | Obligatorio | Funcionalidad | Metadatos del SDK de Maps |
| Dispositivo u otros identificadores | Sí | **Sí** (Google: Maps y reCAPTCHA) | Obligatorio | Funcionalidad; Prevención de fraude y seguridad | Token de notificaciones, ID de Firebase, identificador del SDK de Maps, cookie de reCAPTCHA |

**No se recogen:** información financiera (las tarifas del abogado son los precios de su servicio,
no datos de pago), calendario, contactos, historial de navegación, apps instaladas, historial de
búsquedas y SMS o correos. Las tres búsquedas de la app filtran en el teléfono y no envían el texto
(`PQRListScreen.tsx:127-132`, `EntityListScreen.tsx:164`, `LawyerListScreen.tsx:33-41`).

### 5.3 Las decisiones que tiene que tomar Jhoiner

1. **OpenAI: ¿compartido o no?** Para Play, no es «compartido» si OpenAI trata los datos en nombre
   de Quéjate y según sus instrucciones, es decir, como encargado con contrato: en Colombia, una
   transmisión. La política lo cuenta dentro de «Transmisión y transferencia» y dice que los datos
   «salen del país» (`política:1139`). **Recomendado: declararlo como compartido.** Es la única
   respuesta que no puede contradecir a la política. Marcar «no» solo tiene sentido si hay contrato
   de encargo con OpenAI y la política lo presenta así.
2. **Información de salud.** La descripción de los hechos la contiene a menudo (las tutelas de salud
   son frecuentes) y viaja a OpenAI. Hay que decidir si se declara como tipo propio.
3. **Los huecos del §1**, antes de enviar el formulario: sobre todo el audio (§1.1), la visibilidad
   de los adjuntos (§1.2), la lectura automática de la ubicación (§1.3) y los terceros sin nombrar
   (§1.4). El formulario solo puede ser coherente con una política que diga lo que la app hace.

## 6. Fuera de la privacidad, pero encontrado aquí

La [política de uso de Nominatim](https://operations.osmfoundation.org/policies/nominatim/) exige
que las apps puedan cambiar de servicio **sin publicar una versión nueva**, y que muestren la
atribución de OpenStreetMap. La app llama a `nominatim.openstreetmap.org` directamente desde el
teléfono (`MiniMap.tsx:38-46`) y no muestra atribución. Si la OSMF bloquea el User-Agent
`QuejateApp/1.0`, el selector del punto deja de mostrar la dirección hasta la siguiente
publicación. No rompe el flujo, porque el fallo se trata y el punto se guarda igual
(`MiniMap.tsx:52-55`). No bloquea esta publicación, pero conviene pasar esa llamada por el backend,
que ya la hace.
