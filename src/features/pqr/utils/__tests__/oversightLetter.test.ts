import type { PQRS } from '@core/types';
import {
  buildOversightLetterInput,
  describeDraftFailure,
  formatPlaceName,
} from '../oversightLetter';

function makePqr(overrides: Partial<PQRS> = {}): PQRS {
  return {
    id: 'pqr-1',
    type: 'COMPLAINT',
    status: 'PENDING',
    dueDate: new Date('2026-02-15T00:00:00Z'),
    anonymous: false,
    private: false,
    description: 'Llevo tres semanas sin agua.',
    entityId: 'ent-1',
    createdAt: new Date('2026-01-15T15:30:00Z'),
    updatedAt: new Date('2026-01-15T15:30:00Z'),
    isOverdue: true,
    businessDaysOverdue: 20,
    entity: { id: 'ent-1', name: 'Alcaldía de Santa Marta' },
    department: null,
    creator: { id: 'u1', name: 'Ana Ruiz' },
    attachments: [],
    comments: [],
    likes: [],
    customFieldValues: [],
    ...overrides,
  };
}

const location = { departmentName: 'MAGDALENA', cityName: 'SANTA MARTA' };

describe('buildOversightLetterInput', () => {
  it('manda los mismos datos que la web', () => {
    expect(buildOversightLetterInput(makePqr(), 'Personería de Santa Marta', location)).toEqual({
      fullName: 'Ana Ruiz',
      oversightEntity: 'Personería de Santa Marta',
      entity: 'Alcaldía de Santa Marta',
      pqrType: 'Queja',
      pqrDate: '2026-01-15',
      daysExceeded: 20,
      pqrDescription: 'Llevo tres semanas sin agua.',
      department: 'Magdalena',
      city: 'Santa Marta',
    });
  });

  it('los días son los del servidor, no un cálculo desde la radicación', () => {
    const input = buildOversightLetterInput(makePqr({ businessDaysOverdue: 3 }), 'X', location);
    expect(input.daysExceeded).toBe(3);
  });

  it('el tipo va en español', () => {
    expect(buildOversightLetterInput(makePqr({ type: 'PETITION' }), 'X', location).pqrType).toBe(
      'Petición',
    );
    expect(buildOversightLetterInput(makePqr({ type: 'REPORT' }), 'X', location).pqrType).toBe(
      'Denuncia',
    );
  });

  it('sin autor va «Anónimo»', () => {
    expect(buildOversightLetterInput(makePqr({ creator: null }), 'X', location).fullName).toBe(
      'Anónimo',
    );
    expect(
      buildOversightLetterInput(makePqr({ creator: { id: 'u1', name: '  ' } }), 'X', location)
        .fullName,
    ).toBe('Anónimo');
  });

  it('una PQRSD anónima de la que llega el autor va con su nombre', () => {
    // El servidor le manda el autor a su autor también en una anónima, y la
    // dirección decidió que el oficio va con los datos.
    expect(
      buildOversightLetterInput(makePqr({ anonymous: true }), 'X', location).fullName,
    ).toBe('Ana Ruiz');
  });

  it('sin departamento ni municipio, como la web', () => {
    const input = buildOversightLetterInput(makePqr({ description: undefined }), 'X', {
      departmentName: null,
      cityName: null,
    });
    // La web pasa también este valor por `formatText`, que lo capitaliza.
    expect(input.department).toBe('No Especificado');
    expect(input.city).toBe('');
    expect(input.pqrDescription).toBe('');
  });
});

describe('formatPlaceName', () => {
  it('pone en tipo título y deja las partículas en minúscula', () => {
    expect(formatPlaceName('NORTE DE SANTANDER')).toBe('Norte de Santander');
    expect(formatPlaceName('san andrés y providencia')).toBe('San Andrés y Providencia');
    expect(formatPlaceName('EL CARMEN DE BOLÍVAR')).toBe('El Carmen de Bolívar');
    expect(formatPlaceName('')).toBe('');
  });
});

describe('describeDraftFailure', () => {
  it('un 429 lo dice con su texto y con el plazo si llega', () => {
    expect(
      describeDraftFailure({ response: { status: 429, headers: { 'retry-after': '420' } } }),
    ).toEqual({
      title: 'Espera antes de volver a intentarlo',
      message:
        'Hay un límite de documentos que puedes redactar en poco tiempo y ya lo alcanzaste. ' +
        'Podrás volver a intentarlo en 7 minutos. No redactamos nada en este intento.',
    });
  });

  it('un 429 sin plazo dice «en unos minutos»', () => {
    expect(describeDraftFailure({ response: { status: 429 } }).message).toMatch(
      /Podrás volver a intentarlo en unos minutos\./,
    );
  });

  it('cualquier otro fallo es genérico', () => {
    expect(describeDraftFailure(new Error('timeout'))).toEqual({
      title: 'No se pudo redactar',
      message: 'Ocurrió un error redactando el oficio. Intenta de nuevo en unos segundos.',
    });
  });
});
