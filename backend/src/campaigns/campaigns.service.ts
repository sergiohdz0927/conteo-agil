import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { JwtPayload } from '../auth/types.js';
import { CampaignStatus, Role } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AssignZoneDto } from './dto/assign-zone.dto.js';
import { CreateCampaignDto } from './dto/create-campaign.dto.js';

@Injectable()
export class CampaignsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.campaign.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { assignments: true, expected: true } } },
    });
  }

  findActive() {
    return this.prisma.campaign.findFirst({
      where: { status: CampaignStatus.ACTIVE },
    });
  }

  async findOne(id: number) {
    const campaign = await this.prisma.campaign.findUnique({ where: { id } });
    if (!campaign) throw new NotFoundException('Campaña no encontrada');
    return campaign;
  }

  // Las existencias "del sistema" se copian de la campaña anterior.
  // En la empresa real vendrían del ERP.
  async create(dto: CreateCampaignDto) {
    const previous = await this.prisma.campaign.findFirst({
      where: { expected: { some: {} } },
      orderBy: { createdAt: 'desc' },
      include: { expected: true },
    });
    return this.prisma.campaign.create({
      data: {
        name: dto.name,
        expected: previous
          ? {
              create: previous.expected.map((e) => ({
                zoneId: e.zoneId,
                itemId: e.itemId,
                quantity: e.quantity,
              })),
            }
          : undefined,
      },
    });
  }

  async start(id: number) {
    const campaign = await this.findOne(id);
    if (campaign.status !== CampaignStatus.DRAFT) {
      throw new BadRequestException('Solo se puede iniciar una campaña en preparación');
    }
    const active = await this.findActive();
    if (active) {
      throw new ConflictException(`Ya hay una campaña activa: ${active.name}`);
    }
    return this.prisma.campaign.update({
      where: { id },
      data: { status: CampaignStatus.ACTIVE, startedAt: new Date() },
    });
  }

  async close(id: number) {
    const campaign = await this.findOne(id);
    if (campaign.status !== CampaignStatus.ACTIVE) {
      throw new BadRequestException('Solo se puede cerrar una campaña activa');
    }
    return this.prisma.campaign.update({
      where: { id },
      data: { status: CampaignStatus.CLOSED, closedAt: new Date() },
    });
  }

  // Todas las zonas con su contador asignado y su avance.
  // El supervisor solo ve las zonas de su área.
  async findAssignments(id: number, user: JwtPayload) {
    await this.findOne(id);
    const zones = await this.prisma.zone.findMany({
      where:
        user.role === Role.SUPERVISOR ? { areaId: user.areaId ?? -1 } : undefined,
      orderBy: [{ area: { name: 'asc' } }, { code: 'asc' }],
      include: {
        area: { select: { id: true, name: true } },
        assignments: {
          where: { campaignId: id },
          include: {
            counter: { select: { id: true, name: true, employeeNumber: true } },
          },
        },
        _count: { select: { expected: { where: { campaignId: id } } } },
      },
    });

    const counted = await this.prisma.count.groupBy({
      by: ['zoneId'],
      where: { campaignId: id, round: 1 },
      _count: { _all: true },
    });
    const countedByZone = new Map(counted.map((c) => [c.zoneId, c._count._all]));

    return zones.map((z) => {
      const assignment = z.assignments[0] ?? null;
      const totalItems = z._count.expected;
      const countedItems = countedByZone.get(z.id) ?? 0;
      return {
        zoneId: z.id,
        code: z.code,
        name: z.name,
        area: z.area,
        assignmentId: assignment?.id ?? null,
        status: assignment?.status ?? null,
        counter: assignment?.counter ?? null,
        totalItems,
        countedItems,
        progress: totalItems ? Math.round((countedItems * 100) / totalItems) : 0,
      };
    });
  }

  async assign(id: number, dto: AssignZoneDto, user: JwtPayload) {
    const campaign = await this.findOne(id);
    if (campaign.status === CampaignStatus.CLOSED) {
      throw new BadRequestException('La campaña ya está cerrada');
    }
    const zone = await this.prisma.zone.findUnique({ where: { id: dto.zoneId } });
    if (!zone) throw new NotFoundException('Zona no encontrada');
    if (user.role === Role.SUPERVISOR && zone.areaId !== user.areaId) {
      throw new ForbiddenException('Solo puedes asignar zonas de tu área');
    }
    const counter = await this.prisma.user.findUnique({
      where: { id: dto.counterId },
    });
    if (!counter || counter.role !== Role.COUNTER) {
      throw new BadRequestException('Ese usuario no es contador');
    }

    return this.prisma.zoneAssignment.upsert({
      where: { campaignId_zoneId: { campaignId: id, zoneId: dto.zoneId } },
      update: { counterId: dto.counterId },
      create: { campaignId: id, zoneId: dto.zoneId, counterId: dto.counterId },
    });
  }

  findCounters(user: JwtPayload) {
    return this.prisma.user.findMany({
      where: {
        role: Role.COUNTER,
        ...(user.role === Role.SUPERVISOR ? { areaId: user.areaId } : {}),
      },
      select: {
        id: true,
        name: true,
        employeeNumber: true,
        area: { select: { id: true, name: true } },
      },
      orderBy: { name: 'asc' },
    });
  }
}