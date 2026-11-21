import { IsInt, Min } from 'class-validator';

export class RequestRecountDto {
  @IsInt()
  @Min(1)
  zoneId!: number;

  @IsInt()
  @Min(1)
  itemId!: number;
}