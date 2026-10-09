import { normalizeSearchText, searchWall, toSearchable, wallSearchText } from '../wallSearch';
import type { PQRS } from '@core/types';

const base: PQRS = {
  id: 'pqr-1',
  type: 'COMPLAINT',
  status: 'PENDING',
  dueDate: new Date('2026-11-01T00:00:00Z'),
  anonymous: false,
  private: false,
  subject: 'Basúra acumulada en la esquina',
  description: 'Llevan DOS semanas sin pasar a recogerla.',
  entityId: 'entity-1',
  createdAt: new Date('2026-10-01T00:00:00Z'),
  updatedAt: new Date('2026-10-01T00:00:00Z'),
  entity: { id: 'entity-1', name: 'Alcaldía de Santa Marta' },
  department: null,
  creator: { id: 'user-1', name: 'Zoraida Pertuz' },
  attachments: [],
  comments: [],
  likes: [],
  customFieldValues: [],
};

describe('normalizeSearchText', () => {
  it('quita las tildes y las mayúsculas', () => {
    expect(normalizeSearchText('Basúra')).toBe('basura');
    expect(normalizeSearchText('BASURA')).toBe('basura');
    expect(normalizeSearchText('ÁÉÍÓÚ áéíóú')).toBe('aeiou aeiou');
  });

  it('quita también la diéresis, y deja la ñ, que es otra letra', () => {
    expect(normalizeSearchText('Señalización del desagüe')).toBe('señalizacion del desague');
  });

  it('deja la ñ venga como venga: de una pieza, como «n» más su virgulilla o en mayúscula', () => {
    for (const written of ['a\u00f1o', 'an\u0303o', 'A\u00d1O', 'AN\u0303O']) {
      const normalized = normalizeSearchText(written);
      expect(normalized).toBe('año');
      // De una pieza: la «n» y su virgulilla no quedan sueltas.
      expect(normalized).toHaveLength(3);
    }
  });

  it('la virgulilla sobre otra letra cae como cualquier tilde', () => {
    expect(normalizeSearchText('São João')).toBe('sao joao');
  });

  it('da lo mismo con la tilde en una sola letra o suelta detrás de ella', () => {
    // «ú» puede llegar como un carácter o como «u» más la marca.
    expect(normalizeSearchText('bas\u00fara')).toBe('basura');
    expect(normalizeSearchText('basu\u0301ra')).toBe('basura');
  });

  it('recoge los espacios de los lados y los de en medio', () => {
    expect(normalizeSearchText('  alumbrado   público \n')).toBe('alumbrado publico');
    // El que deja el teclado al aceptar una sugerencia.
    expect(normalizeSearchText('basura ')).toBe('basura');
  });

  it('un texto de solo espacios queda vacío', () => {
    expect(normalizeSearchText('   ')).toBe('');
    expect(normalizeSearchText('')).toBe('');
  });
});

describe('wallSearchText', () => {
  it('reúne el asunto, la descripción y el nombre de la entidad', () => {
    const text = wallSearchText(base);

    expect(text).toContain('basura acumulada en la esquina');
    expect(text).toContain('llevan dos semanas sin pasar a recogerla.');
    expect(text).toContain('alcaldia de santa marta');
  });

  it('no incluye nada de quien radicó', () => {
    const text = wallSearchText({
      ...base,
      // Una anónima tal como le llega a su propio autor: con `creator` puesto.
      anonymous: true,
      creatorId: 'user-1',
      guestName: 'Zoraida Pertuz',
      guestEmail: 'zoraida@example.com',
      guestPhone: '3001234567',
    });

    expect(text).not.toContain('zoraida');
    expect(text).not.toContain('pertuz');
    expect(text).not.toContain('example.com');
    expect(text).not.toContain('3001234567');
    expect(text).not.toContain('user-1');
  });

  it('ni ningún otro campo de la PQRSD', () => {
    const text = wallSearchText({
      ...base,
      consecutiveCode: 'RAD-2026-0042',
      department: {
        id: 'area-1',
        name: 'Oficina de Atención',
        email: 'atencion@example.com',
        entityId: 'entity-1',
      },
      customFieldValues: [{ name: 'Cédula', value: '1082000111' }],
    });

    expect(text).not.toContain('rad-2026');
    expect(text).not.toContain('oficina');
    expect(text).not.toContain('1082000111');
  });

  it('aguanta una PQRSD a la que le faltan campos', () => {
    const bare = {
      ...base,
      subject: undefined,
      description: undefined,
      entity: undefined,
    } as unknown as PQRS;

    expect(wallSearchText(bare).trim()).toBe('');
    expect(wallSearchText({ ...base, description: undefined })).toContain('basura acumulada');
  });

  it('no deja casar a caballo entre dos campos', () => {
    const text = wallSearchText({
      ...base,
      subject: 'Fuga de agua',
      description: 'Potable no llega desde el lunes',
    });

    expect(text).toContain('fuga de agua');
    expect(text).toContain('potable no llega');
    expect(text).not.toContain(normalizeSearchText('agua potable'));
  });
});

/** Los asuntos que encuentra `typed` entre PQRSD con esos asuntos y nada más. */
function found(typed: string, ...subjects: string[]): string[] {
  const rows = subjects.map((subject, i) =>
    toSearchable({
      ...base,
      id: `pqr-${i}`,
      subject,
      description: undefined,
      entity: { id: 'entity-1', name: 'Entidad' },
    }),
  );
  return searchWall(rows, normalizeSearchText(typed)).map((p) => p.subject ?? '');
}

describe('searchWall', () => {
  it('con ñ en lo escrito, la ñ tiene que estar', () => {
    expect(found('daño', 'Queja de un ciudadano', 'Daño en la vía')).toEqual(['Daño en la vía']);
    expect(found('año', 'Aseo urbano', 'Lleva un año así')).toEqual(['Lleva un año así']);
    expect(found('leña', 'Santa Marta, Magdalena', 'Quema de leña')).toEqual(['Quema de leña']);
  });

  it('sin ñ en lo escrito, la «n» vale por «n» y por «ñ»', () => {
    expect(found('senal', 'Señal caída', 'Senal sin tilde')).toEqual([
      'Señal caída',
      'Senal sin tilde',
    ]);
    expect(found('dano', 'Daño en la vía', 'Queja de un ciudadano')).toEqual([
      'Daño en la vía',
      'Queja de un ciudadano',
    ]);
    expect(found('ano', 'Aseo urbano', 'Lleva un año así')).toEqual([
      'Aseo urbano',
      'Lleva un año así',
    ]);
  });

  it('la ñ del texto vale de una pieza, como «n» más su virgulilla y en mayúscula', () => {
    const subjects = [
      'Da\u00f1o uno',
      'Dan\u0303o dos',
      'DA\u00d1O TRES',
      'DAN\u0303O CUATRO',
    ];

    expect(found('daño', ...subjects)).toEqual(subjects);
  });

  it('y la de lo escrito también', () => {
    for (const typed of ['da\u00f1o', 'dan\u0303o', 'DA\u00d1O', 'DAN\u0303O']) {
      expect(found(typed, 'Queja de un ciudadano', 'Daño en la vía')).toEqual(['Daño en la vía']);
    }
  });

  it('una coincidencia sin ñ no tapa la que sí la lleva', () => {
    // «ciudadano» casa sin la ñ y se descarta; el «daño» de después es el bueno.
    expect(found('daño', 'El ciudadano reporta un daño')).toHaveLength(1);
    expect(found('año', 'Aseo urbano desde hace un año')).toHaveLength(1);
    expect(found('daño', 'El ciudadano y el aseo urbano')).toEqual([]);
  });

  it('con ñ y «n» en lo mismo escrito, la «n» sigue valiendo por las dos', () => {
    // Quien escribió la ñ de «daño» y no la de «señalización».
    expect(found('daño en la senalizacion', 'Daño en la señalización')).toHaveLength(1);
    expect(found('niño', 'Parque para niños', 'Deporte femenino')).toEqual(['Parque para niños']);
  });

  it('tildes, diéresis, mayúsculas y espacios siguen dando igual en los dos sentidos', () => {
    expect(found('basura', 'Basúra acumulada', 'BASURA sin recoger')).toHaveLength(2);
    expect(found('BASÚRA', 'basura acumulada')).toHaveLength(1);
    expect(found('desague', 'Desagüe tapado')).toHaveLength(1);
    expect(found('DESAGÜE', 'desague tapado')).toHaveLength(1);
    expect(found('  alumbrado   publico ', 'Alumbrado  público dañado')).toHaveLength(1);
    // También con una ñ de por medio.
    expect(found('SEÑALIZACIÓN', 'señalizacion borrada')).toHaveLength(1);
    expect(found('señalizacion', 'Señalización borrada')).toHaveLength(1);
  });

  it('devuelve las PQRSD enteras, en el orden en que venían', () => {
    const pqrs = ['Daño uno', 'Otra cosa', 'Daño dos'].map((subject, i) => ({
      ...base,
      id: `pqr-${i}`,
      subject,
      description: undefined,
    }));

    const results = searchWall(
      pqrs.map((pqr) => toSearchable(pqr)),
      'dano',
    );

    expect(results).toHaveLength(2);
    expect(results[0]).toBe(pqrs[0]);
    expect(results[1]).toBe(pqrs[2]);
  });

  it('los dos textos de una PQRSD casan letra por letra', () => {
    const row = toSearchable({ ...base, subject: 'Año de la SEÑAL', description: undefined });

    expect(row.text.split('\n')[0]).toBe('año de la señal');
    expect(row.plain.split('\n')[0]).toBe('ano de la senal');
    expect(row.plain).toHaveLength(row.text.length);
  });
});
