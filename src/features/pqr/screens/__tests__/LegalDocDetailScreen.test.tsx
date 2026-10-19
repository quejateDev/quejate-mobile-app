import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import LegalDocDetailScreen from '../LegalDocDetailScreen';
import { useLegalDoc } from '@features/pqr/hooks/useLegalDocs';
import { usePdfDownload } from '@features/pqr/hooks/usePdfDownload';
import { downloadLegalDocPdf } from '@features/pqr/utils/legalDocShare';
import type { LegalDoc } from '@core/types';

jest.mock('@core/api/client', () => ({ apiClient: { get: jest.fn() } }));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@react-navigation/native', () => ({
  useRoute: () => ({ params: { id: 'doc-2' } }),
}));

jest.mock('@features/pqr/hooks/useLegalDocs', () => ({ useLegalDoc: jest.fn() }));
jest.mock('@features/pqr/hooks/usePdfDownload', () => ({ usePdfDownload: jest.fn() }));
jest.mock('@features/pqr/utils/legalDocShare', () => ({ downloadLegalDocPdf: jest.fn() }));

// Título real que manda el servidor para un oficio.
const oversight: LegalDoc = {
  id: 'doc-2',
  type: 'OVERSIGHT',
  title: 'Solicitud de Intervención por Incumplimiento en la Respuesta de Queja',
  pqrId: 'pqr-1',
  createdAt: new Date('2026-09-22T10:00:00Z'),
  expiresAt: new Date('2027-03-22T10:00:00Z'),
  content: 'Señores Personería de Santa Marta.\n\nAsunto: solicitud de intervención…',
};

const DRAFT_NOTICE =
  'Es un borrador redactado con inteligencia artificial: revísalo y corrígelo antes de presentarlo. Quéjate no se hace responsable de su contenido.';

const run = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  (useLegalDoc as jest.Mock).mockReturnValue({
    data: oversight,
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  });
  (usePdfDownload as jest.Mock).mockReturnValue({ busy: null, run });
});

describe('LegalDocDetailScreen con un oficio al ente de control', () => {
  it('pinta el título del servidor, la fecha de caducidad y el texto entero', () => {
    const screen = render(<LegalDocDetailScreen />);

    expect(
      screen.getByText('Solicitud de Intervención por Incumplimiento en la Respuesta de Queja'),
    ).toBeTruthy();
    expect(screen.getByText(/^Disponible hasta /)).toBeTruthy();
    expect(screen.getByText(oversight.content)).toBeTruthy();
  });

  it('descarga su PDF por su id, sin nada propio de la tutela', async () => {
    const screen = render(<LegalDocDetailScreen />);

    fireEvent.press(screen.getByText('Guardar o compartir el PDF'));

    expect(run).toHaveBeenCalledWith(
      'pdf',
      expect.any(Function),
      'Guardar o compartir el documento',
    );
    await run.mock.calls[0][1]();
    expect(downloadLegalDocPdf).toHaveBeenCalledWith('doc-2');
    expect(screen.queryByText(/tutela/i)).toBeNull();
  });

  it('avisa, encima del texto, de que es un borrador hecho con IA', () => {
    const screen = render(<LegalDocDetailScreen />);

    expect(screen.getByText(DRAFT_NOTICE)).toBeTruthy();
    const tree = JSON.stringify(screen.toJSON());
    expect(tree.indexOf(DRAFT_NOTICE)).toBeLessThan(tree.indexOf('Señores Personería'));
  });
});

describe('LegalDocDetailScreen con una tutela', () => {
  it('avisa también de que es un borrador hecho con IA', () => {
    (useLegalDoc as jest.Mock).mockReturnValue({
      data: { ...oversight, type: 'TUTELA', title: 'Acción de tutela', content: 'Señor juez…' },
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    });
    const screen = render(<LegalDocDetailScreen />);

    expect(screen.getByText('Señor juez…')).toBeTruthy();
    expect(screen.getByText(DRAFT_NOTICE)).toBeTruthy();
  });
});
