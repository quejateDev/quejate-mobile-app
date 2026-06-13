/** Matcher difuso de nombres geográficos (departamentos / municipios).
 *  Extraído de EntitySelector para reutilizarlo en el filtro por ubicación de
 *  la pestaña "Entidades". Normaliza tildes y prefijos administrativos comunes
 *  ("Distrito Especial de", "Departamento de", etc.) antes de comparar. */
export function normalizeGeoName(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(
      /\b(distrito\s+especial\s+de|departamento\s+de|municipio\s+de|de\s+la|de\s+el|del|de|la|el)\b/gi,
      '',
    )
    .replace(/\s+/g, ' ')
    .trim();
}

export function findByName<T extends { name: string }>(
  list: T[],
  target: string,
): T | undefined {
  const n = normalizeGeoName(target);
  if (!n) return undefined;
  return (
    list.find((item) => normalizeGeoName(item.name) === n) ||
    list.find((item) => normalizeGeoName(item.name).includes(n)) ||
    list.find((item) => n.includes(normalizeGeoName(item.name)))
  );
}
