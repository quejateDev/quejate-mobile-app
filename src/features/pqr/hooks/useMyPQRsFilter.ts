import { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@core/api/client';
import { ENDPOINTS } from '@core/api/endpoints';
import { useAuth } from '@core/auth/useAuth';
import type { PQRS, PQRSStatus } from '@core/types';
import type { MyPQRsResponse } from '@features/pqr/hooks/useMyPQRs';

/** El `limit` más alto que acepta `GET /pqr/user/:id`: por encima responde 400. */
export const MY_PQRS_FILTER_PAGE_SIZE = 50;

/**
 * Tope de páginas de la lista entera, el mismo que el de la búsqueda del muro.
 * El 30/09/2026 la cuenta con más PQRSD tenía 30 y basta una petición; el tope
 * acota la descarga si alguna crece antes de que filtre el servidor.
 */
export const MY_PQRS_FILTER_MAX_PAGES = 10;

/** Las PQRSD más recientes que se filtran cuando alguien pasa del tope. */
export const MY_PQRS_FILTER_MAX_PQRS = MY_PQRS_FILTER_PAGE_SIZE * MY_PQRS_FILTER_MAX_PAGES;

/**
 * Todas las PQRSD de una persona, tal como llegaron página a página.
 *
 * Conserva la forma `{ pages: [{ pqrs }] }` y vive bajo `['pqrs-by-user', …]`
 * para que le alcance lo que ya mantiene al día la lista paginada: el detalle
 * copia en esas listas la PQRSD fresca (`syncListCaches`, usePQRDetail.ts) y
 * las mutaciones las invalidan por el prefijo `['pqrs-by-user']`. Con otra
 * forma u otra clave, una PQRSD recién resuelta seguiría bajo «Pendiente».
 */
interface WholeList {
  pages: MyPQRsResponse[];
  /** Se llegó al tope y el servidor decía que había más. */
  truncated: boolean;
}

function wholeListQueryKey(userId: string | undefined) {
  return ['pqrs-by-user', userId, 'whole-list'] as const;
}

function fetchPage(userId: string, page: number, signal: AbortSignal): Promise<MyPQRsResponse> {
  return apiClient
    .get<MyPQRsResponse>(ENDPOINTS.PQR.BY_USER(userId), {
      params: { page, limit: MY_PQRS_FILTER_PAGE_SIZE },
      signal,
    })
    .then((r) => r.data);
}

/**
 * Pide las PQRSD de `userId` de 50 en 50 hasta que el servidor dice que no hay
 * más, o hasta el tope.
 *
 * O devuelve todas las páginas o falla: si una no llega, no se publica ninguna.
 * Con media lista, la pantalla diría «No tienes PQRSDs con este estado» de las
 * que sí tiene.
 */
async function fetchWholeList(userId: string, signal: AbortSignal): Promise<WholeList> {
  const pages: MyPQRsResponse[] = [];
  let page: number | null = 1;

  while (page !== null && pages.length < MY_PQRS_FILTER_MAX_PAGES) {
    const data = await fetchPage(userId, page, signal);
    // Una respuesta sin lista no es una página vacía: darla por buena cerraría
    // el filtro con «No tienes PQRSDs con este estado» sin haber leído nada.
    if (!Array.isArray(data?.pqrs)) {
      throw new TypeError('GET /pqr/user/:id respondió sin la lista de PQRSD');
    }
    pages.push(data);
    page = data.nextPage ?? null;
  }

  return { pages, truncated: page !== null };
}

/**
 * La paginación es por desplazamiento: si la persona radica entre dos páginas,
 * la última PQRSD de una vuelve al principio de la siguiente.
 */
function uniquePqrs(pages: MyPQRsResponse[]): PQRS[] {
  return Array.from(
    new Map(
      pages
        .flatMap((page) => page.pqrs)
        .filter((p) => !!p?.id)
        .map((p) => [p.id, p]),
    ).values(),
  );
}

export type MyPQRsFilterStatus = 'idle' | 'loading' | 'complete' | 'error';

/**
 * Las PQRSD de quien tiene la sesión que están en `status`, mirando la lista
 * entera y no solo las páginas que la pantalla lleva cargadas.
 *
 * «Mis PQRSD» se pagina de 10 en 10, y un filtro sobre lo ya cargado no ve lo
 * que está de la segunda página en adelante. Con un estado elegido se trae la
 * lista completa (`fetchWholeList`) y se filtra en el teléfono. Si `loaded` ya
 * es la lista entera (`loadedIsWhole`: el servidor dijo que no hay más
 * páginas), no se pide nada: es el caso de quien tiene 10 o menos. Sin estado
 * tampoco se pide nada, y la lista sigue con su paginación.
 *
 * `status` (el que devuelve) dice cuánto vale lo que hay en `results`:
 * - `loading`: la lista entera aún no ha llegado. `results` sale de lo que
 *   haya (lo que la pantalla lleva cargado, o la lista de un filtro anterior)
 *   y puede faltarle algo: todavía no se puede decir «No tienes PQRSDs con
 *   este estado».
 * - `complete`: se filtró la lista entera, o las `MY_PQRS_FILTER_MAX_PQRS` más
 *   recientes si `limitReached`.
 * - `error`: la lista entera no llegó. `results` sigue siendo parcial.
 *
 * La lista entera se vuelve a pedir cada vez que se sale de «Todas»
 * (`staleTime: 0`), no al pasar de un estado a otro. La lista paginada se
 * refresca por su cuenta, y con una copia de hace minutos el filtro no
 * enseñaría una PQRSD que ya está a la vista en «Todas».
 */
export function useMyPQRsFilter(
  status: PQRSStatus | undefined,
  loaded: PQRS[],
  loadedIsWhole: boolean,
) {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();

  const isFiltering = !!status && !!userId;
  const needsWholeList = isFiltering && !loadedIsWhole;

  const query = useQuery<WholeList>({
    queryKey: wholeListQueryKey(userId),
    queryFn: ({ signal }) => fetchWholeList(userId!, signal),
    enabled: needsWholeList,
    staleTime: 0,
  });

  const wholeList = useMemo(
    () => (query.data ? uniquePqrs(query.data.pages) : null),
    [query.data],
  );
  const pool = loadedIsWhole ? loaded : (wholeList ?? loaded);
  const results = useMemo(
    () => (isFiltering ? pool.filter((pqr) => pqr.status === status) : []),
    [isFiltering, pool, status],
  );

  let filterStatus: MyPQRsFilterStatus;
  if (!isFiltering) filterStatus = 'idle';
  else if (loadedIsWhole) filterStatus = 'complete';
  // También mientras se reintenta o se refresca: hasta que no vuelve, no es
  // la lista de ahora.
  else if (query.isFetching || query.isPending) filterStatus = 'loading';
  else if (query.isError) filterStatus = 'error';
  else filterStatus = 'complete';

  // Invalidar, y no `query.refetch()`: una consulta invalidada solo se vuelve a
  // pedir si está en uso, es decir, con un estado elegido y la lista a medias.
  // `query.refetch()` la descargaría también con «Todas». Así la función es la
  // misma en cada render y puede ir en un `useFocusEffect` sin dispararlo.
  const refetch = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: wholeListQueryKey(userId) });
  }, [queryClient, userId]);

  return {
    status: filterStatus,
    results,
    limitReached: filterStatus === 'complete' && !loadedIsWhole && query.data?.truncated === true,
    /** Vuelve a pedir la lista entera, si es de ella de donde sale `results`. */
    refetch,
  };
}
