import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards, Req } from '@nestjs/common';
import { ZikrService } from './zikr.service';
import { CreateZikrDto, UpdateZikrDto } from './dto';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { Request } from 'express';
import { RolesGuard, Roles, JwtPayload } from '@common';
import { Role } from '@prisma/client';

@ApiTags('Zikr')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller('zikr')
export class ZikrController {
  constructor(private readonly zikrService: ZikrService) {}

  @Roles(Role.ADMIN, Role.USER)
  @Post()
  @ApiOperation({ summary: 'Create a new Zikr (only Admins and GroupAdmins)' })
  async createZikr(@Req() request: Request, @Body() createZikrDto: CreateZikrDto) {
    const user = request.user as JwtPayload;
    return this.zikrService.createZikr(user.id, createZikrDto);
  }

  @Roles(Role.USER, Role.ADMIN)
  @Get(':id')
  @ApiOperation({ summary: 'Get a Zikr by ID' })
  async getZikrById(@Param('id') id: string) {
    return this.zikrService.getZikrById(id);
  }

  @Roles(Role.USER, Role.ADMIN)
@Get(':groupId/zikrs')
@ApiOperation({ summary: 'Get all zikrs for a specific group' })
async getAllZikrsForGroup(@Param('groupId') groupId: string) {
  return this.zikrService.getAllZikrsForGroup(groupId);
}

  @Roles(Role.ADMIN, Role.USER)
  @Patch(':id')
  @ApiOperation({ summary: 'Update a Zikr by ID (only Admins and GroupAdmins)' })
  async updateZikr(@Req() request: Request, @Param('id') id: string, @Body() updateZikrDto: UpdateZikrDto) {
    const user = request.user as JwtPayload;
    return this.zikrService.updateZikr(id, updateZikrDto, user.id);
  }

  @Roles(Role.ADMIN, Role.USER)
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a Zikr by ID (only Admins and GroupAdmins)' })
  async deleteZikr(@Req() request: Request, @Param('id') id: string) {
    const user = request.user as JwtPayload;
    return this.zikrService.deleteZikr(id, user.id);
  }
}
