import { Module } from '@nestjs/common';
import { PlantController } from './plant.controller.js';
import { PlantService } from './plant.service.js';

@Module({
  controllers: [PlantController],
  providers: [PlantService],
})
export class PlantModule {}