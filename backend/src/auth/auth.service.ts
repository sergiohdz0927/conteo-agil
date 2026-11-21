import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service.js';
import { LoginDto } from './dto/login.dto.js';
import type { JwtPayload } from './types.js';

const USER_SELECT = {
  id: true,
  employeeNumber: true,
  name: true,
  role: true,
  area: { select: { id: true, name: true } },
} as const;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { employeeNumber: dto.employeeNumber.trim() },
    });
    const ok = user && (await bcrypt.compare(dto.password, user.passwordHash));
    if (!user || !ok) {
      throw new UnauthorizedException(
        'Número de empleado o contraseña incorrectos',
      );
    }

    const payload: JwtPayload = {
      sub: user.id,
      role: user.role,
      name: user.name,
      areaId: user.areaId,
    };

    return {
      accessToken: await this.jwt.signAsync(payload),
      user: await this.me(user.id),
    };
  }

  async me(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: USER_SELECT,
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }
}