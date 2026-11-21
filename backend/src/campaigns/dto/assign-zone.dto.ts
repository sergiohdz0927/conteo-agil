import { IsInt, Min } from 'class-validator';

export class AssignZoneDto {
  @IsInt()
  @Min(1)
  zoneId!: number;

  @IsInt()
  @Min(1)
  counterId!: number;
}