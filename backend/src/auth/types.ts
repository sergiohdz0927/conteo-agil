import type { Role } from '../generated/prisma/client.js';

export interface JwtPayload {
  sub: number;
  role: Role;
  name: string;
  areaId: number | null;
}