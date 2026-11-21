import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';

export class CreateZoneDto {
  @Matches(/^[A-Z0-9-]{1,10}$/, {
    message: 'El código debe tener hasta 10 letras MAYÚSCULAS, números o guiones',
  })
  code!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name!: string;
}