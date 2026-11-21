import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { JwtPayload } from '../auth/types.js';
import {
  AssignmentStatus,
  CampaignStatus,
} from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateCountDto } from './dto/create-count.dto.js';

@Injectable()
export class CountsService {
  constructor(private readonly prisma: PrismaService) {}

  // Solo puedes ver tus propias asignaciones (si no es tuya: 404)
  private async getMyAssignment(id: number, user: JwtPayload) {
    const assignment = await this.prisma.zoneAssignment.findUnique({
      where: { id },
      include: {
        campaign: true,
        zone: { include: { area: { select: { id: true, name: true } } } },
      },
    });
    if (!assignment || assignment.counterId !== user.sub) {
      throw new NotFoundException('Asignación no encontrada');
    }
    return assignment;
  }

  // "Mis zonas": las de la campaña activa, con su avance
  async findMine(user: JwtPayload) {
    const assignments = await this.prisma.zoneAssignment.findMany({
      where: { counterId: user.sub, campaign: { status: CampaignStatus.ACTIVE } },
      include: {
        campaign: { select: { id: true, name: true } },
        zone: { include: { area: { select: { id: true, name: true } } } },
      },
      orderBy: { zone: { code: 'asc' } },
    });

    return Promise.all(
      assignments.map(async (a) => {
        const [totalItems, countedItems] = await Promise.all([
          this.prisma.expectedStock.count({
            where: { campaignId: a.campaignId, zoneId: a.zoneId },
          }),
          this.prisma.count.count({
            where: { campaignId: a.campaignId, zoneId: a.zoneId, round: 1 },
          }),
        ]);
        return {
          id: a.id,
          status: a.status,
          campaign: a.campaign,
          zone: { id: a.zone.id, code: a.zone.code, name: a.zone.name },
          area: a.zone.area,
          totalItems,
          countedItems,
        };
      }),
    );
  }

  // Detalle de una zona: lista de artículos SIN la cantidad del sistema
  async findOne(id: number, user: JwtPayload) {
    const a = await this.getMyAssignment(id, user);
    const [expected, counts] = await Promise.all([
      this.prisma.expectedStock.findMany({
        where: { campaignId: a.campaignId, zoneId: a.zoneId },
        include: { item: true },
        orderBy: { item: { description: 'asc' } },
      }),
      this.prisma.count.findMany({
        where: { campaignId: a.campaignId, zoneId: a.zoneId },
      }),
    ]);

    const items = expected.map((e) => {
      const round = e.recountRequested ? 2 : 1;
      const current = counts.find(
        (c) => c.itemId === e.itemId && c.round === round,
      );
      return {
        item: {
          id: e.item.id,
          sku: e.item.sku,
          barcode: e.item.barcode,
          description: e.item.description,
          unit: e.item.unit,
          boxSize: e.item.boxSize,
        },
        round,
        needsRecount: e.recountRequested && !current,
        countedQuantity: current?.quantity ?? null,
      };
    });

    return {
      id: a.id,
      status: a.status,
      campaign: { id: a.campaign.id, name: a.campaign.name },
      zone: { id: a.zone.id, code: a.zone.code, name: a.zone.name },
      area: a.zone.area,
      items,
    };
  }

  async saveCount(id: number, dto: CreateCountDto, user: JwtPayload) {
    const a = await this.getMyAssignment(id, user);
    if (a.campaign.status !== CampaignStatus.ACTIVE) {
      throw new BadRequestException('La campaña no está activa');
    }
    const item = await this.prisma.item.findUnique({ where: { id: dto.itemId } });
    if (!item) throw new NotFoundException('Artículo no encontrado');

    const key = { campaignId: a.campaignId, zoneId: a.zoneId, itemId: item.id };

    // Si el artículo no estaba en el sistema para esta zona,
    // se registra con existencia 0 (será un "sobrante").
    const expected = await this.prisma.expectedStock.upsert({
      where: { campaignId_zoneId_itemId: key },
      update: {},
      create: { ...key, quantity: 0 },
    });
    const round = expected.recountRequested ? 2 : 1;

    const count = await this.prisma.count.upsert({
      where: { campaignId_zoneId_itemId_round: { ...key, round } },
      update: { quantity: dto.quantity, counterId: user.sub, createdAt: new Date() },
      create: { ...key, round, quantity: dto.quantity, counterId: user.sub },
    });

    if (a.status !== AssignmentStatus.IN_PROGRESS) {
      await this.prisma.zoneAssignment.update({
        where: { id: a.id },
        data: {
          status: AssignmentStatus.IN_PROGRESS,
          startedAt: a.startedAt ?? new Date(),
          finishedAt: null,
        },
      });
    }

    return { id: count.id, itemId: item.id, quantity: count.quantity, round };
  }

  async finish(id: number, user: JwtPayload) {
    const detail = await this.findOne(id, user);
    const pending = detail.items.filter((i) => i.countedQuantity === null).length;
    if (pending > 0) {
      throw new BadRequestException(`Faltan ${pending} artículos por contar`);
    }
    return this.prisma.zoneAssignment.update({
      where: { id },
      data: { status: AssignmentStatus.DONE, finishedAt: new Date() },
    });
  }
}