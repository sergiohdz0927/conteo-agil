import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateCampaignDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name!: string;
}