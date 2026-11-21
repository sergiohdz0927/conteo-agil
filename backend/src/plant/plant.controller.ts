import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { Role } from '../generated/prisma/client.js';
import { CreateAreaDto } from './dto/create-area.dto.js';
import { CreateItemDto } from './dto/create-item.dto.js';
import { CreateZoneDto } from './dto/create-zone.dto.js';
import { PlantService } from './plant.service.js';

@Controller()
export class PlantController {
  constructor(private readonly plant: PlantService) {}

  // Áreas
  @Get('areas')
  findAreas() {
    return this.plant.findAreas();
  }

  @Roles(Role.COORDINATOR)
  @Post('areas')
  createArea(@Body() dto: CreateAreaDto) {
    return this.plant.createArea(dto);
  }

  // Zonas
  @Get('areas/:id/zones')
  findZones(@Param('id', ParseIntPipe) id: number) {
    return this.plant.findAreaWithZones(id);
  }

  @Roles(Role.COORDINATOR)
  @Post('areas/:id/zones')
  createZone(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateZoneDto,
  ) {
    return this.plant.createZone(id, dto);
  }

  // Catálogo
  @Get('items')
  findItems(@Query('search') search?: string) {
    return this.plant.findItems(search);
  }

  @Get('items/barcode/:barcode')
  findItemByBarcode(@Param('barcode') barcode: string) {
    return this.plant.findItemByBarcode(barcode);
  }

  @Roles(Role.COORDINATOR)
  @Post('items')
  createItem(@Body() dto: CreateItemDto) {
    return this.plant.createItem(dto);
  }
}