import React from 'react';
import { Alert } from 'react-native';
import { act, fireEvent, render } from '@testing-library/react-native';
import OversightLetterScreen from '../OversightLetterScreen';
import { usePQRDetail } from '@features/pqr/hooks/usePQRDetail';
import { usePdfDownload } from '@features/pqr/hooks/usePdfDownload';
import {
  sendOversightLetter,
  useGenerateOversightLetter,
  useOversightEntities,
} from '@features/pqr/hooks/useOversightLetter';
import { downloadLegalDocPdf } from '@features/pqr/utils/legalDocShare';
import type { OversightSendResult } from '@features/pqr/utils/oversightSend';

// 🔴 Ningún envío real: todos los entes del directorio son reales, y un correo
// de prueba le llegaría a una Personería. Todo lo que sale va simulado.
jest.mock('@core/api/client', () => ({ apiClient: { get: jest.fn(), post: jest.fn() } }));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@react-navigation/native', () => ({
  useRoute: () => ({ params: { pqrId: 'pqr-1' } }),
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
}));

jest.mock('@features/pqr/hooks/usePQRDetail', () => ({ usePQRDetail: jest.fn() }));
jest.mock('@features/pqr/hooks/usePdfDownload', () => ({ usePdfDownload: jest.fn() }));
jest.mock('@features/pqr/hooks/useOversightLetter', () => ({
  useOversightEntities: jest.fn(),
  useGenerateOversightLetter: jest.fn(),
  sendOversightLetter: jest.fn(),
}));
jest.mock('@features/pqr/utils/legalDocShare', () => ({ downloadLegalDocPdf: jest.fn() }));

const LETTER = 'Señores Personería de Santa Marta. Asunto: solicitud de intervención…';

const IDENTITY_NOTICE =
  'Al enviar el oficio, el ente de control recibirá tu nombre y tus datos de contacto, para que pueda responderte y actuar frente a la entidad que no respondió tu solicitud.';
const ANONYMOUS_NOTICE = 'Tu PQRSD es anónima ante la entidad, pero el oficio no lo es.';

const pqr = {
  id: 'pqr-1',
  type: 'COMPLAINT',
  status: 'PENDING',
  anonymous: false,
  description: 'Llevo tres semanas sin agua.',
  entityId: 'ent-1',
  entity: { id: 'ent-1', name: 'Alcaldía de Santa Marta' },
  creator: { id: 'u1', name: 'Ana Ruiz' },
  createdAt: new Date('2026-01-15T15:30:00Z'),
  dueDate: new Date('2026-02-15T00:00:00Z'),
  isOverdue: true,
  businessDaysOverdue: 20,
};

const personeria = {
  id: 'ov-1',
  name: 'Personería de Santa Marta',
  email: 'contacto@personeria.example',
  phone: '605 4211000',
  description: 'Ministerio público municipal',
  Municipality: { id: '47.001', name: 'SANTA MARTA' },
  RegionalDepartment: { id: '47', name: 'MAGDALENA' },
};

const sinCorreo = {
  id: 'ov-2',
  name: 'Procuraduría Regional del Magdalena',
  email: '',
  phone: null,
  description: null,
  Municipality: null,
  RegionalDepartment: { id: '47', name: 'MAGDALENA' },
};

const location = { departmentName: 'MAGDALENA', cityName: 'SANTA MARTA' };

const mutate = jest.fn();
const run = jest.fn();
let alertSpy: jest.SpyInstance;

function mockPqr(overrides: Record<string, unknown> = {}) {
  (usePQRDetail as jest.Mock).mockReturnValue({
    data: { ...pqr, ...overrides },
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  });
}

function mockEntities(data: unknown) {
  (useOversightEntities as jest.Mock).mockReturnValue({
    data,
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  });
}

/** La redacción responde lo que pida cada prueba. */
function mockDraft(letter: { content: string; id: string | null }) {
  mutate.mockImplementation((_input, opts: { onSuccess: (r: unknown) => void }) =>
    opts.onSuccess(letter),
  );
}

function mockSend(result: OversightSendResult) {
  (sendOversightLetter as jest.Mock).mockResolvedValue(result);
}

/** Escoge un ente: redacta el oficio para él. */
function pick(screen: ReturnType<typeof render>, name: string) {
  fireEvent.press(screen.getByLabelText(`Redactar el oficio para ${name}`));
}

/** Pulsa «Enviar por correo» y confirma en la alerta. */
async function sendAndConfirm(screen: ReturnType<typeof render>) {
  fireEvent.press(screen.getByText('Enviar por correo'));
  const buttons = alertSpy.mock.calls.at(-1)[2] as { text: string; onPress?: () => void }[];
  await act(async () => {
    buttons.find((b) => b.text === 'Enviar')!.onPress!();
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  mockPqr();
  mockEntities({ kind: 'ok', entities: [personeria, sinCorreo], location });
  (useGenerateOversightLetter as jest.Mock).mockReturnValue({ isPending: false, mutate });
  (usePdfDownload as jest.Mock).mockReturnValue({ busy: null, run });
  mockDraft({ content: LETTER, id: 'doc-1' });
});

afterEach(() => {
  alertSpy.mockRestore();
});

describe('OversightLetterScreen: escoger el ente', () => {
  it('pide los entes con la entidad de la PQRSD', () => {
    render(<OversightLetterScreen />);
    expect(useOversightEntities).toHaveBeenCalledWith('ent-1');
  });

  it('lista los entes con su correo, su teléfono y su ubicación', () => {
    const screen = render(<OversightLetterScreen />);

    expect(screen.getByText('Personería de Santa Marta')).toBeTruthy();
    expect(screen.getByText('contacto@personeria.example')).toBeTruthy();
    expect(screen.getByText('605 4211000')).toBeTruthy();
    expect(screen.getByText('Santa Marta, Magdalena')).toBeTruthy();
  });

  it('un ente sin correo se puede escoger, y se dice que no se podrá enviar', () => {
    const screen = render(<OversightLetterScreen />);

    expect(
      screen.getByText(
        'Sin correo registrado: podrás redactar y descargar el oficio, pero no enviarlo desde la app.',
      ),
    ).toBeTruthy();
    expect(screen.getByLabelText('Redactar el oficio para Procuraduría Regional del Magdalena'))
      .toBeTruthy();
  });

  it('avisa antes de redactar de cuánto se conserva el documento', () => {
    const screen = render(<OversightLetterScreen />);
    expect(screen.getByText(/seis meses/)).toBeTruthy();
  });

  it('si la entidad no tiene departamento lo dice, como la web', () => {
    mockEntities({ kind: 'no-department' });
    const screen = render(<OversightLetterScreen />);

    expect(screen.getByText('La entidad no tiene departamento asignado')).toBeTruthy();
  });

  it('sin entes para la ubicación lo dice', () => {
    mockEntities({ kind: 'ok', entities: [], location });
    const screen = render(<OversightLetterScreen />);

    expect(screen.getByText('No se encontraron entes de control para esta ubicación')).toBeTruthy();
  });

  it('si no se pudieron cargar, deja reintentar', () => {
    (useOversightEntities as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: jest.fn(),
    });
    const screen = render(<OversightLetterScreen />);

    expect(screen.getByText('No se pudieron cargar los entes de control.')).toBeTruthy();
    expect(screen.getByText('Reintentar')).toBeTruthy();
  });

  it('con una PQRSD que no está vencida no ofrece nada', () => {
    mockPqr({ isOverdue: false, businessDaysOverdue: 0 });
    const screen = render(<OversightLetterScreen />);

    expect(
      screen.getByText('El oficio al ente de control solo está disponible para una PQRSD vencida.'),
    ).toBeTruthy();
    expect(screen.queryByText('Personería de Santa Marta')).toBeNull();
  });
});

describe('OversightLetterScreen: redactar', () => {
  it('redacta con los datos exactos de la web', () => {
    const screen = render(<OversightLetterScreen />);

    pick(screen, 'Personería de Santa Marta');

    expect(mutate).toHaveBeenCalledTimes(1);
    expect(mutate.mock.calls[0][0]).toEqual({
      fullName: 'Ana Ruiz',
      oversightEntity: 'Personería de Santa Marta',
      entity: 'Alcaldía de Santa Marta',
      pqrType: 'Queja',
      pqrDate: '2026-01-15',
      daysExceeded: 20,
      pqrDescription: 'Llevo tres semanas sin agua.',
      department: 'Magdalena',
      city: 'Santa Marta',
    });
  });

  it('muestra el oficio entero', () => {
    const screen = render(<OversightLetterScreen />);
    pick(screen, 'Personería de Santa Marta');

    expect(screen.getByText(LETTER)).toBeTruthy();
    expect(screen.getByText(LETTER).props.selectable).toBe(true);
  });

  it('mientras redacta, lo dice', () => {
    (useGenerateOversightLetter as jest.Mock).mockReturnValue({ isPending: true, mutate });
    const screen = render(<OversightLetterScreen />);

    expect(screen.getByText(/Redactando el oficio/)).toBeTruthy();
  });

  it('un 429 al redactar se dice con su texto', () => {
    mutate.mockImplementation((_input, opts: { onError: (e: unknown) => void }) =>
      opts.onError({ response: { status: 429, headers: { 'retry-after': '300' } } }),
    );
    const screen = render(<OversightLetterScreen />);

    pick(screen, 'Personería de Santa Marta');

    expect(alertSpy).toHaveBeenCalledWith(
      'Espera antes de volver a intentarlo',
      'Hay un límite de documentos que puedes redactar en poco tiempo y ya lo alcanzaste. ' +
        'Podrás volver a intentarlo en 5 minutos. No redactamos nada en este intento.',
    );
    expect(screen.queryByText(LETTER)).toBeNull();
  });
});

describe('OversightLetterScreen: descargar y enviar', () => {
  it('con id descarga el PDF del oficio guardado', async () => {
    const screen = render(<OversightLetterScreen />);
    pick(screen, 'Personería de Santa Marta');

    fireEvent.press(screen.getByText('Descargar PDF'));

    expect(run).toHaveBeenCalledWith('pdf', expect.any(Function), 'Guardar o compartir el oficio');
    await run.mock.calls[0][1]();
    expect(downloadLegalDocPdf).toHaveBeenCalledWith('doc-1');
  });

  it('sin id muestra el texto, pero ni PDF ni envío, y dice por qué', () => {
    mockDraft({ content: LETTER, id: null });
    const screen = render(<OversightLetterScreen />);
    pick(screen, 'Personería de Santa Marta');

    expect(screen.getByText(LETTER)).toBeTruthy();
    expect(screen.queryByText('Descargar PDF')).toBeNull();
    expect(screen.queryByText('Enviar por correo')).toBeNull();
    expect(
      screen.getByText(
        'No pudimos guardar este oficio, así que no hay PDF ni podemos enviarlo por correo al ente de control: los dos salen del documento guardado. Cópialo antes de salir de esta pantalla; si lo necesitas en PDF o quieres enviarlo, vuelve a redactarlo más tarde.',
      ),
    ).toBeTruthy();
    expect(screen.getByText('Compartir texto')).toBeTruthy();
  });

  it('un ente sin correo: se redacta y se descarga, pero no se envía', () => {
    const screen = render(<OversightLetterScreen />);
    pick(screen, 'Procuraduría Regional del Magdalena');

    expect(mutate).toHaveBeenCalledTimes(1);
    expect(screen.getByText(LETTER)).toBeTruthy();
    expect(screen.getByText('Descargar PDF')).toBeTruthy();
    expect(screen.queryByText('Enviar por correo')).toBeNull();
    expect(screen.getByText('No podemos enviárselo por correo')).toBeTruthy();
    expect(sendOversightLetter).not.toHaveBeenCalled();
  });

  it('antes de enviar pide confirmación nombrando al ente, y no envía sin ella', () => {
    const screen = render(<OversightLetterScreen />);
    pick(screen, 'Personería de Santa Marta');

    fireEvent.press(screen.getByText('Enviar por correo'));

    expect(alertSpy).toHaveBeenCalledTimes(1);
    const [title, message, buttons] = alertSpy.mock.calls[0];
    expect(title).toBe('¿Enviar el oficio?');
    expect(message).toContain('Personería de Santa Marta');
    expect(message).toContain('contacto@personeria.example');
    expect(buttons.map((b: { text: string }) => b.text)).toEqual(['Cancelar', 'Enviar']);
    expect(sendOversightLetter).not.toHaveBeenCalled();
  });

  it('la confirmación lleva el aviso de los datos, tal cual', () => {
    const screen = render(<OversightLetterScreen />);
    pick(screen, 'Personería de Santa Marta');

    fireEvent.press(screen.getByText('Enviar por correo'));

    const message: string = alertSpy.mock.calls[0][1];
    expect(message).toContain(IDENTITY_NOTICE);
    expect(message).not.toContain(ANONYMOUS_NOTICE);
  });

  it('en una PQRSD anónima avisa también de eso, antes del aviso de los datos', () => {
    mockPqr({ anonymous: true });
    const screen = render(<OversightLetterScreen />);
    pick(screen, 'Personería de Santa Marta');

    fireEvent.press(screen.getByText('Enviar por correo'));

    const message: string = alertSpy.mock.calls[0][1];
    expect(message).toContain(ANONYMOUS_NOTICE);
    expect(message.indexOf(ANONYMOUS_NOTICE)).toBeLessThan(message.indexOf(IDENTITY_NOTICE));
  });

  it('al confirmar envía solo identificadores', async () => {
    mockSend({ kind: 'sent', citizenNotified: true });
    const screen = render(<OversightLetterScreen />);
    pick(screen, 'Personería de Santa Marta');

    await sendAndConfirm(screen);

    expect(sendOversightLetter).toHaveBeenCalledWith('doc-1', {
      pqrId: 'pqr-1',
      oversightEntityId: 'ov-1',
    });
  });

  it.each<[OversightSendResult, string, boolean]>([
    [{ kind: 'sent', citizenNotified: true }, 'Oficio enviado', false],
    [{ kind: 'sent', citizenNotified: false }, 'Oficio enviado', false],
    [{ kind: 'unconfirmed' }, 'No sabemos si el oficio llegó', false],
    [{ kind: 'no-mailbox' }, 'No podemos enviárselo por correo', false],
    [{ kind: 'not-found' }, 'No se pudo enviar', false],
    [{ kind: 'session-expired' }, 'Sesión caducada', true],
    [{ kind: 'not-sent' }, 'No se pudo enviar el oficio', true],
    [{ kind: 'rate-limited', retryAfterSeconds: 600 }, 'Espera antes de volver a intentarlo', true],
  ])('tras %p muestra «%s»; ¿se puede volver a enviar? %p', async (result, title, again) => {
    mockSend(result);
    const screen = render(<OversightLetterScreen />);
    pick(screen, 'Personería de Santa Marta');

    await sendAndConfirm(screen);

    expect(await screen.findByText(title)).toBeTruthy();
    expect(!!screen.queryByText('Enviar por correo')).toBe(again);
  });

  it('el 429 del envío dice cuánto esperar y que no salió nada', async () => {
    mockSend({ kind: 'rate-limited', retryAfterSeconds: 600 });
    const screen = render(<OversightLetterScreen />);
    pick(screen, 'Personería de Santa Marta');

    await sendAndConfirm(screen);

    expect(
      await screen.findByText(
        'Hay un límite de envíos por hora y ya lo alcanzaste. Podrás volver a intentarlo en 10 minutos. No enviamos nada en este intento.',
      ),
    ).toBeTruthy();
  });

  // 🔴 Tras «sin confirmar» no se ofrece volver a enviar: el ente recibiría dos.
  it('tras «sin confirmar» no hay reenvío, ni siquiera redactando otro oficio para el mismo ente', async () => {
    mockSend({ kind: 'unconfirmed' });
    const screen = render(<OversightLetterScreen />);
    pick(screen, 'Personería de Santa Marta');

    await sendAndConfirm(screen);
    expect(await screen.findByText('No sabemos si el oficio llegó')).toBeTruthy();
    expect(screen.queryByText('Enviar por correo')).toBeNull();
    expect(screen.queryByText(/Ya comprobé/)).toBeNull();

    fireEvent.press(screen.getByText('Escoger otro ente'));
    pick(screen, 'Personería de Santa Marta');

    expect(screen.getByText(LETTER)).toBeTruthy();
    expect(screen.getByText('No sabemos si el oficio llegó')).toBeTruthy();
    expect(screen.queryByText('Enviar por correo')).toBeNull();
    expect(sendOversightLetter).toHaveBeenCalledTimes(1);
  });

  it('tras «no enviado» se puede reintentar, y el aviso viejo se va', async () => {
    mockSend({ kind: 'not-sent' });
    const screen = render(<OversightLetterScreen />);
    pick(screen, 'Personería de Santa Marta');

    await sendAndConfirm(screen);
    expect(await screen.findByText('No se pudo enviar el oficio')).toBeTruthy();

    mockSend({ kind: 'sent', citizenNotified: true });
    await sendAndConfirm(screen);

    expect(await screen.findByText('Oficio enviado')).toBeTruthy();
    expect(screen.queryByText('No se pudo enviar el oficio')).toBeNull();
    expect(sendOversightLetter).toHaveBeenCalledTimes(2);
  });

  it('un doble toque en «Enviar» manda un solo oficio', async () => {
    let resolve: (r: OversightSendResult) => void = () => undefined;
    (sendOversightLetter as jest.Mock).mockReturnValue(
      new Promise<OversightSendResult>((r) => {
        resolve = r;
      }),
    );
    const screen = render(<OversightLetterScreen />);
    pick(screen, 'Personería de Santa Marta');

    fireEvent.press(screen.getByText('Enviar por correo'));
    const buttons = alertSpy.mock.calls[0][2] as { text: string; onPress: () => void }[];
    const send = buttons.find((b) => b.text === 'Enviar')!;
    await act(async () => {
      send.onPress();
      send.onPress();
    });
    await act(async () => {
      resolve({ kind: 'sent', citizenNotified: true });
    });

    expect(sendOversightLetter).toHaveBeenCalledTimes(1);
  });
});
