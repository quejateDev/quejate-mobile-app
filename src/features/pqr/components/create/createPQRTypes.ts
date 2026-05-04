import { z } from 'zod';
import type { PQRSType } from '@core/types';

export const schema = z.object({
  entityId: z.string().min(1, 'Selecciona una entidad'),
  entityDepartmentId: z.string().optional(),
  type: z.enum(
    ['PETITION', 'COMPLAINT', 'CLAIM', 'SUGGESTION', 'REPORT'],
    { error: 'Selecciona un tipo de PQRSD' },
  ),
  subject: z.string().optional(),
  description: z.string().optional(),
  isAnonymous: z.boolean(),
  isPrivate: z.boolean(),
});

export type FormData = z.infer<typeof schema>;

export interface NamedItem {
  id: string;
  name: string;
}

export const PQRS_TYPES: PQRSType[] = [
  'PETITION',
  'COMPLAINT',
  'CLAIM',
  'SUGGESTION',
  'REPORT',
];
