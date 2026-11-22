import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { Role } from '../../generated/prisma/client.js';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsEnum(Role, { message: 'Rol inválido' })
  role?: Role;

  // null = sin área (solo coordinadores)
  @IsOptional()
  @IsInt()
  @Min(1)
  areaId?: number | null;
}