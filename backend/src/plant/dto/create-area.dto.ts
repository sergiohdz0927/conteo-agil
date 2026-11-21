import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';

export class CreateAreaDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  name!: string;

  @Matches(/^[A-Z0-9-]{2,10}$/, {
    message: 'El código debe tener de 2 a 10 letras MAYÚSCULAS, números o guiones',
  })
  code!: string;
}