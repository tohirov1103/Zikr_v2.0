import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtPayload, Roles, RolesGuard } from '@common';
import { Request } from 'express';
import { ZikrGroupService } from './zikr-group.service';
import { CreateZikrGroupDto, UpdateZikrGroupDto } from './dto';

@ApiTags('ZikrGroups')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller('zikr-groups')
export class ZikrGroupController {
  constructor(private readonly zikrGroupService: ZikrGroupService) {}

  @Roles(Role.USER, Role.ADMIN)
  @Post()
  @ApiOperation({ summary: 'Create a new Zikr group (creates Group + Zikr in one request)' })
  async createGroup(@Req() request: Request, @Body() dto: CreateZikrGroupDto) {
    const user = request.user as JwtPayload;
    return this.zikrGroupService.createGroup(user.id, dto);
  }

  @Roles(Role.USER, Role.ADMIN)
  @Get('mine')
  @ApiOperation({ summary: 'Get all Zikr groups for the current user (adminGroups + memberGroups)' })
  async getMyGroups(@Req() request: Request) {
    const user = request.user as JwtPayload;
    return this.zikrGroupService.getMyGroups(user.id);
  }

  @Roles(Role.USER, Role.ADMIN)
  @Get(':id')
  @ApiOperation({ summary: 'Get Zikr group details by ID' })
  async getGroupById(@Param('id') id: string) {
    return this.zikrGroupService.getGroupById(id);
  }

  @Roles(Role.USER, Role.ADMIN)
  @Patch(':id')
  @ApiOperation({ summary: 'Update a Zikr group by ID (group + zikr fields in one request)' })
  async updateGroup(@Req() request: Request, @Param('id') id: string, @Body() dto: UpdateZikrGroupDto) {
    const user = request.user as JwtPayload;
    return this.zikrGroupService.updateGroup(id, dto, user.id);
  }
}
