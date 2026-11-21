import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Role } from '../src/generated/prisma/client.js';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

async function main() {
  const areas = [
    { code: 'INS', name: 'Insight' },
    { code: 'RCH', name: 'Reach-in' },
    { code: 'ALM', name: 'Almacén general' },
  ];
  for (const a of areas) {
    await prisma.area.upsert({ where: { code: a.code }, update: {}, create: a });
  }
  const insight = await prisma.area.findUniqueOrThrow({ where: { code: 'INS' } });

  const passwordHash = await bcrypt.hash('conteo123', 10);
  const users = [
    { employeeNumber: '1000', name: 'Coordinador Demo', role: Role.COORDINATOR, areaId: null },
    { employeeNumber: '2000', name: 'Supervisor Insight', role: Role.SUPERVISOR, areaId: insight.id },
    { employeeNumber: '3000', name: 'Contador Demo', role: Role.COUNTER, areaId: insight.id },
  ];
  for (const u of users) {
    await prisma.user.upsert({
      where: { employeeNumber: u.employeeNumber },
      update: {},
      create: { ...u, passwordHash },
    });
  }

  console.log('✅ Seed listo: 3 áreas y 3 usuarios (contraseña: conteo123)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());