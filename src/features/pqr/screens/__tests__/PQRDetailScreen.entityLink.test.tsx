import React from 'react';
import { render } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import PQRDetailScreen from '../PQRDetailScreen';
import { apiClient } from '@core/api/client';
import { ENDPOINTS } from '@core/api/endpoints';

// La pantalla y los hooks son los de verdad: lo simulado es la API.
jest.mock('@core/api/client', () => ({ apiClient: { get: jest.fn(), post: jest.fn() } }));

jest.mock('@core/auth/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1' }, isAuthenticated: true }),
}));

jest.mock('@react-navigation/native', () => ({
  useRoute: () => ({ params: { id: 'pqr-1' } }),
  useNavigation: () => ({ navigate: jest.fn() }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('expo-location', () => ({ reverseGeocodeAsync: jest.fn() }));

// El visor de documentos monta un WebView nativo, que en Jest no existe.
jest.mock('@features/pqr/components/detail/DocumentViewerModal', () => ({
  DocumentViewerModal: () => null,
}));

const get = apiClient.get as jest.Mock;

const TITLE = 'Seguimiento del envío';
const SENT = 'Enviada a Alcaldía de Santa Marta';
const OPENED = 'La entidad abrió el enlace del correo';
const NOT_OPENED = 'La entidad todavía no ha abierto el enlace.';
const CONFIRMED = 'La entidad confirmó que la recibió';
const NOT_CONFIRMED = 'La entidad todavía no ha confirmado que la recibió.';
const DISCLAIMER = 'Quéjate no puede garantizar que la entidad abra el correo ni que responda.';

const NB_HYPHEN = '\u2011';

// Las tres fechas, en UTC como las manda el servidor y como deben verse en
// Colombia (UTC-5). La de creación cae otro día en UTC.
const CREATED_AT = '2026-10-22T03:15:00.000Z';
const CREATED_CO = '21/10/2026, 10:15:00 p. m.';
const OPENED_AT = '2026-10-22T13:05:09.000Z';
const OPENED_CO = '22/10/2026, 08:05:09 a. m.';
const CONFIRMED_AT = '2026-10-23T17:30:00.000Z';
const CONFIRMED_CO = '23/10/2026, 12:30:00 p. m.';

const DATE = /^\d{2}\/\d{2}\/\d{4}, \d{2}:\d{2}:\d{2} [ap]\. m\.$/;

/** `GET /pqr/:id` tal como llega por la red (las fechas, en texto). */
const detail = {
  id: 'pqr-1',
  type: 'COMPLAINT',
  status: 'PENDING',
  subject: 'No hay agua',
  description: 'Tres días sin servicio en el barrio.',
  anonymous: false,
  private: false,
  consecutiveCode: 'PQR-20261021-0007',
  entityId: 'e1',
  entity: { id: 'e1', name: 'Alcaldía de Santa Marta' },
  department: null,
  creator: { id: 'user-1', name: 'Ana Ruiz' },
  createdAt: CREATED_AT,
  updatedAt: CREATED_AT,
  dueDate: '2026-11-20T05:00:00.000Z',
  isOverdue: false,
  businessDaysOverdue: 0,
  attachments: [],
  comments: [],
  likes: [],
  customFieldValues: [],
  statusHistory: [],
  _count: { likes: 0, comments: 0 },
};

function serve(body: Record<string, unknown>) {
  get.mockImplementation((url: string) => {
    if (url === ENDPOINTS.PQR.DETAIL('pqr-1')) return Promise.resolve({ data: body });
    if (url === ENDPOINTS.PQR.COMMENTS('pqr-1')) return Promise.resolve({ data: [] });
    return Promise.reject(new Error(`URL inesperada: ${url}`));
  });
}

let queryClient: QueryClient;

beforeEach(() => {
  jest.useFakeTimers();
  get.mockReset();
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});

afterEach(() => {
  queryClient.clear();
  jest.useRealTimers();
});

/** Abre el detalle y espera a que la cabecera pinte lo que mandó la API. */
async function openDetail(body: Record<string, unknown>) {
  serve(body);
  const screen = render(
    <QueryClientProvider client={queryClient}>
      <PQRDetailScreen />
    </QueryClientProvider>,
  );
  await screen.findByText('No hay agua');
  return screen;
}

function shownDates(screen: Awaited<ReturnType<typeof openDetail>>) {
  return screen.queryAllByText(DATE).map((node) => node.props.children);
}

describe('PQRDetailScreen: seguimiento del envío (R-42)', () => {
  it('sin abrir: la enviada con su fecha y los otros dos pasos pendientes', async () => {
    const screen = await openDetail({
      ...detail,
      entityLink: { openedAt: null, confirmedAt: null, radicado: null },
    });

    expect(screen.getByText(TITLE)).toBeTruthy();
    expect(screen.getByText(SENT)).toBeTruthy();
    expect(screen.getByText(NOT_OPENED)).toBeTruthy();
    expect(screen.getByText(NOT_CONFIRMED)).toBeTruthy();
    expect(screen.getByText(DISCLAIMER)).toBeTruthy();
    expect(screen.queryByText(OPENED)).toBeNull();
    expect(screen.queryByText(CONFIRMED)).toBeNull();
    expect(shownDates(screen)).toEqual([CREATED_CO]);
  });

  it('abierta: la apertura con su fecha y la confirmación pendiente', async () => {
    const screen = await openDetail({
      ...detail,
      entityLink: { openedAt: OPENED_AT, confirmedAt: null, radicado: null },
    });

    expect(screen.getByText(SENT)).toBeTruthy();
    expect(screen.getByText(OPENED)).toBeTruthy();
    expect(screen.getByText(NOT_CONFIRMED)).toBeTruthy();
    expect(screen.queryByText(NOT_OPENED)).toBeNull();
    expect(screen.queryByText(CONFIRMED)).toBeNull();
    expect(shownDates(screen)).toEqual([CREATED_CO, OPENED_CO]);
  });

  it('confirmada con radicado: los tres pasos con fecha y el radicado de la entidad', async () => {
    const screen = await openDetail({
      ...detail,
      entityLink: { openedAt: OPENED_AT, confirmedAt: CONFIRMED_AT, radicado: 'EXT-2026-004512' },
    });

    expect(screen.getByText(SENT)).toBeTruthy();
    expect(screen.getByText(OPENED)).toBeTruthy();
    expect(screen.getByText(CONFIRMED)).toBeTruthy();
    expect(screen.queryByText(NOT_OPENED)).toBeNull();
    expect(screen.queryByText(NOT_CONFIRMED)).toBeNull();
    expect(shownDates(screen)).toEqual([CREATED_CO, OPENED_CO, CONFIRMED_CO]);
    expect(
      screen.getByText(`Radicado de la entidad: EXT${NB_HYPHEN}2026${NB_HYPHEN}004512`),
    ).toBeTruthy();
  });

  it('el radicado no se parte por un guion, y se lee en voz alta con sus guiones', async () => {
    const screen = await openDetail({
      ...detail,
      entityLink: { openedAt: OPENED_AT, confirmedAt: CONFIRMED_AT, radicado: 'EXT-2026-004512' },
    });

    expect(screen.getByText(`EXT${NB_HYPHEN}2026${NB_HYPHEN}004512`)).toBeTruthy();
    expect(screen.queryByText(/EXT-2026/)).toBeNull();
    expect(screen.getByLabelText('Radicado de la entidad: EXT-2026-004512')).toBeTruthy();
  });

  it('confirmada sin radicado: no pinta la línea del radicado', async () => {
    const screen = await openDetail({
      ...detail,
      entityLink: { openedAt: OPENED_AT, confirmedAt: CONFIRMED_AT, radicado: null },
    });

    expect(screen.getByText(CONFIRMED)).toBeTruthy();
    expect(screen.queryByText(/Radicado de la entidad/)).toBeNull();
  });

  it('confirmada sin apertura registrada: la apertura sale hecha y sin fecha', async () => {
    // Solo se confirma desde el enlace, así que la entidad lo abrió (la web
    // decide lo mismo, `entity-link-timeline.tsx:36`).
    const screen = await openDetail({
      ...detail,
      entityLink: { openedAt: null, confirmedAt: CONFIRMED_AT, radicado: 'EXT-2026-004512' },
    });

    expect(screen.getByText(OPENED)).toBeTruthy();
    expect(screen.queryByText(NOT_OPENED)).toBeNull();
    expect(screen.getByText(CONFIRMED)).toBeTruthy();
    expect(shownDates(screen)).toEqual([CREATED_CO, CONFIRMED_CO]);
  });

  it.each([
    ['null (no es el autor, o la PQRSD es anterior al 21/10)', { ...detail, entityLink: null }],
    ['sin el campo (el servidor de hoy)', detail],
  ])('con entityLink %s el detalle queda como hoy', async (_case, body) => {
    const screen = await openDetail(body);

    expect(screen.queryByText(TITLE)).toBeNull();
    expect(screen.queryByText(SENT)).toBeNull();
    expect(screen.queryByText(DISCLAIMER)).toBeNull();
    expect(shownDates(screen)).toEqual([]);
    // El resto de la cabecera sigue ahí.
    expect(screen.getByText('Tres días sin servicio en el barrio.')).toBeTruthy();
    expect(screen.getByText('N.º de seguimiento')).toBeTruthy();
    expect(screen.getByText('Comentarios (0)')).toBeTruthy();
  });
});
