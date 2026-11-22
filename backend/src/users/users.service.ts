import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import bcrypt from 'bcryptjs';
import type { JwtPayload } from '../auth/types.js';
import { Prisma, Role } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';

// Nunca se regresa el passwordHash
const USER_SELECT = {
  id: true,
  employeeNumber: true,
  name: true,
  role: true,
  createdAt: true,
  area: { select: { id: true, name: true } },
} as const;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.user.findMany({
      select: USER_SELECT,
      orderBy: [{ role: 'asc' }, { name: 'asc' }],
    });
  }

  // Supervisores y contadores siempre pertenecen a un área
  private async checkArea(role: Role, areaId: number | null | undefined) {
    if (role !== Role.COORDINATOR && !areaId) {
      throw new BadRequestException('Supervisores y contadores necesitan un área');
    }
    if (areaId) {
      const area = await this.prisma.area.findUnique({ where: { id: areaId } });
      if (!area) throw new NotFoundException('Área no encontrada');
    }
  }

  async create(dto: CreateUserDto) {
    await this.checkArea(dto.role, dto.areaId);
    try {
      return await this.prisma.user.create({
        data: {
          employeeNumber: dto.employeeNumber,
          name: dto.name.trim(),
          role: dto.role,
          areaId: dto.role === Role.COORDINATOR ? null : dto.areaId,
          passwordHash: await bcrypt.hash(dto.password, 10),
        },
        select: USER_SELECT,
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('Ya existe un usuario con ese número de empleado');
      }
      throw e;
    }
  }

  async update(id: number, dto: UpdateUserDto, me: JwtPayload) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    if (id === me.sub && dto.role && dto.role !== user.role) {
      throw new BadRequestException('No puedes cambiar tu propio rol');
    }

    const role = dto.role ?? user.role;
    const areaId = dto.areaId !== undefined ? dto.areaId : user.areaId;
    await this.checkArea(role, areaId);

    return this.prisma.user.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        role,
        areaId: role === Role.COORDINATOR ? null : areaId,
      },
      select: USER_SELECT,
    });
  }

  async resetPassword(id: number, dto: ResetPasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    await this.prisma.user.update({
      where: { id },
      data: { passwordHash: await bcrypt.hash(dto.password, 10) },
    });
    return { ok: true };
  }
}