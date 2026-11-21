import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateAreaDto } from './dto/create-area.dto.js';
import { CreateItemDto } from './dto/create-item.dto.js';
import { CreateZoneDto } from './dto/create-zone.dto.js';

function isUniqueError(e: unknown) {
  return (
    e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002'
  );
}

@Injectable()
export class PlantService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------- Áreas ----------

  findAreas() {
    return this.prisma.area.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { zones: true, users: true } } },
    });
  }

  async createArea(dto: CreateAreaDto) {
    try {
      return await this.prisma.area.create({ data: dto });
    } catch (e) {
      if (isUniqueError(e)) {
        throw new ConflictException('Ya existe un área con ese nombre o código');
      }
      throw e;
    }
  }

  // ---------- Zonas ----------

  async findAreaWithZones(areaId: number) {
    const area = await this.prisma.area.findUnique({
      where: { id: areaId },
      include: { zones: { orderBy: { code: 'asc' } } },
    });
    if (!area) throw new NotFoundException('Área no encontrada');
    return area;
  }

  async createZone(areaId: number, dto: CreateZoneDto) {
    await this.findAreaWithZones(areaId);
    try {
      return await this.prisma.zone.create({ data: { ...dto, areaId } });
    } catch (e) {
      if (isUniqueError(e)) {
        throw new ConflictException('Esa área ya tiene una zona con ese código');
      }
      throw e;
    }
  }

  // ---------- Catálogo ----------

  findItems(search?: string) {
    const q = search?.trim();
    return this.prisma.item.findMany({
      where: q
        ? {
            OR: [
              { description: { contains: q, mode: 'insensitive' } },
              { sku: { contains: q, mode: 'insensitive' } },
              { barcode: { contains: q } },
            ],
          }
        : undefined,
      orderBy: { description: 'asc' },
      take: 100,
    });
  }

  async findItemByBarcode(barcode: string) {
    const item = await this.prisma.item.findUnique({ where: { barcode } });
    if (!item) {
      throw new NotFoundException('Ese código no está en el catálogo');
    }
    return item;
  }

  async createItem(dto: CreateItemDto) {
    try {
      return await this.prisma.item.create({ data: dto });
    } catch (e) {
      if (isUniqueError(e)) {
        throw new ConflictException('Ya existe un artículo con ese SKU o código de barras');
      }
      throw e;
    }
  }
}