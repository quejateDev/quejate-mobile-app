import {
  allowsAnotherSend,
  classifyOversightSend,
  describeOversightSend,
  mayHaveReached,
  retryAfterSeconds,
} from '../oversightSend';
import type { OversightSendResult } from '../oversightSend';

const target = { name: 'Personería de Santa Marta', phone: '605 4211000' };

describe('classifyOversightSend', () => {
  it('un 200 es enviado, con la confirmación al ciudadano', () => {
    expect(
      classifyOversightSend({ status: 200, data: { citizenNotified: true, sentAt: 'x' } }),
    ).toEqual({ kind: 'sent', citizenNotified: true });
  });

  it('un 200 sin confirmación al ciudadano sigue siendo enviado', () => {
    expect(classifyOversightSend({ status: 200, data: { citizenNotified: false } })).toEqual({
      kind: 'sent',
      citizenNotified: false,
    });
  });

  it('un 200 con un cuerpo ilegible es enviado y sin confirmación', () => {
    expect(classifyOversightSend({ status: 200, data: '' })).toEqual({
      kind: 'sent',
      citizenNotified: false,
    });
  });

  it('sin respuesta (tiempo agotado o red cortada) no se sabe: sin confirmar', () => {
    expect(classifyOversightSend(undefined)).toEqual({ kind: 'unconfirmed' });
  });

  it.each([
    [401, { kind: 'session-expired' }],
    [404, { kind: 'not-found' }],
    [409, { kind: 'no-mailbox' }],
    [400, { kind: 'not-sent' }],
  ])('un %i se clasifica sin dudas, porque el servidor rechaza antes del correo', (status, kind) => {
    expect(classifyOversightSend({ status, data: { error: 'x' } })).toEqual(kind);
  });

  it('un 429 lleva los segundos de Retry-After', () => {
    expect(
      classifyOversightSend({ status: 429, data: {}, headers: { 'Retry-After': '720' } }),
    ).toEqual({ kind: 'rate-limited', retryAfterSeconds: 720 });
  });

  it('un 429 sin Retry-After no inventa un plazo', () => {
    expect(classifyOversightSend({ status: 429, data: {}, headers: {} })).toEqual({
      kind: 'rate-limited',
      retryAfterSeconds: null,
    });
  });

  // 🔴 La regla de fondo: solo es «no enviado» lo que seguro no salió.
  it.each([
    [502, 'OVERSIGHT_MAIL_FAILED'],
    [503, 'OVERSIGHT_MAIL_NOT_CONFIGURED'],
  ])('un %i con el código %s es no enviado', (status, code) => {
    expect(classifyOversightSend({ status, data: { error: 'x', code } })).toEqual({
      kind: 'not-sent',
    });
  });

  it.each([
    [504, { code: 'OVERSIGHT_MAIL_TIMEOUT' }],
    [502, { error: 'Bad gateway' }],
    [502, null],
    [500, { error: 'x' }],
  ])('un %i sin un código de «no salió» es sin confirmar', (status, data) => {
    expect(classifyOversightSend({ status, data })).toEqual({ kind: 'unconfirmed' });
  });
});

describe('retryAfterSeconds', () => {
  it('lee la cabecera sin importar las mayúsculas', () => {
    expect(retryAfterSeconds({ 'retry-after': '59.2' })).toBe(60);
    expect(retryAfterSeconds({ 'RETRY-AFTER': 30 })).toBe(30);
  });

  it('no da plazo con una cabecera ausente, vacía o rara', () => {
    expect(retryAfterSeconds(undefined)).toBeNull();
    expect(retryAfterSeconds({ 'retry-after': '' })).toBeNull();
    expect(retryAfterSeconds({ 'retry-after': '0' })).toBeNull();
    expect(retryAfterSeconds({ 'retry-after': 'Wed, 21 Oct 2026 07:28:00 GMT' })).toBeNull();
  });
});

describe('describeOversightSend', () => {
  it('enviado con confirmación', () => {
    expect(describeOversightSend({ kind: 'sent', citizenNotified: true }, target)).toEqual({
      tone: 'success',
      title: 'Oficio enviado',
      description:
        'Enviamos el oficio a Personería de Santa Marta. También te mandamos una confirmación a tu correo.',
    });
  });

  it('enviado sin confirmación pide que no se reenvíe', () => {
    const notice = describeOversightSend({ kind: 'sent', citizenNotified: false }, target);
    expect(notice.tone).toBe('success');
    expect(notice.description).toBe(
      'Enviamos el oficio a Personería de Santa Marta, pero no pudimos mandarte la confirmación a tu correo. El envío sí se hizo: no lo vuelvas a enviar, o Personería de Santa Marta lo recibiría dos veces.',
    );
  });

  it('sin confirmar no dice que no salió y remite al teléfono del ente', () => {
    const notice = describeOversightSend({ kind: 'unconfirmed' }, target);
    expect(notice).toEqual({
      tone: 'warning',
      title: 'No sabemos si el oficio llegó',
      description:
        'No pudimos confirmar si el oficio le llegó a Personería de Santa Marta, y es posible que sí. ' +
        'No lo vuelvas a enviar sin comprobarlo: si ya le llegó, lo recibiría dos veces. ' +
        'Para comprobarlo, comunícate con Personería de Santa Marta al 605 4211000.',
    });
    expect(notice.description).not.toMatch(/No enviamos nada/);
  });

  it('sin confirmar y sin teléfono nombra solo al ente', () => {
    expect(
      describeOversightSend({ kind: 'unconfirmed' }, { name: 'Procuraduría Regional' }).description,
    ).toMatch(/comunícate con Procuraduría Regional\.$/);
  });

  it.each([
    [60 * 12, 'en 12 minutos'],
    [45, 'en 1 minuto'],
    [3600, 'en una hora'],
    [null, 'dentro de una hora como máximo'],
  ])('el límite (Retry-After %p) dice cuándo: %s', (seconds, when) => {
    expect(
      describeOversightSend({ kind: 'rate-limited', retryAfterSeconds: seconds }, target),
    ).toEqual({
      tone: 'warning',
      title: 'Espera antes de volver a intentarlo',
      description: `Hay un límite de envíos por hora y ya lo alcanzaste. Podrás volver a intentarlo ${when}. No enviamos nada en este intento.`,
    });
  });

  it.each<[OversightSendResult, string]>([
    [{ kind: 'no-mailbox' }, 'No podemos enviárselo por correo'],
    [{ kind: 'not-found' }, 'No se pudo enviar'],
    [{ kind: 'session-expired' }, 'Sesión caducada'],
    [{ kind: 'not-sent' }, 'No se pudo enviar el oficio'],
  ])('lo que no salió dice que no enviamos nada (%p)', (result, title) => {
    const notice = describeOversightSend(result, target);
    expect(notice.title).toBe(title);
    expect(notice.description).toMatch(/No enviamos nada/);
  });

  it('ningún texto lleva raya', () => {
    const results: OversightSendResult[] = [
      { kind: 'sent', citizenNotified: true },
      { kind: 'sent', citizenNotified: false },
      { kind: 'unconfirmed' },
      { kind: 'rate-limited', retryAfterSeconds: null },
      { kind: 'no-mailbox' },
      { kind: 'not-found' },
      { kind: 'session-expired' },
      { kind: 'not-sent' },
    ];
    for (const result of results) {
      const { title, description } = describeOversightSend(result, target);
      expect(`${title} ${description}`).not.toMatch(/[—–]/);
    }
  });
});

describe('allowsAnotherSend', () => {
  it('antes de enviar, se puede', () => {
    expect(allowsAnotherSend(null)).toBe(true);
  });

  it.each<OversightSendResult>([
    { kind: 'rate-limited', retryAfterSeconds: 60 },
    { kind: 'session-expired' },
    { kind: 'not-sent' },
  ])('tras lo que seguro no salió, se puede volver a intentar (%p)', (result) => {
    expect(allowsAnotherSend(result)).toBe(true);
  });

  // 🔴 Tras «sin confirmar» no hay reenvío: el ente recibiría dos.
  it.each<OversightSendResult>([
    { kind: 'sent', citizenNotified: true },
    { kind: 'sent', citizenNotified: false },
    { kind: 'unconfirmed' },
    { kind: 'no-mailbox' },
    { kind: 'not-found' },
  ])('tras %p no se vuelve a ofrecer', (result) => {
    expect(allowsAnotherSend(result)).toBe(false);
  });
});

describe('mayHaveReached', () => {
  it('solo lo enviado y lo sin confirmar pueden estar en el buzón del ente', () => {
    expect(mayHaveReached({ kind: 'sent', citizenNotified: true })).toBe(true);
    expect(mayHaveReached({ kind: 'unconfirmed' })).toBe(true);
    expect(mayHaveReached({ kind: 'not-sent' })).toBe(false);
    expect(mayHaveReached({ kind: 'not-found' })).toBe(false);
  });
});
