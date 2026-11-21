import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './auth/auth.module.js';
import { CampaignsModule } from './campaigns/campaigns.module.js';
import { CountsModule } from './counts/counts.module.js';
import { PlantModule } from './plant/plant.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { ReportsModule } from './reports/reports.module.js';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    PlantModule,
    CampaignsModule,
    CountsModule,
    ReportsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}