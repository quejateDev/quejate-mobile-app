import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import GenerateTutelaScreen from '../GenerateTutelaScreen';
import { useGenerateTutela } from '@features/pqr/hooks/useLegalDocs';
import { usePQRDetail } from '@features/pqr/hooks/usePQRDetail';
import { useDepartments, useMunicipalities } from '@features/pqr/hooks/useLocations';
import { useAuth } from '@core/auth/useAuth';

jest.mock('@core/api/client', () => ({
  apiClient: { get: jest.fn(), post: jest.fn() },
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@react-navigation/native', () => ({
  useRoute: () => ({ params: { pqrId: 'pqr-1' } }),
  useNavigation: () => ({ goBack: jest.fn(), navigate: jest.fn() }),
}));

jest.mock('@core/auth/useAuth', () => ({ useAuth: jest.fn() }));
jest.mock('@features/pqr/hooks/usePQRDetail', () => ({ usePQRDetail: jest.fn() }));
jest.mock('@features/pqr/hooks/useLocations', () => ({
  useDepartments: jest.fn(),
  useMunicipalities: jest.fn(),
}));
jest.mock('@features/pqr/hooks/useLegalDocs', () => ({ useGenerateTutela: jest.fn() }));
jest.mock('@features/pqr/utils/legalDocShare', () => ({
  downloadLegalDocPdf: jest.fn(),
}));

const TUTELA_TEXT = 'ACCIÓN DE TUTELA — señor juez…';

const pqr = {
  id: 'pqr-1',
  type: 'COMPLAINT',
  status: 'PENDING',
  subject: 'No hay agua',
  description: 'Llevo tres semanas sin agua.',
  entity: { id: 'e1', name: 'Alcaldía de Santa Marta' },
  createdAt: new Date('2026-01-15'),
  dueDate: new Date('2026-02-15'),
  isOverdue: true,
  businessDaysOverdue: 20,
};

/** Deja la mutación lista para devolver lo que pida cada prueba. */
function mockGenerate(resolved: { content: string; id: string | null }) {
  (useGenerateTutela as jest.Mock).mockReturnValue({
    isPending: false,
    mutate: (_body: unknown, opts: { onSuccess: (r: unknown) => void }) => {
      opts.onSuccess(resolved);
    },
  });
}

/** Rellena el formulario y pulsa «Generar tutela». */
function generate(screen: ReturnType<typeof render>) {
  fireEvent.changeText(screen.getByPlaceholderText('Cédula / documento'), '1234567890');

  fireEvent.press(screen.getByLabelText('Departamento: Selecciona un departamento'));
  fireEvent.press(screen.getByText('Magdalena'));

  fireEvent.press(screen.getByLabelText('Ciudad / Municipio: Selecciona una ciudad'));
  fireEvent.press(screen.getByText('Santa Marta'));

  fireEvent.press(screen.getByLabelText('Derecho vulnerado: Selecciona un derecho'));
  fireEvent.press(screen.getByText('Derecho de petición'));

  fireEvent.press(screen.getByText('Generar tutela'));
}

beforeEach(() => {
  jest.clearAllMocks();
  (useAuth as unknown as jest.Mock).mockReturnValue({ user: { id: 'u1', name: 'Ana Ruiz' } });
  (usePQRDetail as jest.Mock).mockReturnValue({
    data: pqr,
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  });
  (useDepartments as jest.Mock).mockReturnValue({
    departments: [{ id: 'd1', name: 'Magdalena' }],
  });
  (useMunicipalities as jest.Mock).mockReturnValue({
    municipalities: [{ id: 'm1', name: 'Santa Marta' }],
    isLoading: false,
  });
});

describe('GenerateTutelaScreen', () => {
  it('avisa antes de generar de cuánto se conserva el documento', () => {
    mockGenerate({ content: TUTELA_TEXT, id: 'doc-1' });
    const screen = render(<GenerateTutelaScreen />);

    expect(screen.getByText(/seis meses/i)).toBeTruthy();
  });

  it('con id ofrece el PDF', async () => {
    mockGenerate({ content: TUTELA_TEXT, id: 'doc-1' });
    const screen = render(<GenerateTutelaScreen />);

    generate(screen);

    await waitFor(() => expect(screen.getByText(TUTELA_TEXT)).toBeTruthy());
    expect(screen.getByText('Guardar o compartir el PDF')).toBeTruthy();
    expect(screen.queryByText(/No pudimos guardar este documento/)).toBeNull();
  });

  // Esta es la rama silenciosa: el guardado es best effort, así que un id
  // ausente es esperable, no excepcional. Si la pantalla no lo dice, el
  // ciudadano ve su tutela y ningún botón, y no sabe si la app está rota.
  it('sin id muestra el texto igual y explica que no se guardó', async () => {
    mockGenerate({ content: TUTELA_TEXT, id: null });
    const screen = render(<GenerateTutelaScreen />);

    generate(screen);

    await waitFor(() => expect(screen.getByText(TUTELA_TEXT)).toBeTruthy());
    expect(
      screen.getByText(/No pudimos guardar este documento\. Cópialo antes de salir/),
    ).toBeTruthy();
    expect(screen.getByText('Compartir texto')).toBeTruthy();
  });

  it('sin id no ofrece el PDF, que no existe', async () => {
    mockGenerate({ content: TUTELA_TEXT, id: null });
    const screen = render(<GenerateTutelaScreen />);

    generate(screen);

    await waitFor(() => expect(screen.getByText(TUTELA_TEXT)).toBeTruthy());
    expect(screen.queryByText('Guardar o compartir el PDF')).toBeNull();
  });

  it('el texto generado se puede seleccionar para copiarlo', async () => {
    // Sin dependencia de portapapeles, copiar es la selección del sistema:
    // si el texto deja de ser seleccionable, el aviso de arriba miente.
    mockGenerate({ content: TUTELA_TEXT, id: null });
    const screen = render(<GenerateTutelaScreen />);

    generate(screen);

    await waitFor(() => expect(screen.getByText(TUTELA_TEXT)).toBeTruthy());
    expect(screen.getByText(TUTELA_TEXT).props.selectable).toBe(true);
  });
});
