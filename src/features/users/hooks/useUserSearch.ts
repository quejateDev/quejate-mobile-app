import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@core/api/client';
import { ENDPOINTS } from '@core/api/endpoints';
import type { UserSearchResult } from '@core/types';

/** Espera entre teclas antes de preguntar al servidor. */
export const USER_SEARCH_DEBOUNCE_MS = 300;

/** Con menos letras no se pregunta: una sola coincide con casi cualquier nombre. */
export const USER_SEARCH_MIN_LENGTH = 2;

/**
 * Techo de resultados del servidor. No viaja en la respuesta: cuando llegan
 * tantos puede haber más que no se ven, y la pantalla tiene que decirlo.
 */
const USER_SEARCH_SERVER_LIMIT = 5;

export type UserSearchStatus = 'idle' | 'searching' | 'results' | 'empty' | 'error';

/**
 * El servidor compara el texto tal cual llega: no recorta ni junta espacios.
 * Un espacio delante —o el que deja el teclado al aceptar una sugerencia— hace
 * que no encuentre a nadie, así que se limpia aquí.
 */
export function normalizeUserSearchTerm(text: string): string {
  return text.trim().replace(/\s+/g, ' ');
}

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

/**
 * Busca personas por nombre en `GET /users/search` a medida que se escribe.
 *
 * El estado sale del texto de ahora, no del último que se preguntó: borrar la
 * caja vacía la lista en el acto, y mientras corre la espera entre teclas ya se
 * dice que se está buscando, en vez de dejar a la vista los resultados de otro
 * texto.
 *
 * Una respuesta que llega tarde no pisa a la siguiente: cada texto es una
 * consulta con su propia clave, y la de un texto que ya no está en la caja se
 * cancela (`signal`) y, si aun así contesta, se queda en su clave.
 */
export function useUserSearch(text: string) {
  const term = normalizeUserSearchTerm(text);
  const debouncedTerm = useDebouncedValue(term, USER_SEARCH_DEBOUNCE_MS);

  const query = useQuery<UserSearchResult[]>({
    queryKey: ['user-search', debouncedTerm],
    queryFn: ({ signal }) =>
      apiClient
        .get<UserSearchResult[]>(ENDPOINTS.USERS.SEARCH, {
          params: { q: debouncedTerm },
          signal,
        })
        // Guard defensivo: la pantalla no puede romperse por una forma inesperada.
        .then((r) => (Array.isArray(r.data) ? r.data : [])),
    enabled: debouncedTerm.length >= USER_SEARCH_MIN_LENGTH,
  });

  const found = query.data ?? [];
  const isSettled = term === debouncedTerm;
  // Reintentar tras un error vuelve a «buscando» en vez de dejar el error fijo.
  const isAsking = query.isPending || (query.isError && query.isFetching);

  let status: UserSearchStatus;
  if (term.length < USER_SEARCH_MIN_LENGTH) status = 'idle';
  else if (!isSettled || isAsking) status = 'searching';
  else if (query.isError) status = 'error';
  else if (found.length === 0) status = 'empty';
  else status = 'results';

  return {
    status,
    results: status === 'results' ? found : [],
    limitReached: status === 'results' && found.length >= USER_SEARCH_SERVER_LIMIT,
    error: status === 'error' ? query.error : null,
    retry: () => {
      query.refetch();
    },
  };
}
