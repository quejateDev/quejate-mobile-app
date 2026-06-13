import type { PQRS, PQRSStatus, PQRSType } from '@core/types';

export interface Holiday {
  date: string; // YYYY-MM-DD
  name?: string;
}

// Lista estática de festivos colombianos. Copia exacta de constants/holidays.ts
// del backend (2026-05-21) — backend solo tiene 2025 hoy, 2026+ es deuda compartida.
// Para PQRSDs creadas en 2026 el conteo será impreciso por los ~18 festivos de 2026
// que ni backend ni móvil tienen. Cuando backend extienda, sincronizar este archivo.
export const COLOMBIA_HOLIDAYS: Holiday[] = [
  { date: '2025-01-01', name: 'Año Nuevo' },
  { date: '2025-01-06', name: 'Día de los Reyes Magos' },
  { date: '2025-03-24', name: 'San José' },
  { date: '2025-04-13', name: 'Domingo de Ramos' },
  { date: '2025-04-17', name: 'Jueves Santo' },
  { date: '2025-04-18', name: 'Viernes Santo' },
  { date: '2025-04-20', name: 'Pascua' },
  { date: '2025-05-01', name: 'Día del trabajador' },
  { date: '2025-06-02', name: 'La Asunción' },
  { date: '2025-06-23', name: 'Corpus Christi' },
  { date: '2025-06-30', name: 'Sagrado Corazón de Jesús' },
  { date: '2025-06-30', name: 'San Pedro y San Pablo' },
  { date: '2025-07-20', name: 'Día de la Independencia' },
  { date: '2025-08-07', name: 'Batalla de Boyacá' },
  { date: '2025-08-18', name: 'Asunción' },
  { date: '2025-10-13', name: 'Día de la Raza' },
  { date: '2025-11-03', name: 'Todos los Santos' },
  { date: '2025-11-17', name: 'Independencia de Cartagena' },
  { date: '2025-12-08', name: 'La inmaculada concepción' },
  { date: '2025-12-25', name: 'Navidad' },
];

/**
 * Algoritmo exacto provisto por backend. Cuenta días hábiles (lun-vie sin festivos)
 * entre dueDate+1 y hoy. Si dueDate aún no pasó, devuelve 0.
 *
 * Usar SIEMPRE dueDate, NUNCA createdAt (la web tiene ese bug en el generador de tutela).
 */
export function calculateBusinessDaysExceeded(
  dueDate: Date | string,
  holidays: Holiday[] = COLOMBIA_HOLIDAYS,
): number {
  const due = new Date(dueDate);
  const now = new Date();
  due.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);

  let n = 0;
  const t = new Date(due);
  t.setDate(t.getDate() + 1);

  const holidayISO = new Set(holidays.map((h) => new Date(h.date).toISOString().slice(0, 10)));

  while (t <= now) {
    const d = t.getDay();
    const isWeekday = d !== 0 && d !== 6;
    const iso = t.toISOString().slice(0, 10);
    if (isWeekday && !holidayISO.has(iso)) n++;
    t.setDate(t.getDate() + 1);
  }
  return n;
}

const FINAL_STATUSES: ReadonlySet<PQRSStatus> = new Set(['RESOLVED', 'CLOSED']);
const NO_DEADLINE_TYPES: ReadonlySet<PQRSType> = new Set(['SUGGESTION']);

/**
 * Réplica de la regla web: los plazos legales solo aplican a PQRSDs activas
 * (no RESOLVED/CLOSED) y con plazo (no SUGGESTION). Cualquier indicador de
 * vencimiento ("Vencida", "Vence en Xd", modal de vencida) debe pasar por acá.
 */
export function deadlineApplies(pqr: Pick<PQRS, 'status' | 'type'>): boolean {
  return !FINAL_STATUSES.has(pqr.status) && !NO_DEADLINE_TYPES.has(pqr.type);
}

/**
 * Días calendario hasta el dueDate (negativo si ya pasó). NaN cuando el plazo
 * no aplica (estado final / sugerencia / sin dueDate).
 */
export function dueDaysLeft(pqr: Pick<PQRS, 'dueDate' | 'status' | 'type'>): number {
  if (!deadlineApplies(pqr) || !pqr.dueDate) return Number.NaN;
  const dueTime = new Date(pqr.dueDate).getTime();
  if (!Number.isFinite(dueTime)) return Number.NaN;
  return Math.ceil((dueTime - Date.now()) / 86400000);
}

/**
 * Réplica de la lógica web: la PQRSD se considera vencida si dueDate ya pasó,
 * el status no es RESOLVED/CLOSED y el tipo no es SUGGESTION.
 */
export function isPQROverdue(pqr: Pick<PQRS, 'dueDate' | 'status' | 'type'>): boolean {
  if (!pqr.dueDate || !deadlineApplies(pqr)) return false;
  return new Date(pqr.dueDate) < new Date();
}

type OverduePQR = Pick<
  PQRS,
  'dueDate' | 'status' | 'type' | 'isOverdue' | 'businessDaysOverdue'
>;

/**
 * Fuente de verdad para el vencimiento. Prefiere los campos calculados por el backend
 * (`isOverdue`/`businessDaysOverdue`, que coinciden con la notificación pqrsd_time_expired)
 * y cae al cálculo local solo si el backend no los envió (rollout parcial / data cacheada).
 */
export function resolveOverdue(pqr: OverduePQR): {
  isOverdue: boolean;
  businessDaysExceeded: number;
} {
  // Clamp por estado: una PQRSD resuelta/cerrada (o una sugerencia) nunca está
  // vencida, aunque el backend mande isOverdue=true o el dueDate ya haya pasado
  // (visto en datos reales: "Resuelto" + "Vence en 1d" en el muro).
  if (!deadlineApplies(pqr)) return { isOverdue: false, businessDaysExceeded: 0 };
  const isOverdue = pqr.isOverdue ?? isPQROverdue(pqr);
  const businessDaysExceeded =
    pqr.businessDaysOverdue ??
    (pqr.dueDate ? calculateBusinessDaysExceeded(pqr.dueDate) : 0);
  return { isOverdue, businessDaysExceeded };
}
