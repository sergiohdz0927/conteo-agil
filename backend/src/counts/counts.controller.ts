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
import { CountsService } from './counts.service.js';
import { CreateCountDto } from './dto/create-count.dto.js';

@Roles(Role.COUNTER)
@Controller('my-assignments')
export class CountsController {
  constructor(private readonly counts: CountsService) {}

  @Get()
  findMine(@CurrentUser() user: JwtPayload) {
    return this.counts.findMine(user);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.counts.findOne(id, user);
  }

  @Post(':id/counts')
  saveCount(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateCountDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.counts.saveCount(id, dto, user);
  }

  @Post(':id/finish')
  @HttpCode(200)
  finish(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.counts.finish(id, user);
  }
}