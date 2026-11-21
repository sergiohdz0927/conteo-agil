export type Role = 'COORDINATOR' | 'SUPERVISOR' | 'COUNTER';

export interface User {
  id: number;
  employeeNumber: string;
  name: string;
  role: Role;
  area: { id: number; name: string } | null;
}

export const ROLE_LABEL: Record<Role, string> = {
  COORDINATOR: 'Coordinador',
  SUPERVISOR: 'Supervisor de área',
  COUNTER: 'Contador',
};