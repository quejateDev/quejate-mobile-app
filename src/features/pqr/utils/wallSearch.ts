import type { PQRS } from '@core/types';

/**
 * Deja un texto listo para comparar: sin tildes, sin mayúsculas y con los
 * espacios recogidos. «Basúra», «BASURA» y « basura » quedan en «basura».
 *
 * La tilde se quita separando cada letra de su marca (NFD) y tirando la marca.
 * Con ella caen la diéresis y la virgulilla: «senal» encuentra «señal».
 *
 * Los espacios se recogen porque el teclado deja uno al final cada vez que se
 * acepta una sugerencia, y con él «basura » ya no casaba con «…la basura.».
 */
export function normalizeSearchText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Lo que el buscador del muro lee de una PQRSD, ya normalizado: el asunto, la
 * descripción y el nombre de la entidad.
 *
 * La lista es cerrada a propósito. No entra `creator`, ni `guestName`, ni nada
 * que identifique a quien radicó: una PQRSD anónima no puede salir al buscar el
 * nombre de su autor. Hoy el servidor vacía `creator` en las anónimas, pero el
 * buscador no puede depender de que ese campo llegue vacío.
 *
 * Cada campo va en su línea. El texto que se busca nunca lleva saltos de línea
 * (`normalizeSearchText` los recoge), así que nada casa a caballo entre el
 * final de un campo y el principio del siguiente.
 */
export function wallSearchText(pqr: PQRS): string {
  return [pqr.subject, pqr.description, pqr.entity?.name]
    .map((field) => normalizeSearchText(field ?? ''))
    .join('\n');
}
