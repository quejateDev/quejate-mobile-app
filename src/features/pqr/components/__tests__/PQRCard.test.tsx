import React from 'react';
import { render } from '@testing-library/react-native';
import PQRCard from '../PQRCard';
import type { PQRS } from '@core/types';

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
    const { getByText } = render(<PQRCard pqr={pqr} onPress={() => {}} />);
    expect(getByText(/Anónimo/)).toBeTruthy();
  });

  it('muestra el nombre del autor cuando no es anónima', () => {
    const { getByText } = render(<PQRCard pqr={basePQR} onPress={() => {}} />);
    expect(getByText(/Juan García/)).toBeTruthy();
  });

  it('muestra badge "Vencida" cuando dueDate está en el pasado', () => {
    const pqr: PQRS = {
      ...basePQR,
      dueDate: new Date(Date.now() - 2 * 86400000) as unknown as Date,
    };
    const { getByText } = render(<PQRCard pqr={pqr} onPress={() => {}} />);
    expect(getByText('Vencida')).toBeTruthy();
  });

  it('no muestra badge de vencimiento cuando quedan más de 3 días', () => {
    const { queryByText } = render(<PQRCard pqr={basePQR} onPress={() => {}} />);
    expect(queryByText('Vencida')).toBeNull();
  });

  it('muestra contadores de likes y comentarios', () => {
    const { getByText } = render(<PQRCard pqr={basePQR} onPress={() => {}} />);
    expect(getByText('3')).toBeTruthy();
    expect(getByText('1')).toBeTruthy();
  });
});
