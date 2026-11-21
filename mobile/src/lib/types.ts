export type Role = 'COORDINATOR' | 'SUPERVISOR' | 'COUNTER';
export type AssignmentStatus = 'PENDING' | 'IN_PROGRESS' | 'DONE';
export type LineStatus = 'PENDING' | 'RECOUNT' | 'OK' | 'DIFF';

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

export interface Campaign {
  id: number;
  name: string;
  status: 'DRAFT' | 'ACTIVE' | 'CLOSED';
  startedAt: string | null;
  closedAt?: string | null;
  createdAt?: string;
}

export interface ReportLine {
  zone: { id: number; code: string; name: string };
  area: { id: number; name: string };
  item: { id: number; sku: string; description: string; unit: string; unitCost: number };
  expected: number;
  firstCount: number | null;
  recountCount: number | null;
  finalQty: number | null;
  diff: number | null;
  value: number | null;
  recountRequested: boolean;
  status: LineStatus;
}

export interface Summary {
  totalItems: number;
  countedItems: number;
  progress: number;
  discrepancies: number;
  recountsPending: number;
  accuracy: number | null;
  discrepancyValue: number;
  netValue: number;
}

export interface DashboardData {
  campaign: Campaign;
  summary: Summary;
  byArea: { id: number; name: string; totalItems: number; countedItems: number; progress: number }[];
  lateZones: {
    zoneId: number;
    code: string;
    name: string;
    area: string;
    totalItems: number;
    countedItems: number;
    progress: number;
    counter: string | null;
  }[];
  topDiscrepancies: ReportLine[];
}

export interface MyAssignment {
  id: number;
  status: AssignmentStatus;
  campaign: { id: number; name: string };
  zone: { id: number; code: string; name: string };
  area: { id: number; name: string };
  totalItems: number;
  countedItems: number;
}

export interface AssignmentItem {
  item: {
    id: number;
    sku: string;
    barcode: string;
    description: string;
    unit: string;
    boxSize: number | null;
  };
  round: number;
  needsRecount: boolean;
  countedQuantity: number | null;
}

export interface AssignmentDetail {
  id: number;
  status: AssignmentStatus;
  campaign: { id: number; name: string };
  zone: { id: number; code: string; name: string };
  area: { id: number; name: string };
  items: AssignmentItem[];
}