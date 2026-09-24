import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import MyLegalDocsScreen from '../MyLegalDocsScreen';
import { useMyLegalDocs } from '@features/pqr/hooks/useLegalDocs';
import type { LegalDocSummary } from '@core/types';

jest.mock('@core/api/client', () => ({ apiClient: { get: jest.fn() } }));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));

jest.mock('@features/pqr/hooks/useLegalDocs', () => ({ useMyLegalDocs: jest.fn() }));

const tutela: LegalDocSummary = {
  id: 'doc-1',
  type: 'TUTELA',
  title: 'Acción de tutela contra Alcaldía de Santa Marta',
  pqrId: 'pqr-1',
  createdAt: new Date('2026-09-20T10:00:00Z'),
  expiresAt: new Date('2027-03-20T10:00:00Z'),
};

// Título real que manda el backend para un oficio, verificado en su DTO.
const oversight: LegalDocSummary = {
  id: 'doc-2',
  type: 'OVERSIGHT',
  title: 'Solicitud de Intervención por Incumplimiento en la Respuesta de Queja',
  pqrId: null,
  createdAt: new Date('2026-09-22T10:00:00Z'),
  expiresAt: new Date('2027-03-22T10:00:00Z'),
};

function mockList(docs: LegalDocSummary[]) {
  (useMyLegalDocs as jest.Mock).mockReturnValue({
    data: docs,
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
    isRefetching: false,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('MyLegalDocsScreen', () => {
  // La app nunca genera un OVERSIGHT, pero la cuenta de pruebas ya tiene uno:
  // llegan a la lista si se generaron desde la web. La pantalla pinta el
  // `title` del servidor y no un rótulo derivado del tipo, y esto lo ata.
  it('pinta un documento OVERSIGHT con el título que manda el servidor', async () => {
    mockList([oversight]);

    const { getByText } = render(<MyLegalDocsScreen />);

    await waitFor(() =>
      expect(
        getByText('Solicitud de Intervención por Incumplimiento en la Respuesta de Queja'),
      ).toBeTruthy(),
    );
  });

  it('lista los dos tipos juntos sin descartar el que no genera', async () => {
    mockList([tutela, oversight]);

    const { getByText } = render(<MyLegalDocsScreen />);

    await waitFor(() => {
      expect(getByText('Acción de tutela contra Alcaldía de Santa Marta')).toBeTruthy();
      expect(
        getByText('Solicitud de Intervención por Incumplimiento en la Respuesta de Queja'),
      ).toBeTruthy();
    });
  });

  it('muestra hasta cuándo está disponible cada documento', async () => {
    mockList([oversight]);

    const { getByText } = render(<MyLegalDocsScreen />);

    await waitFor(() => expect(getByText(/^Disponible hasta /)).toBeTruthy());
  });

  it('el aviso de conservación está en la lista, no solo antes de generar', async () => {
    mockList([tutela]);

    const { getByText } = render(<MyLegalDocsScreen />);

    await waitFor(() => expect(getByText(/seis meses/i)).toBeTruthy());
  });

  it('el estado vacío no promete que la app genere oficios', async () => {
    mockList([]);

    const { getByText, queryByText } = render(<MyLegalDocsScreen />);

    await waitFor(() => expect(getByText('Aún no tienes documentos')).toBeTruthy());
    expect(queryByText(/ente de control|oficio/i)).toBeNull();
  });
});
