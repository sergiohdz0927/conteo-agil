import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import type { JwtPayload } from '../auth/types.js';
import { Role } from '../generated/prisma/client.js';
import { CampaignsService } from './campaigns.service.js';
import { AssignZoneDto } from './dto/assign-zone.dto.js';
import { CreateCampaignDto } from './dto/create-campaign.dto.js';

@Controller()
export class CampaignsController {
  constructor(private readonly campaigns: CampaignsService) {}

  // Cualquier usuario logueado puede saber cuál es la campaña activa
  @Get('campaigns/active')
  async findActive() {
    return { campaign: await this.campaigns.findActive() };
  }

  @Roles(Role.COORDINATOR, Role.SUPERVISOR)
  @Get('campaigns')
  findAll() {
    return this.campaigns.findAll();
  }

  @Roles(Role.COORDINATOR)
  @Post('campaigns')
  create(@Body() dto: CreateCampaignDto) {
    return this.campaigns.create(dto);
  }

  @Roles(Role.COORDINATOR)
  @Patch('campaigns/:id/start')
  start(@Param('id', ParseIntPipe) id: number) {
    return this.campaigns.start(id);
  }

  @Roles(Role.COORDINATOR)
  @Patch('campaigns/:id/close')
  close(@Param('id', ParseIntPipe) id: number) {
    return this.campaigns.close(id);
  }

  @Roles(Role.COORDINATOR, Role.SUPERVISOR)
  @Get('campaigns/:id/assignments')
  findAssignments(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.campaigns.findAssignments(id, user);
  }

  @Roles(Role.COORDINATOR, Role.SUPERVISOR)
  @Post('campaigns/:id/assignments')
  assign(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignZoneDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.campaigns.assign(id, dto, user);
  }

  @Roles(Role.COORDINATOR, Role.SUPERVISOR)
  @Get('counters')
  findCounters(@CurrentUser() user: JwtPayload) {
    return this.campaigns.findCounters(user);
  }
}