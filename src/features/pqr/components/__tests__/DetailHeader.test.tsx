import React from 'react';
import { render } from '@testing-library/react-native';
import { DetailHeader } from '../detail/DetailHeader';
import { usePQRDetail } from '@features/pqr/hooks/usePQRDetail';

jest.mock('@core/api/client', () => ({ apiClient: { get: jest.fn(), post: jest.fn() } }));
jest.mock('@core/auth/useAuth', () => ({
  useAuth: () => ({ user: null, isAuthenticated: false }),
}));
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));
jest.mock('expo-location', () => ({ reverseGeocodeAsync: jest.fn() }));
jest.mock('@features/pqr/hooks/usePQRDetail', () => ({ usePQRDetail: jest.fn() }));
jest.mock('@features/pqr/hooks/usePQRActions', () => ({
  useLikePQR: () => ({ mutate: jest.fn(), isPending: false }),
  useUpdateStatus: () => ({ mutate: jest.fn(), isPending: false }),
  useTogglePrivacy: () => ({ toggle: jest.fn(), isPending: false }),
}));
// El visor de documentos monta un WebView nativo, que en Jest no existe.
jest.mock('../detail/DocumentViewerModal', () => ({ DocumentViewerModal: () => null }));

const pqr = {
  id: 'pqr-1',
  type: 'COMPLAINT',
  status: 'RESOLVED',
  subject: 'No hay agua',
  anonymous: false,
  private: false,
  consecutiveCode: 'PQR-20260115-0042',
  entity: { id: 'e1', name: 'Alcaldía de Santa Marta' },
  creator: { id: 'u1', name: 'Ana Ruiz' },
  createdAt: new Date('2026-01-15'),
  dueDate: new Date('2026-02-15'),
};

describe('DetailHeader: nuestro número', () => {
  it('lo llama «N.º de seguimiento», no «Código»', () => {
    (usePQRDetail as jest.Mock).mockReturnValue({ data: pqr, isLoading: false });

    const screen = render(<DetailHeader pqrId="pqr-1" commentCount={0} />);

    expect(screen.getByText('N.º de seguimiento')).toBeTruthy();
    expect(screen.getByText('PQR-20260115-0042')).toBeTruthy();
    expect(screen.queryByText('Código')).toBeNull();
  });
});
