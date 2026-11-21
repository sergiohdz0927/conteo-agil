import { IsInt, Max, Min } from 'class-validator';

export class CreateCountDto {
  @IsInt()
  @Min(1)
  itemId!: number;

  @IsInt()
  @Min(0)
  @Max(1_000_000)
  quantity!: number;
}