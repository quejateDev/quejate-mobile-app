/**
 * IDs canónicos de categorías de producción para las tarjetas "Frecuentes" del muro.
 *
 * Descubiertos manualmente desde `GET https://www.quejate.com.co/api/category` (2026-05-21).
 * Las categorías viven solo en la BD de producción (no hay seed ni constante en el
 * backend repo). Si alguien renombra una categoría desde el admin, estos IDs siguen
 * siendo válidos — por eso filtramos por id, no por name.
 */
export const CATEGORY_SHORTCUTS = {
  /** Servicio Público — agrupa ESSMAR (acueducto/alcantarillado), ATESA (aseo/alumbrado),
   *  EDUS (renovación urbana), Air-e (energía). El entityNameHint específico decide
   *  cuál entidad se auto-selecciona dentro del listado filtrado por esta categoría. */
  serviciosPublicos: 'fc45d917-cdc3-4f3c-acae-72765b35715b',
  /** Ambiental — agrupa DADSA (sostenibilidad ambiental distrital) y CORPAMAG
   *  (Corporación Autónoma Regional del Magdalena). */
  ambiental: 'd104b7c9-a219-44c4-a984-8ce24da5326a',
} as const;

export type CategoryShortcutKey = keyof typeof CATEGORY_SHORTCUTS;
