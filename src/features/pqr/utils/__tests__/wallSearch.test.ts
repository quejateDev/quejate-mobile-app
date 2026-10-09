import { normalizeSearchText, wallSearchText } from '../wallSearch';
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

  it('quita también la diéresis y la virgulilla', () => {
    expect(normalizeSearchText('Señalización del desagüe')).toBe('senalizacion del desague');
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
