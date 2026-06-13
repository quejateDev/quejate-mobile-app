import React from 'react';
import { render } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { PQRS } from '@core/types';

jest.mock('@core/api/client', () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), patch: jest.fn() },
}));
jest.mock('@core/auth/useAuth', () => ({
  useAuth: () => ({ user: null, isAuthenticated: false }),
}));

// eslint-disable-next-line import/first
import PQRCard from '../PQRCard';

function renderCard(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

const basePQR: PQRS = {
  id: 'pqr-1',
  type: 'PETITION',
  status: 'PENDING',
  dueDate: new Date(Date.now() + 10 * 86400000) as unknown as Date,
  anonymous: false,
  private: false,
  subject: 'Petición de prueba',
  description: 'Descripción de la petición',
  entityId: 'entity-1',
  createdAt: new Date() as unknown as Date,
  updatedAt: new Date() as unknown as Date,
  entity: { id: 'entity-1', name: 'Entidad Test' },
  department: null,
  creator: { id: 'user-1', name: 'Juan García' },
  attachments: [],
  comments: [],
  likes: [],
  customFieldValues: [],
  _count: { likes: 3, comments: 1 },
};

describe('PQRCard', () => {
  it('muestra "Anónimo" cuando la PQR es anónima', () => {
    const pqr: PQRS = { ...basePQR, anonymous: true };
    const { getByText } = renderCard(<PQRCard pqr={pqr} onPress={() => {}} />);
    expect(getByText(/Anónimo/)).toBeTruthy();
  });

  it('muestra el nombre del autor cuando no es anónima', () => {
    const { getByText } = renderCard(<PQRCard pqr={basePQR} onPress={() => {}} />);
    expect(getByText(/Juan García/)).toBeTruthy();
  });

  it('muestra badge "Vencida" cuando dueDate está en el pasado', () => {
    const pqr: PQRS = {
      ...basePQR,
      dueDate: new Date(Date.now() - 2 * 86400000) as unknown as Date,
    };
    const { getByText } = renderCard(<PQRCard pqr={pqr} onPress={() => {}} />);
    expect(getByText('Vencida')).toBeTruthy();
  });

  it('no muestra badge de vencimiento cuando quedan más de 3 días', () => {
    const { queryByText } = renderCard(<PQRCard pqr={basePQR} onPress={() => {}} />);
    expect(queryByText('Vencida')).toBeNull();
  });

  it('muestra contadores de likes y comentarios', () => {
    const { getByText } = renderCard(<PQRCard pqr={basePQR} onPress={() => {}} />);
    expect(getByText('3')).toBeTruthy();
    expect(getByText('1')).toBeTruthy();
  });

  it('muestra "Vence en 1d" para una PQRSD pendiente que vence mañana', () => {
    const pqr: PQRS = {
      ...basePQR,
      dueDate: new Date(Date.now() + 1 * 86400000) as unknown as Date,
    };
    const { getByText } = renderCard(<PQRCard pqr={pqr} onPress={() => {}} />);
    expect(getByText('Vence en 1d')).toBeTruthy();
  });

  it('no muestra "Vence en Xd" cuando la PQRSD está resuelta (bug del muro)', () => {
    const pqr: PQRS = {
      ...basePQR,
      status: 'RESOLVED',
      dueDate: new Date(Date.now() + 1 * 86400000) as unknown as Date,
    };
    const { queryByText } = renderCard(<PQRCard pqr={pqr} onPress={() => {}} />);
    expect(queryByText(/Vence/)).toBeNull();
  });

  it('no muestra "Vencida" cuando la PQRSD está cerrada aunque el dueDate pasó', () => {
    const pqr: PQRS = {
      ...basePQR,
      status: 'CLOSED',
      dueDate: new Date(Date.now() - 2 * 86400000) as unknown as Date,
    };
    const { queryByText } = renderCard(<PQRCard pqr={pqr} onPress={() => {}} />);
    expect(queryByText('Vencida')).toBeNull();
  });

  it('ignora isOverdue=true del backend cuando el estado es final', () => {
    const pqr: PQRS = {
      ...basePQR,
      status: 'RESOLVED',
      isOverdue: true,
      dueDate: new Date(Date.now() - 2 * 86400000) as unknown as Date,
    };
    const { queryByText } = renderCard(<PQRCard pqr={pqr} onPress={() => {}} />);
    expect(queryByText('Vencida')).toBeNull();
  });
});
