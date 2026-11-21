import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { JwtPayload } from '../auth/types.js';
import {
  AssignmentStatus,
  CampaignStatus,
  Role,
} from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { RequestRecountDto } from './dto/request-recount.dto.js';

// PENDING = no contado · RECOUNT = esperando reconteo
// OK = coincide con el sistema · DIFF = hay diferencia
export type LineStatus = 'PENDING' | 'RECOUNT' | 'OK' | 'DIFF';

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

const oneDecimal = (n: number) => Math.round(n * 10) / 10;
const money = (n: number) => Math.round(n * 100) / 100;
const pct = (part: number, total: number) =>
  total ? Math.round((part * 100) / total) : 0;

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  private async getCampaign(id: number) {
    const campaign = await this.prisma.campaign.findUnique({ where: { id } });
    if (!campaign) throw new NotFoundException('Campaña no encontrada');
    return campaign;
  }

  // El supervisor solo ve su área
  private areaFilter(user: JwtPayload) {
    return user.role === Role.SUPERVISOR
      ? { zone: { areaId: user.areaId ?? -1 } }
      : {};
  }

  // Une "lo que dice el sistema" con "lo que se contó"
  private async buildLines(campaignId: number, user: JwtPayload): Promise<ReportLine[]> {
    const where = { campaignId, ...this.areaFilter(user) };
    const [rows, counts] = await Promise.all([
      this.prisma.expectedStock.findMany({
        where,
        include: {
          item: true,
          zone: { include: { area: { select: { id: true, name: true } } } },
        },
      }),
      this.prisma.count.findMany({ where }),
    ]);

    const byKey = new Map<string, { r1: number | null; r2: number | null }>();
    for (const c of counts) {
      const key = `${c.zoneId}-${c.itemId}`;
      const entry = byKey.get(key) ?? { r1: null, r2: null };
      if (c.round === 1) entry.r1 = c.quantity;
      else entry.r2 = c.quantity;
      byKey.set(key, entry);
    }

    const lines = rows.map((r): ReportLine => {
      const c = byKey.get(`${r.zoneId}-${r.itemId}`) ?? { r1: null, r2: null };
      const finalQty = r.recountRequested ? c.r2 : c.r1;

      let status: LineStatus;
      if (c.r1 === null) status = 'PENDING';
      else if (finalQty === null) status = 'RECOUNT';
      else status = finalQty === r.quantity ? 'OK' : 'DIFF';

      const unitCost = Number(r.item.unitCost);
      const diff = finalQty === null ? null : finalQty - r.quantity;

      return {
        zone: { id: r.zone.id, code: r.zone.code, name: r.zone.name },
        area: r.zone.area,
        item: {
          id: r.item.id,
          sku: r.item.sku,
          description: r.item.description,
          unit: r.item.unit,
          unitCost,
        },
        expected: r.quantity,
        firstCount: c.r1,
        recountCount: c.r2,
        finalQty,
        diff,
        value: diff === null ? null : money(diff * unitCost),
        recountRequested: r.recountRequested,
        status,
      };
    });

    return lines.sort(
      (a, b) =>
        a.area.name.localeCompare(b.area.name) ||
        a.zone.code.localeCompare(b.zone.code) ||
        a.item.description.localeCompare(b.item.description),
    );
  }

  private summarize(lines: ReportLine[]) {
    const counted = lines.filter((l) => l.status !== 'PENDING').length;
    const ok = lines.filter((l) => l.status === 'OK').length;
    const diffs = lines.filter((l) => l.status === 'DIFF');
    const closed = ok + diffs.length;

    return {
      totalItems: lines.length,
      countedItems: counted,
      progress: pct(counted, lines.length),
      discrepancies: diffs.length,
      recountsPending: lines.filter((l) => l.status === 'RECOUNT').length,
      // Exactitud = artículos que coinciden / artículos ya cerrados
      accuracy: closed ? oneDecimal((ok * 100) / closed) : null,
      // Valor absoluto de las diferencias (faltantes + sobrantes)
      discrepancyValue: money(diffs.reduce((s, l) => s + Math.abs(l.value ?? 0), 0)),
      // Neto: negativo = faltante de dinero, positivo = sobrante
      netValue: money(diffs.reduce((s, l) => s + (l.value ?? 0), 0)),
    };
  }

  async dashboard(id: number, user: JwtPayload) {
    const campaign = await this.getCampaign(id);
    const lines = await this.buildLines(id, user);

    const areas = new Map<number, { id: number; name: string; totalItems: number; countedItems: number }>();
    const zones = new Map<number, { zoneId: number; code: string; name: string; area: string; totalItems: number; countedItems: number }>();

    for (const l of lines) {
      const counted = l.status !== 'PENDING' ? 1 : 0;

      const a = areas.get(l.area.id) ?? { ...l.area, totalItems: 0, countedItems: 0 };
      a.totalItems += 1;
      a.countedItems += counted;
      areas.set(l.area.id, a);

      const z = zones.get(l.zone.id) ?? {
        zoneId: l.zone.id,
        code: l.zone.code,
        name: l.zone.name,
        area: l.area.name,
        totalItems: 0,
        countedItems: 0,
      };
      z.totalItems += 1;
      z.countedItems += counted;
      zones.set(l.zone.id, z);
    }

    const assignments = await this.prisma.zoneAssignment.findMany({
      where: { campaignId: id },
      include: { counter: { select: { name: true } } },
    });
    const counterByZone = new Map(assignments.map((a) => [a.zoneId, a.counter.name]));

    return {
      campaign: {
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        startedAt: campaign.startedAt,
      },
      summary: this.summarize(lines),
      byArea: [...areas.values()]
        .map((a) => ({ ...a, progress: pct(a.countedItems, a.totalItems) }))
        .sort((x, y) => y.progress - x.progress),
      lateZones: [...zones.values()]
        .map((z) => ({
          ...z,
          progress: pct(z.countedItems, z.totalItems),
          counter: counterByZone.get(z.zoneId) ?? null,
        }))
        .filter((z) => z.progress < 100)
        .sort((x, y) => x.progress - y.progress)
        .slice(0, 5),
      topDiscrepancies: lines
        .filter((l) => l.status === 'DIFF')
        .sort((x, y) => Math.abs(y.value ?? 0) - Math.abs(x.value ?? 0))
        .slice(0, 5),
    };
  }

  async discrepancies(id: number, user: JwtPayload) {
    await this.getCampaign(id);
    const lines = await this.buildLines(id, user);
    return lines
      .filter((l) => l.status === 'DIFF' || l.status === 'RECOUNT')
      .sort((x, y) => Math.abs(y.value ?? 0) - Math.abs(x.value ?? 0));
  }

  async requestRecount(id: number, dto: RequestRecountDto, user: JwtPayload) {
    const campaign = await this.getCampaign(id);
    if (campaign.status !== CampaignStatus.ACTIVE) {
      throw new BadRequestException('Solo se pide reconteo en una campaña activa');
    }

    const row = await this.prisma.expectedStock.findUnique({
      where: {
        campaignId_zoneId_itemId: {
          campaignId: id,
          zoneId: dto.zoneId,
          itemId: dto.itemId,
        },
      },
      include: { zone: true },
    });
    if (!row) throw new NotFoundException('Ese artículo no está en esa zona');
    if (user.role === Role.SUPERVISOR && row.zone.areaId !== user.areaId) {
      throw new ForbiddenException('Solo puedes pedir reconteos de tu área');
    }
    if (row.recountRequested) {
      throw new BadRequestException('Ya se pidió reconteo de este artículo');
    }

    const firstCount = await this.prisma.count.count({
      where: { campaignId: id, zoneId: dto.zoneId, itemId: dto.itemId, round: 1 },
    });
    if (!firstCount) {
      throw new BadRequestException('Primero debe contarse el artículo');
    }

    // Marca el reconteo y "reabre" la zona si ya estaba terminada
    await this.prisma.$transaction([
      this.prisma.expectedStock.update({
        where: { id: row.id },
        data: { recountRequested: true },
      }),
      this.prisma.zoneAssignment.updateMany({
        where: { campaignId: id, zoneId: dto.zoneId, status: AssignmentStatus.DONE },
        data: { status: AssignmentStatus.IN_PROGRESS, finishedAt: null },
      }),
    ]);

    return { ok: true };
  }

  async report(id: number, user: JwtPayload) {
    const campaign = await this.getCampaign(id);
    const lines = await this.buildLines(id, user);
    return {
      campaign,
      generatedAt: new Date(),
      summary: this.summarize(lines),
      lines,
    };
  }
}