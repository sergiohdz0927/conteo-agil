import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  AssignmentStatus,
  CampaignStatus,
  PrismaClient,
  Role,
} from '../src/generated/prisma/client.js';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

type ZoneSeed = {
  code: string;
  name: string;
  counter: string; // número de empleado del contador asignado
  stock: [string, number][]; // [sku, existencia del sistema]
};

const PLANT: { code: string; name: string; zones: ZoneSeed[] }[] = [
  {
    code: 'INS',
    name: 'Insight',
    zones: [
      { code: 'A1', name: 'Componentes eléctricos', counter: '3000', stock: [['CAB-14AWG', 350], ['TER-ANI-14', 1200]] },
      { code: 'A3', name: 'Tornillería y sujetadores', counter: '3000', stock: [['TOR-M6-20', 2400], ['TOR-M8-25', 1800], ['TUE-M6', 3000], ['RON-M6', 5000], ['REM-AL-532', 2750]] },
      { code: 'A5', name: 'Láminas y perfiles', counter: '3000', stock: [['LAM-GALV-22', 85], ['PER-AL-1', 140]] },
    ],
  },
  {
    code: 'RCH',
    name: 'Reach-in',
    zones: [
      { code: 'B1', name: 'Puertas y vidrios', counter: '3001', stock: [['VID-TEMP-24', 36]] },
      { code: 'B4', name: 'Empaques y sellos', counter: '3001', stock: [['EMP-MAG-PU', 120], ['SIL-TRANS-300', 96]] },
    ],
  },
  {
    code: 'ALM',
    name: 'Almacén general',
    zones: [
      { code: 'C1', name: 'Refacciones', counter: '3002', stock: [['TOR-M6-20', 600], ['TUE-M6', 800]] },
      { code: 'C2', name: 'Material de empaque', counter: '3002', stock: [['SIL-TRANS-300', 48]] },
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

const USERS = [
  { employeeNumber: '1000', name: 'Coordinador Demo', role: Role.COORDINATOR, area: null },
  { employeeNumber: '2000', name: 'Supervisor Insight', role: Role.SUPERVISOR, area: 'INS' },
  { employeeNumber: '2001', name: 'Supervisor Reach-in', role: Role.SUPERVISOR, area: 'RCH' },
  { employeeNumber: '3000', name: 'Contador Demo', role: Role.COUNTER, area: 'INS' },
  { employeeNumber: '3001', name: 'Contador Reach-in', role: Role.COUNTER, area: 'RCH' },
  { employeeNumber: '3002', name: 'Contador Almacén', role: Role.COUNTER, area: 'ALM' },
];

async function main() {
  // 1. Áreas y zonas
  const areaIds = new Map<string, number>();
  const zoneIds = new Map<string, number>(); // "INS-A1" -> id
  for (const a of PLANT) {
    const area = await prisma.area.upsert({
      where: { code: a.code },
      update: {},
      create: { code: a.code, name: a.name },
    });
    areaIds.set(a.code, area.id);
    for (const z of a.zones) {
      const zone = await prisma.zone.upsert({
        where: { areaId_code: { areaId: area.id, code: z.code } },
        update: {},
        create: { code: z.code, name: z.name, areaId: area.id },
      });
      zoneIds.set(`${a.code}-${z.code}`, zone.id);
    }
  }

  // 2. Catálogo (códigos de barras inventados de 13 dígitos)
  const itemIds = new Map<string, number>();
  for (const [i, item] of ITEMS.entries()) {
    const barcode = `750100000${String(i + 1).padStart(4, '0')}`;
    const saved = await prisma.item.upsert({
      where: { sku: item.sku },
      update: {},
      create: { ...item, barcode },
    });
    itemIds.set(item.sku, saved.id);
  }

  // 3. Usuarios
  const passwordHash = await bcrypt.hash('conteo123', 10);
  const userIds = new Map<string, number>();
  for (const u of USERS) {
    const areaId = u.area ? areaIds.get(u.area)! : null;
    const user = await prisma.user.upsert({
      where: { employeeNumber: u.employeeNumber },
      update: { areaId },
      create: {
        employeeNumber: u.employeeNumber,
        name: u.name,
        role: u.role,
        areaId,
        passwordHash,
      },
    });
    userIds.set(u.employeeNumber, user.id);
  }

  // 4. Campaña activa con existencias del sistema y asignaciones
  const name = 'Inventario Nov 2026';
  const campaign =
    (await prisma.campaign.findFirst({ where: { name } })) ??
    (await prisma.campaign.create({
      data: { name, status: CampaignStatus.ACTIVE, startedAt: new Date() },
    }));

  for (const a of PLANT) {
    for (const z of a.zones) {
      const zoneId = zoneIds.get(`${a.code}-${z.code}`)!;
      for (const [sku, quantity] of z.stock) {
        const itemId = itemIds.get(sku)!;
        await prisma.expectedStock.upsert({
          where: { campaignId_zoneId_itemId: { campaignId: campaign.id, zoneId, itemId } },
          update: {},
          create: { campaignId: campaign.id, zoneId, itemId, quantity },
        });
      }
      await prisma.zoneAssignment.upsert({
        where: { campaignId_zoneId: { campaignId: campaign.id, zoneId } },
        update: {},
        create: {
          campaignId: campaign.id,
          zoneId,
          counterId: userIds.get(z.counter)!,
        },
      });
    }
  }

    // 5. Conteos de demostración: Reach-in y Almacén ya contaron.
  //    Insight se deja vacío para contarlo en vivo con la app.
  const DEMO: { zone: string; counter: string; counts: [string, number][] }[] = [
    { zone: 'RCH-B1', counter: '3001', counts: [['VID-TEMP-24', 34]] },
    { zone: 'RCH-B4', counter: '3001', counts: [['EMP-MAG-PU', 120], ['SIL-TRANS-300', 90]] },
    { zone: 'ALM-C1', counter: '3002', counts: [['TOR-M6-20', 600], ['TUE-M6', 830]] },
  ];
  for (const d of DEMO) {
    const zoneId = zoneIds.get(d.zone)!;
    const counterId = userIds.get(d.counter)!;
    for (const [sku, quantity] of d.counts) {
      const itemId = itemIds.get(sku)!;
      await prisma.count.upsert({
        where: {
          campaignId_zoneId_itemId_round: { campaignId: campaign.id, zoneId, itemId, round: 1 },
        },
        update: {},
        create: { campaignId: campaign.id, zoneId, itemId, counterId, quantity, round: 1 },
      });
    }
    await prisma.zoneAssignment.update({
      where: { campaignId_zoneId: { campaignId: campaign.id, zoneId } },
      data: { status: AssignmentStatus.DONE, startedAt: new Date(), finishedAt: new Date() },
    });
  }
  console.log('✅ Seed listo: 3 áreas, 7 zonas, 12 artículos, 6 usuarios y 1 campaña activa');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect()); 