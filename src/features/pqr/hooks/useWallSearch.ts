import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@core/api/client';
import { ENDPOINTS } from '@core/api/endpoints';
import type { PQRS } from '@core/types';
import type { PQRListResponse } from '@features/pqr/hooks/usePQRList';
import { normalizeSearchText, searchWall, toSearchable } from '@features/pqr/utils/wallSearch';

/** El `limit` más alto que acepta `GET /pqr`: por encima responde 400. */
export const WALL_SEARCH_PAGE_SIZE = 50;

/**
 * Tope de páginas del muro entero. El 05/10/2026 el muro tenía 24 PQRSD y basta
 * una petición; el tope acota la descarga si crece antes de que filtre el
 * servidor.
 */
export const WALL_SEARCH_MAX_PAGES = 10;

/** Las PQRSD más recientes en las que se busca cuando el muro pasa del tope. */
export const WALL_SEARCH_MAX_PQRS = WALL_SEARCH_PAGE_SIZE * WALL_SEARCH_MAX_PAGES;

/**
 * El muro entero, tal como llegó página a página.
 *
 * Conserva la forma `{ pages: [{ pqrs }] }` y vive bajo `['pqrs', …]` para que
 * le alcance lo que ya mantiene al día el muro paginado: el detalle copia en
 * esas listas la PQRSD fresca (`syncListCaches`, usePQRDetail.ts) y las
 * mutaciones las invalidan por el prefijo `['pqrs']`. Con otra forma u otra
 * clave, las tarjetas de una búsqueda se quedarían con el estado viejo.
 */
interface WholeWall {
  pages: PQRListResponse[];
  /** Se llegó al tope y el servidor decía que había más. */
  truncated: boolean;
}

const WHOLE_WALL_QUERY_KEY = ['pqrs', 'whole-wall'] as const;

function fetchWallPage(page: number, signal: AbortSignal): Promise<PQRListResponse> {
  return apiClient
    .get<PQRListResponse>(ENDPOINTS.PQR.LIST, {
      params: { page, limit: WALL_SEARCH_PAGE_SIZE },
      signal,
    })
    .then((r) => r.data);
}

/**
 * Pide el muro de 50 en 50 hasta que el servidor dice que no hay más, o hasta
 * el tope.
 *
 * O devuelve todas las páginas o falla: si una no llega, no se publica ninguna.
 * Con media lista, la pantalla diría «Sin resultados» de PQRSD que existen.
 */
async function fetchWholeWall(signal: AbortSignal): Promise<WholeWall> {
  const pages: PQRListResponse[] = [];
  let page: number | null = 1;

  while (page !== null && pages.length < WALL_SEARCH_MAX_PAGES) {
    const data = await fetchWallPage(page, signal);
    // Una respuesta sin lista no es una página vacía: darla por buena cerraría
    // la búsqueda con «Sin resultados» sin haber leído el muro.
    if (!Array.isArray(data?.pqrs)) {
      throw new TypeError('GET /pqr respondió sin la lista de PQRSD');
    }
    pages.push(data);
    page = data.nextPage ?? null;
  }

  return { pages, truncated: page !== null };
}

/**
 * La paginación es por desplazamiento: si alguien radica entre dos páginas, la
 * última PQRSD de una vuelve al principio de la siguiente.
 */
function uniquePqrs(pages: PQRListResponse[]): PQRS[] {
  return Array.from(
    new Map(
      pages
        .flatMap((page) => page.pqrs)
        .filter((p) => !!p?.id)
        .map((p) => [p.id, p]),
    ).values(),
  );
}

export type WallSearchStatus = 'idle' | 'searching' | 'complete' | 'error';

/**
 * Busca `text` en el muro entero, y no solo en las páginas que la pantalla
 * lleva cargadas.
 *
 * El muro se pagina de 10 en 10, y un filtro sobre lo ya cargado no ve lo que
 * está de la segunda página en adelante. Con texto en la caja se trae el muro
 * completo (`fetchWholeWall`) y se filtra en el teléfono. Sin texto no se pide
 * nada, y el muro sigue con su paginación.
 *
 * `status` dice cuánto vale lo que hay en `results`:
 * - `searching`: el muro entero aún no ha llegado. `results` sale de lo que
 *   haya —lo que la pantalla lleva cargado (`loaded`) o el muro de una búsqueda
 *   anterior— y puede faltarle algo: todavía no se puede decir «Sin resultados».
 * - `complete`: se buscó en todo el muro, o en las `WALL_SEARCH_MAX_PQRS` más
 *   recientes si `limitReached`.
 * - `error`: el muro entero no llegó. `results` sigue siendo parcial.
 *
 * El muro se vuelve a pedir cada vez que se empieza a buscar (`staleTime: 0`).
 * El muro paginado se refresca por su cuenta, y con una copia de hace minutos
 * la búsqueda no encontraría una PQRSD que ya está a la vista en él.
 */
export function useWallSearch(text: string, loaded: PQRS[]) {
  const term = normalizeSearchText(text);
  const isSearching = term.length > 0;

  const query = useQuery<WholeWall>({
    queryKey: WHOLE_WALL_QUERY_KEY,
    queryFn: ({ signal }) => fetchWholeWall(signal),
    enabled: isSearching,
    staleTime: 0,
  });

  const wholeWall = useMemo(
    () => (query.data ? uniquePqrs(query.data.pages) : null),
    [query.data],
  );
  const pool = wholeWall ?? loaded;

  // El texto de cada PQRSD se normaliza una vez por lista, no en cada tecla.
  const searchable = useMemo(
    () => (isSearching ? pool.map((pqr) => toSearchable(pqr)) : []),
    [isSearching, pool],
  );
  const results = useMemo(() => searchWall(searchable, term), [searchable, term]);

  let status: WallSearchStatus;
  if (!isSearching) status = 'idle';
  // También mientras se reintenta o se refresca: hasta que no vuelve, no es
  // el muro de ahora.
  else if (query.isFetching || query.isPending) status = 'searching';
  else if (query.isError) status = 'error';
  else status = 'complete';

  return {
    status,
    results,
    limitReached: status === 'complete' && query.data?.truncated === true,
    /** Vuelve a pedir el muro entero. Sin texto en la caja no hace nada. */
    refetch: () => {
      if (isSearching) query.refetch();
    },
  };
}
