/**
 * El envío del oficio al ente de control (`POST /legal-docs/:id/send`): cómo se
 * lee la respuesta y qué se le dice al ciudadano.
 *
 * Es el porte de la web (`services/pqrFollowUpService.ts` → `classifyOversightSend`
 * y `utils/oversightSend.ts` en `quejate-app`), con los mismos casos y los
 * mismos textos, para que los dos clientes digan lo mismo del mismo envío.
 */

/**
 * Cómo terminó el envío, ya clasificado para la interfaz.
 *
 * 🔴 No basta con «salió o no salió». Hay un tercer caso, `unconfirmed`, en el
 * que **no se sabe**: el oficio puede estar ya en el buzón del ente, y
 * reenviarlo lo duplicaría.
 */
export type OversightSendResult =
  /**
   * El oficio salió. `citizenNotified: false` quiere decir que la confirmación
   * al ciudadano no, **no** que el oficio fallara.
   */
  | { kind: 'sent'; citizenNotified: boolean }
  /** Puede haber salido: el correo no respondió a tiempo, o se cortó algo. */
  | { kind: 'unconfirmed' }
  /** 429. `retryAfterSeconds` es `null` si no llegó cuánto falta. */
  | { kind: 'rate-limited'; retryAfterSeconds: number | null }
  /** 409: el ente no tiene buzón en el directorio. */
  | { kind: 'no-mailbox' }
  /** 404: el oficio o la PQRSD ya no están, o el ente no corresponde. */
  | { kind: 'not-found' }
  /** 401: la sesión caducó. */
  | { kind: 'session-expired' }
  /** No salió, y se puede volver a intentar. */
  | { kind: 'not-sent' };

/** Lo que interesa de una respuesta HTTP, sea de éxito o de error. */
export interface SendResponse {
  status: number;
  data?: unknown;
  headers?: unknown;
}

/**
 * Códigos con los que el servidor dice, en un 5xx, que el oficio **no** salió
 * (`OVERSIGHT_SEND_ERRORS` en `oversight-dispatch.service.ts`): el proveedor de
 * correo lo rechazó o no se le pudo llamar (502), o falta su clave (503).
 *
 * Se mira el código y no solo el estado porque un 502 también lo da un proxy
 * cuando se corta la conexión con el servidor de detrás, y ese corte puede
 * llegar con el oficio ya enviado.
 */
const NOT_SENT_CODES = new Set(['OVERSIGHT_MAIL_FAILED', 'OVERSIGHT_MAIL_NOT_CONFIGURED']);

/**
 * Traduce la respuesta del envío a un {@link OversightSendResult}.
 *
 * La regla de fondo: **solo se da por no enviado lo que seguro no salió.** Un
 * 4xx es seguro, porque el servidor rechaza antes de llamar al correo; un 5xx
 * solo si trae uno de {@link NOT_SENT_CODES}. Todo lo demás (el 504 del corte
 * con el correo, un 500, un 502 de un salto intermedio, o ninguna respuesta)
 * es `unconfirmed`: de todas las equivocaciones posibles, la peor es decirle
 * al ciudadano que no salió algo que sí salió, porque lo reenvía y el ente
 * recibe dos.
 *
 * @param response `undefined` cuando no llegó respuesta: tiempo agotado o red
 *   cortada. La petición pudo llegar y el oficio salir antes del corte.
 */
export function classifyOversightSend(response: SendResponse | undefined): OversightSendResult {
  if (!response) return { kind: 'unconfirmed' };

  const body = (response.data ?? null) as { citizenNotified?: unknown; code?: unknown } | null;

  if (response.status >= 200 && response.status < 300) {
    // Si el cuerpo no se pudiera leer, se toma como que la confirmación no
    // llegó: es el aviso que dice «no lo reenvíes».
    return { kind: 'sent', citizenNotified: body?.citizenNotified === true };
  }

  switch (response.status) {
    case 401:
      return { kind: 'session-expired' };
    case 404:
      return { kind: 'not-found' };
    case 409:
      return { kind: 'no-mailbox' };
    case 429:
      return { kind: 'rate-limited', retryAfterSeconds: retryAfterSeconds(response.headers) };
  }

  if (response.status < 500) return { kind: 'not-sent' };

  return typeof body?.code === 'string' && NOT_SENT_CODES.has(body.code)
    ? { kind: 'not-sent' }
    : { kind: 'unconfirmed' };
}

/**
 * Segundos de la cabecera `Retry-After` de un 429, o `null`. El servidor los
 * manda enteros; la otra forma que admite el estándar, una fecha, no la emite.
 * Las claves se buscan sin importar mayúsculas.
 */
export function retryAfterSeconds(headers: unknown): number | null {
  if (!headers || typeof headers !== 'object') return null;
  const record = headers as Record<string, unknown>;
  const key = Object.keys(record).find((k) => k.toLowerCase() === 'retry-after');
  const value = key ? record[key] : undefined;
  if (value === undefined || value === null || value === '') return null;
  const seconds = Number(value);
  return Number.isFinite(seconds) && seconds > 0 ? Math.ceil(seconds) : null;
}

/** Lo que la pantalla le dice al ciudadano sobre un envío del oficio. */
export interface OversightSendNotice {
  tone: 'success' | 'warning' | 'error';
  title: string;
  description: string;
}

/** El ente de control al que se envió, o se intentó enviar, el oficio. */
interface NoticeTarget {
  name: string;
  phone?: string | null;
}

/**
 * Título y texto del aviso de un envío, en lenguaje llano.
 *
 * Todos dicen **si el oficio salió**, porque es lo único que el ciudadano
 * necesita para decidir si lo vuelve a enviar: los que no salieron lo dicen
 * («no enviamos nada»), y los que salieron o pueden haber salido le piden que
 * no lo reenvíe, porque el ente lo recibiría dos veces.
 */
export function describeOversightSend(
  result: OversightSendResult,
  target: NoticeTarget,
): OversightSendNotice {
  const { name } = target;

  switch (result.kind) {
    case 'sent':
      return result.citizenNotified
        ? {
            tone: 'success',
            title: 'Oficio enviado',
            description: `Enviamos el oficio a ${name}. También te mandamos una confirmación a tu correo.`,
          }
        : {
            // El oficio salió y solo falló el aviso al ciudadano. Quien no
            // recibe la confirmación tiende a creer que no se envió y a
            // repetir: por eso se le dice que no lo haga.
            tone: 'success',
            title: 'Oficio enviado',
            description: `Enviamos el oficio a ${name}, pero no pudimos mandarte la confirmación a tu correo. El envío sí se hizo: no lo vuelvas a enviar, o ${name} lo recibiría dos veces.`,
          };

    case 'unconfirmed': {
      // No se remite al correo del ciudadano: en el 504 el servidor no llega a
      // mandarle la confirmación, así que que no le llegue no demuestra nada,
      // y es justo la conclusión que acaba en un reenvío. Solo el ente sabe.
      const contact = target.phone ? `${name} al ${target.phone}` : name;
      return {
        tone: 'warning',
        title: 'No sabemos si el oficio llegó',
        description:
          `No pudimos confirmar si el oficio le llegó a ${name}, y es posible que sí. ` +
          'No lo vuelvas a enviar sin comprobarlo: si ya le llegó, lo recibiría dos veces. ' +
          `Para comprobarlo, comunícate con ${contact}.`,
      };
    }

    case 'rate-limited':
      return {
        tone: 'warning',
        title: 'Espera antes de volver a intentarlo',
        description:
          'Hay un límite de envíos por hora y ya lo alcanzaste. ' +
          `Podrás volver a intentarlo ${waitTime(result.retryAfterSeconds)}. ` +
          'No enviamos nada en este intento.',
      };

    case 'no-mailbox':
      return {
        tone: 'warning',
        title: 'No podemos enviárselo por correo',
        description: `${name} no tiene un correo registrado en nuestro directorio, así que no podemos enviarle el oficio. No enviamos nada. Puedes descargar el PDF y presentarlo directamente ante ${name}.`,
      };

    case 'not-found':
      // El servidor responde 404 a varias cosas sin decir cuál, a propósito:
      // el oficio caducó o no es de quien lo envía, la PQRSD no es suya, el
      // ente no es competente para ella, o la cuenta no tiene correo.
      return {
        tone: 'error',
        title: 'No se pudo enviar',
        description: `El oficio o la PQRSD ya no están disponibles, o ${name} no corresponde a la ubicación de la entidad de esta PQRSD. No enviamos nada. Cierra esta ventana y vuelve a empezar el seguimiento.`,
      };

    case 'session-expired':
      return {
        tone: 'error',
        title: 'Sesión caducada',
        description: 'Vuelve a iniciar sesión e inténtalo de nuevo. No enviamos nada.',
      };

    case 'not-sent':
      return {
        tone: 'error',
        title: 'No se pudo enviar el oficio',
        description: `No enviamos nada. Inténtalo de nuevo en unos minutos; si sigue fallando, descarga el PDF y preséntalo directamente ante ${name}.`,
      };
  }
}

/**
 * ¿Se puede volver a pulsar «Enviar por correo» después de este resultado?
 *
 * No, cuando repetir haría daño o no serviría: tras `sent` duplicaría el
 * oficio en el buzón del ente; tras `unconfirmed` podría duplicarlo; y tras
 * `no-mailbox` o `not-found` el servidor daría la misma respuesta.
 *
 * A diferencia de la web, tras `unconfirmed` la app no ofrece ningún reenvío,
 * ni siquiera detrás de un «ya lo comprobé».
 */
export function allowsAnotherSend(result: OversightSendResult | null): boolean {
  if (!result) return true;

  switch (result.kind) {
    case 'rate-limited':
    case 'session-expired':
    case 'not-sent':
      return true;
    default:
      return false;
  }
}

/**
 * ¿Puede estar ya el oficio en el buzón del ente? Entonces no se vuelve a
 * ofrecer el envío a ese ente aunque se redacte otro oficio para él.
 */
export function mayHaveReached(result: OversightSendResult): boolean {
  return result.kind === 'sent' || result.kind === 'unconfirmed';
}

/** «en 12 minutos», con el plazo del servidor si llegó. */
function waitTime(seconds: number | null): string {
  if (seconds === null) {
    // El límite es por hora: más de eso no hay que esperar.
    return 'dentro de una hora como máximo';
  }

  const minutes = Math.ceil(seconds / 60);
  if (minutes >= 60) return 'en una hora';
  return minutes === 1 ? 'en 1 minuto' : `en ${minutes} minutos`;
}
