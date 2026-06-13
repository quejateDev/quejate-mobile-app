import {
  DB_CEIL,
  DB_FLOOR,
  dbfsFromPower,
  dbfsToApproxDb,
  leqDbfs,
  nextEmaPower,
  powerFromDbfs,
  type EnergyAccumulator,
} from '../sonometer';

function accumulate(samplesDbfs: number[]): EnergyAccumulator {
  return samplesDbfs.reduce<EnergyAccumulator>(
    (acc, dbfs) => ({ sumPower: acc.sumPower + powerFromDbfs(dbfs), count: acc.count + 1 }),
    { sumPower: 0, count: 0 },
  );
}

describe('sonometer · dbfsToApproxDb (mapeo 1:1 + offset 80)', () => {
  it('mapea con pendiente 1:1', () => {
    expect(dbfsToApproxDb(-40)).toBe(40);
    expect(dbfsToApproxDb(-30)).toBe(50);
    expect(dbfsToApproxDb(-20)).toBe(60);
  });

  it('acota al piso y al techo', () => {
    expect(dbfsToApproxDb(-160)).toBe(DB_FLOOR); // silencio
    expect(dbfsToApproxDb(-120)).toBe(DB_FLOOR);
    expect(dbfsToApproxDb(60)).toBe(DB_CEIL); // 140 → 130
  });

  it('devuelve el piso ante valores no finitos (defensivo)', () => {
    expect(dbfsToApproxDb(Number.NaN)).toBe(DB_FLOOR);
    expect(dbfsToApproxDb(Number.POSITIVE_INFINITY)).toBe(DB_FLOOR);
    expect(dbfsToApproxDb(Number.NEGATIVE_INFINITY)).toBe(DB_FLOOR);
  });
});

describe('sonometer · conversión potencia ↔ dBFS', () => {
  it('0 dBFS = potencia 1', () => {
    expect(powerFromDbfs(0)).toBeCloseTo(1, 10);
    expect(dbfsFromPower(1)).toBeCloseTo(0, 10);
  });

  it('round-trip dBFS → potencia → dBFS', () => {
    for (const dbfs of [-160, -90, -55, -37, -10, 0]) {
      expect(dbfsFromPower(powerFromDbfs(dbfs))).toBeCloseTo(dbfs, 9);
    }
  });

  it('la potencia siempre es positiva para dBFS finito', () => {
    for (const dbfs of [-160, -100, -40, 0]) {
      expect(powerFromDbfs(dbfs)).toBeGreaterThan(0);
    }
  });
});

describe('sonometer · Leq (estabilidad del valor que se adjunta)', () => {
  it('silencio total / sin muestras → piso', () => {
    expect(dbfsToApproxDb(leqDbfs({ sumPower: 0, count: 0 }))).toBe(DB_FLOOR);
  });

  it('ruido constante: el Leq sigue el nivel real', () => {
    const quiet = dbfsToApproxDb(leqDbfs(accumulate(Array(50).fill(-40))));
    const loud = dbfsToApproxDb(leqDbfs(accumulate(Array(50).fill(-20))));
    expect(quiet).toBe(40);
    expect(loud).toBe(60);
  });

  it('UN transitorio (clic de tecla) NO domina el Leq — bug reportado', () => {
    // 49 muestras de silencio relativo (-40) + 1 pico de tecla (-20).
    const samples = [...Array(49).fill(-40), -20];
    const leqMapped = dbfsToApproxDb(leqDbfs(accumulate(samples)));
    const peakMapped = dbfsToApproxDb(-20); // lo que mostraría el "Pico"

    // El promedio queda cerca del piso (≈45), MUY por debajo del pico (60).
    expect(leqMapped).toBeLessThanOrEqual(46);
    expect(peakMapped - leqMapped).toBeGreaterThanOrEqual(12);
  });
});

describe('sonometer · EMA del número en vivo', () => {
  it('la primera muestra inicializa la EMA', () => {
    const p = powerFromDbfs(-40);
    expect(nextEmaPower(null, p)).toBe(p);
  });

  it('un pico mueve el número en vivo pero NO llega al pico instantáneo', () => {
    const baseline = powerFromDbfs(-40);
    const spiked = nextEmaPower(baseline, powerFromDbfs(-20));
    const liveMapped = dbfsToApproxDb(dbfsFromPower(spiked));

    expect(liveMapped).toBeGreaterThan(40); // reacciona
    expect(liveMapped).toBeLessThan(dbfsToApproxDb(-20)); // pero no salta al pico (60)
  });
});
