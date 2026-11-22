import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Role } from '../../generated/prisma/client.js';

export class CreateUserDto {
  @Matches(/^[0-9]{3,10}$/, {
    message: 'El número de empleado debe tener de 3 a 10 dígitos',
  })
  employeeNumber!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name!: string;

  @IsEnum(Role, { message: 'Rol inválido' })
  role!: Role;

  @IsOptional()
  @IsInt()
  @Min(1)
  areaId?: number;

  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  password!: string;
}   