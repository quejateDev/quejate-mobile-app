import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import type { PQRS } from '@core/types';
import { PQRActionsSheet } from '../PQRActionsSheet';
import { usePdfDownload } from '../../hooks/usePdfDownload';
import { downloadCertificatePdf } from '../../utils/legalDocShare';

jest.mock('@core/api/client', () => ({ apiClient: { get: jest.fn(), patch: jest.fn() } }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('../../hooks/usePQRActions', () => ({
  useTogglePrivacy: () => ({ toggle: jest.fn(), isPending: false }),
}));
jest.mock('../../hooks/usePdfDownload', () => ({ usePdfDownload: jest.fn() }));
jest.mock('../../utils/legalDocShare', () => ({ downloadCertificatePdf: jest.fn() }));

// Privada: así la hoja no prepara la imagen para compartir, que aquí no se prueba.
const pqr = {
  id: 'pqr-1',
  type: 'COMPLAINT',
  status: 'PENDING',
  subject: 'No hay agua',
  private: true,
  anonymous: false,
} as unknown as PQRS;

const run = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  (usePdfDownload as jest.Mock).mockReturnValue({ busy: null, run });
});

describe('PQRActionsSheet: constancia de envío', () => {
  it('ofrece «Descargar constancia de envío», en PDF', () => {
    const screen = render(<PQRActionsSheet pqr={pqr} isOwner onClose={jest.fn()} />);

    expect(screen.getByText('Descargar constancia de envío')).toBeTruthy();
    expect(screen.getByText('En PDF')).toBeTruthy();
    expect(screen.queryByText(/certificado|radicaci/i)).toBeNull();
  });

  it('la descarga se titula «Constancia de envío» y explica cuándo no la hay', async () => {
    const screen = render(<PQRActionsSheet pqr={pqr} isOwner={false} onClose={jest.fn()} />);

    fireEvent.press(screen.getByText('Descargar constancia de envío'));

    expect(run).toHaveBeenCalledWith('certificate', expect.any(Function), 'Constancia de envío', {
      notFoundMessage:
        'No hay constancia disponible para esta PQRSD. Solo su autor puede descargarla.',
    });
    await run.mock.calls[0][1]();
    expect(downloadCertificatePdf).toHaveBeenCalledWith('pqr-1');
  });
});
