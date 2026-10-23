import { formatColombiaDateTime, nonBreakingHyphens } from '../detail/detailUtils';

const NB_HYPHEN = '\u2011';

describe('formatColombiaDateTime', () => {
  it('pinta la fecha y la hora de Colombia como la web', () => {
    expect(formatColombiaDateTime('2026-10-22T13:05:09.000Z')).toBe('22/10/2026, 08:05:09 a. m.');
  });

  it('cambia de día cuando en UTC ya es el siguiente', () => {
    expect(formatColombiaDateTime('2026-10-22T03:15:00.000Z')).toBe('21/10/2026, 10:15:00 p. m.');
  });

  it('el mediodía es 12 p. m. y la medianoche 12 a. m.', () => {
    expect(formatColombiaDateTime('2026-10-23T17:00:00.000Z')).toBe('23/10/2026, 12:00:00 p. m.');
    expect(formatColombiaDateTime('2026-10-23T05:00:00.000Z')).toBe('23/10/2026, 12:00:00 a. m.');
  });

  it('acepta también un Date', () => {
    expect(formatColombiaDateTime(new Date('2026-10-23T17:30:00.000Z'))).toBe(
      '23/10/2026, 12:30:00 p. m.',
    );
  });

  it('con una fecha que no se puede leer devuelve null', () => {
    expect(formatColombiaDateTime('no es una fecha')).toBeNull();
  });
});

describe('nonBreakingHyphens', () => {
  it('cambia cada guion por uno que no parte la línea', () => {
    expect(nonBreakingHyphens('EXT-2026-004512')).toBe(`EXT${NB_HYPHEN}2026${NB_HYPHEN}004512`);
  });

  it('deja igual un valor sin guiones', () => {
    expect(nonBreakingHyphens('RAD 2026 4512')).toBe('RAD 2026 4512');
  });
});
