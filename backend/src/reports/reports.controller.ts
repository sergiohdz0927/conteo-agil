import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import type { JwtPayload } from '../auth/types.js';
import { Role } from '../generated/prisma/client.js';
import { RequestRecountDto } from './dto/request-recount.dto.js';
import { ReportsService } from './reports.service.js';

@Roles(Role.COORDINATOR, Role.SUPERVISOR)
@Controller('campaigns/:id')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('dashboard')
  dashboard(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.reports.dashboard(id, user);
  }

  @Get('discrepancies')
  discrepancies(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.reports.discrepancies(id, user);
  }

  @Post('recounts')
  @HttpCode(200)
  requestRecount(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RequestRecountDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.reports.requestRecount(id, dto, user);
  }

  @Get('report')
  report(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.reports.report(id, user);
  }
}