import React from 'react';
import { Image } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import PeopleSearchScreen from '../PeopleSearchScreen';
import { useUserSearch } from '@features/users/hooks/useUserSearch';
import type { UserSearchStatus } from '@features/users/hooks/useUserSearch';
import type { UserSearchResult } from '@core/types';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('@features/users/hooks/useUserSearch', () => ({ useUserSearch: jest.fn() }));

// Fila tal como la manda hoy producción.
const withEverything: UserSearchResult = {
  id: 'user-mario',
  name: 'Mario Rincón',
  role: 'CLIENT',
  image: 'https://example.com/mario.jpg',
  _count: { followers: 12, following: 4, PQRS: 3 },
};

// Fila del contrato anterior, sin `image` ni `_count`: es lo que vería la app
// si el servidor volviera a esa versión.
const bare: UserSearchResult = { id: 'user-gladys', name: 'Gladys Márquez Ruiz', role: 'LAWYER' };

function mockSearch(
  status: UserSearchStatus,
  extra: Partial<ReturnType<typeof useUserSearch>> = {},
) {
  const retry = jest.fn();
  (useUserSearch as jest.Mock).mockReturnValue({
    status,
    results: [],
    limitReached: false,
    error: null,
    retry,
    ...extra,
  });
  return { retry };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('PeopleSearchScreen', () => {
  it('entra con el foco en la caja y pide un nombre', () => {
    mockSearch('idle');

    const { getByPlaceholderText, getByText } = render(<PeopleSearchScreen />);

    expect(getByPlaceholderText('Nombre de la persona').props.autoFocus).toBe(true);
    expect(getByText('Escribe un nombre')).toBeTruthy();
  });

  it('busca lo que se escribe en la caja', () => {
    mockSearch('idle');
    const { getByPlaceholderText } = render(<PeopleSearchScreen />);

    fireEvent.changeText(getByPlaceholderText('Nombre de la persona'), 'mario');

    expect(useUserSearch).toHaveBeenLastCalledWith('mario');
  });

  it('dice que está buscando', () => {
    mockSearch('searching');

    const { getByText, queryByText } = render(<PeopleSearchScreen />);

    expect(getByText('Buscando…')).toBeTruthy();
    expect(queryByText('Escribe un nombre')).toBeNull();
  });

  it('pinta foto, nombre, PQRSD públicas y seguidores cuando llegan', () => {
    mockSearch('results', { results: [withEverything] });

    const { getByText, queryByText, UNSAFE_getByType } = render(<PeopleSearchScreen />);

    expect(getByText('Mario Rincón')).toBeTruthy();
    expect(getByText('Ciudadano')).toBeTruthy();
    expect(getByText('3 PQRSD públicas · 12 seguidores')).toBeTruthy();
    expect(UNSAFE_getByType(Image).props.source).toEqual({ uri: 'https://example.com/mario.jpg' });
    // Con foto no se pintan además las iniciales.
    expect(queryByText('MR')).toBeNull();
  });

  it('pinta la fila con iniciales y sin contadores cuando no llegan image ni _count', () => {
    mockSearch('results', { results: [bare] });

    const { getByText, queryByText, UNSAFE_queryByType } = render(<PeopleSearchScreen />);

    expect(getByText('Gladys Márquez Ruiz')).toBeTruthy();
    expect(getByText('GR')).toBeTruthy();
    expect(getByText('Abogado')).toBeTruthy();
    expect(UNSAFE_queryByType(Image)).toBeNull();
    // Sin `_count` no se inventan ceros.
    expect(queryByText(/PQRSD|seguidor/)).toBeNull();
  });

  it('pinta las dos formas juntas en la misma lista', () => {
    mockSearch('results', { results: [withEverything, bare] });

    const { getByText } = render(<PeopleSearchScreen />);

    expect(getByText('Mario Rincón')).toBeTruthy();
    expect(getByText('Gladys Márquez Ruiz')).toBeTruthy();
  });

  it('usa el singular con una PQRSD y un seguidor, y enseña los ceros', () => {
    mockSearch('results', {
      results: [
        { ...withEverything, id: 'one', _count: { followers: 1, following: 0, PQRS: 1 } },
        { ...withEverything, id: 'zero', _count: { followers: 0, following: 0, PQRS: 0 } },
      ],
    });

    const { getByText } = render(<PeopleSearchScreen />);

    expect(getByText('1 PQRSD pública · 1 seguidor')).toBeTruthy();
    expect(getByText('0 PQRSD públicas · 0 seguidores')).toBeTruthy();
  });

  it('pinta a quien no tiene nombre ni foto sin romperse', () => {
    mockSearch('results', {
      results: [{ id: 'user-x', name: null, role: 'CLIENT', image: null }],
    });

    const { getByText, getByLabelText } = render(<PeopleSearchScreen />);

    expect(getByText('Sin nombre')).toBeTruthy();
    expect(getByText('?')).toBeTruthy();
    expect(getByLabelText('Ver perfil de Sin nombre')).toBeTruthy();
  });

  it('dice que no hay nadie con ese nombre', () => {
    mockSearch('empty');

    const { getByText, queryByText } = render(<PeopleSearchScreen />);

    expect(getByText('Nadie con ese nombre')).toBeTruthy();
    expect(queryByText('Escribe un nombre')).toBeNull();
  });

  it('avisa de que el servidor solo devuelve los primeros', () => {
    const five = [1, 2, 3, 4, 5].map((n) => ({ ...bare, id: `user-${n}` }));
    mockSearch('results', { results: five, limitReached: true });

    const { getByText } = render(<PeopleSearchScreen />);

    expect(getByText('Mostrando los 5 primeros. Escribe más para afinar.')).toBeTruthy();
  });

  it('no habla de «los primeros» cuando están todos a la vista', () => {
    mockSearch('results', { results: [withEverything, bare] });

    const { queryByText } = render(<PeopleSearchScreen />);

    expect(queryByText(/Mostrando los/)).toBeNull();
  });

  it('ante un fallo de red lo dice y deja reintentar', () => {
    const { retry } = mockSearch('error', { error: new Error('Network Error') });

    const { getByText } = render(<PeopleSearchScreen />);

    expect(getByText('No se pudo buscar. Verifica tu conexión.')).toBeTruthy();
    fireEvent.press(getByText('Reintentar'));
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('no culpa a la conexión cuando quien falla es el servidor', () => {
    // Lo que lanza axios cuando el servidor contesta: un Error con `response`.
    const throttled = Object.assign(new Error('Request failed with status code 429'), {
      response: { status: 429 },
    });
    mockSearch('error', { error: throttled });

    const { getByText, queryByText } = render(<PeopleSearchScreen />);

    expect(getByText('No se pudo buscar. Inténtalo de nuevo en un momento.')).toBeTruthy();
    expect(queryByText(/conexión/)).toBeNull();
  });

  it('abre el perfil público de la persona que se toca', () => {
    mockSearch('results', { results: [withEverything, bare] });
    const { getByLabelText } = render(<PeopleSearchScreen />);

    fireEvent.press(getByLabelText('Ver perfil de Gladys Márquez Ruiz'));

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('PublicProfile', { userId: 'user-gladys' });
  });
});
