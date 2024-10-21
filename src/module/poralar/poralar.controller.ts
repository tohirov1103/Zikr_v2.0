// src/module/poralar/poralar.controller.ts
import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { PoralarService } from './poralar.service';
import { CreatePoraDto, UpdatePoraDto } from './dto';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from '@common';
import { Role } from '@prisma/client';

@ApiTags('Poralar')
@ApiBearerAuth()
@Controller('poralar')
export class PoralarController {
  constructor(private readonly poralarService: PoralarService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new Pora' })
  async create(@Body() createPoraDto: CreatePoraDto) {
    return this.poralarService.create(createPoraDto);
  }

  @Roles(Role.USER, Role.ADMIN)
  @Get('/group/:groupId/poralar')
  @ApiOperation({ summary: 'Get list of 30 Poralar (Juz) with booking status for a specific group' })
  async getPoralarWithBookingStatus(
    @Param('groupId') groupId: string
  ) {
    return this.poralarService.getPoralarWithBookingStatusForGroup(groupId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all Poralar' })
  async findAll() {
    return this.poralarService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a Pora by ID' })
  async findOne(@Param('id') id: string) {
    return this.poralarService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a Pora by ID' })
  async update(@Param('id') id: string, @Body() updatePoraDto: UpdatePoraDto) {
    return this.poralarService.update(id, updatePoraDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a Pora by ID' })
  async remove(@Param('id') id: string) {
    return this.poralarService.remove(id);
  }
}
