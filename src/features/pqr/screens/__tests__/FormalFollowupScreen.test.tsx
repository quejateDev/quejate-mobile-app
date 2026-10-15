import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import FormalFollowupScreen from '../FormalFollowupScreen';
import { usePQRDetail } from '@features/pqr/hooks/usePQRDetail';

jest.mock('@core/api/client', () => ({ apiClient: { get: jest.fn() } }));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useRoute: () => ({ params: { pqrId: 'pqr-1' } }),
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('@features/pqr/hooks/usePQRDetail', () => ({ usePQRDetail: jest.fn() }));

const overdueComplaint = {
  id: 'pqr-1',
  type: 'COMPLAINT',
  status: 'PENDING',
  dueDate: new Date('2026-02-15'),
  isOverdue: true,
  businessDaysOverdue: 20,
};

function mockPqr(data: unknown) {
  (usePQRDetail as jest.Mock).mockReturnValue({ data, isLoading: false, isError: false });
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('FormalFollowupScreen', () => {
  it('con una PQRSD vencida ofrece el oficio al ente de control, como la web', () => {
    mockPqr(overdueComplaint);
    const screen = render(<FormalFollowupScreen />);

    expect(screen.getByText('Enviar a ente de control')).toBeTruthy();
    expect(screen.getByText('Enviar a ente de control competente')).toBeTruthy();
  });

  it('las otras dos opciones siguen ahí', () => {
    mockPqr(overdueComplaint);
    const screen = render(<FormalFollowupScreen />);

    expect(screen.getByText('Generar acción de tutela')).toBeTruthy();
    expect(screen.getByText('Contactar abogado')).toBeTruthy();
  });

  it('lleva a la pantalla del oficio con la PQRSD', () => {
    mockPqr(overdueComplaint);
    const screen = render(<FormalFollowupScreen />);

    fireEvent.press(screen.getByLabelText('Enviar a ente de control'));

    expect(mockNavigate).toHaveBeenCalledWith('OversightLetter', { pqrId: 'pqr-1' });
  });

  it.each(['PETITION', 'CLAIM', 'COMPLAINT', 'REPORT'])(
    'sale en los cuatro tipos con plazo (%s)',
    (type) => {
      mockPqr({ ...overdueComplaint, type });
      const screen = render(<FormalFollowupScreen />);

      expect(screen.queryByText('Enviar a ente de control')).toBeTruthy();
    },
  );

  it('no sale con una sugerencia, que no tiene plazo legal', () => {
    // El servidor podría mandar isOverdue: true; la sugerencia no se vence igual.
    mockPqr({ ...overdueComplaint, type: 'SUGGESTION' });
    const screen = render(<FormalFollowupScreen />);

    expect(screen.queryByText('Enviar a ente de control')).toBeNull();
  });

  it('no sale con una PQRSD que no está vencida', () => {
    mockPqr({ ...overdueComplaint, isOverdue: false, businessDaysOverdue: 0 });
    const screen = render(<FormalFollowupScreen />);

    expect(screen.queryByText('Enviar a ente de control')).toBeNull();
  });

  it('no sale con una PQRSD ya resuelta', () => {
    mockPqr({ ...overdueComplaint, status: 'RESOLVED' });
    const screen = render(<FormalFollowupScreen />);

    expect(screen.queryByText('Enviar a ente de control')).toBeNull();
  });

  it('mientras la PQRSD no ha cargado, no la ofrece', () => {
    mockPqr(undefined);
    const screen = render(<FormalFollowupScreen />);

    expect(screen.queryByText('Enviar a ente de control')).toBeNull();
    expect(screen.getByText('Generar acción de tutela')).toBeTruthy();
  });
});
