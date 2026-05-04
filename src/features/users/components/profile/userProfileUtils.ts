export function getInitials(name: string | null | undefined): string {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export const ROLE_LABEL: Record<string, string> = {
  CLIENT: 'Ciudadano',
  ADMIN: 'Administrador',
  SUPER_ADMIN: 'Super Admin',
  EMPLOYEE: 'Empleado',
  LAWYER: 'Abogado',
};
