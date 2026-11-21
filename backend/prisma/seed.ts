import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Role } from '../src/generated/prisma/client.js';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const PLANT = [
  {
    code: 'INS',
    name: 'Insight',
    zones: [
      { code: 'A1', name: 'Componentes eléctricos' },
      { code: 'A3', name: 'Tornillería y sujetadores' },
      { code: 'A5', name: 'Láminas y perfiles' },
    ],
  },
  {
    code: 'RCH',
    name: 'Reach-in',
    zones: [
      { code: 'B1', name: 'Puertas y vidrios' },
      { code: 'B4', name: 'Empaques y sellos' },
    ],
  },
  {
    code: 'ALM',
    name: 'Almacén general',
    zones: [
      { code: 'C1', name: 'Refacciones' },
      { code: 'C2', name: 'Material de empaque' },
    ],
  },
];

const ITEMS = [
  { sku: 'TOR-M6-20', description: 'Tornillo hexagonal M6 × 20', unit: 'pieza', boxSize: 100, unitCost: 1.2 },
  { sku: 'TOR-M8-25', description: 'Tornillo hexagonal M8 × 25', unit: 'pieza', boxSize: 100, unitCost: 1.85 },
  { sku: 'TUE-M6', description: 'Tuerca hexagonal M6', unit: 'pieza', boxSize: 200, unitCost: 0.45 },
  { sku: 'RON-M6', description: 'Rondana plana M6', unit: 'pieza', boxSize: 500, unitCost: 0.2 },
  { sku: 'REM-AL-532', description: 'Remache de aluminio 5/32', unit: 'pieza', boxSize: 250, unitCost: 0.35 },
  { sku: 'CAB-14AWG', description: 'Cable calibre 14 AWG', unit: 'metro', boxSize: null, unitCost: 9.5 },
  { sku: 'TER-ANI-14', description: 'Terminal de anillo cal. 14', unit: 'pieza', boxSize: 100, unitCost: 1.1 },
  { sku: 'LAM-GALV-22', description: 'Lámina galvanizada cal. 22', unit: 'hoja', boxSize: null, unitCost: 420 },
  { sku: 'PER-AL-1', description: 'Perfil de aluminio 1"', unit: 'tramo', boxSize: null, unitCost: 185 },
  { sku: 'EMP-MAG-PU', description: 'Empaque magnético de puerta', unit: 'pieza', boxSize: null, unitCost: 240 },
  { sku: 'VID-TEMP-24', description: 'Vidrio templado 24"', unit: 'pieza', boxSize: null, unitCost: 1350 },
  { sku: 'SIL-TRANS-300', description: 'Silicón transparente 300 ml', unit: 'cartucho', boxSize: 24, unitCost: 68 },
];

async function main() {
  // Áreas y zonas
  for (const a of PLANT) {
    const area = await prisma.area.upsert({
      where: { code: a.code },
      update: {},
      create: { code: a.code, name: a.name },
    });
    for (const z of a.zones) {
      await prisma.zone.upsert({
        where: { areaId_code: { areaId: area.id, code: z.code } },
        update: {},
        create: { ...z, areaId: area.id },
      });
    }
  }

  // Catálogo (códigos de barras inventados de 13 dígitos)
  for (const [i, item] of ITEMS.entries()) {
    const barcode = `750100000${String(i + 1).padStart(4, '0')}`;
    await prisma.item.upsert({
      where: { sku: item.sku },
      update: {},
      create: { ...item, barcode },
    });
  }

  // Usuarios
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

  console.log('✅ Seed listo: 3 áreas, 7 zonas, 12 artículos y 3 usuarios');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());