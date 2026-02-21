import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtPayload, Roles, RolesGuard } from '@common';
import { Request } from 'express';
import { QuranGroupService } from './quran-group.service';
import { CreateQuranGroupDto, UpdateQuranGroupDto } from './dto';

@ApiTags('QuranGroups')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller('quran-groups')
export class QuranGroupController {
  constructor(private readonly quranGroupService: QuranGroupService) {}

  @Roles(Role.USER, Role.ADMIN)
  @Post()
  @ApiOperation({ summary: 'Create a new Quran group' })
  async createGroup(@Req() request: Request, @Body() dto: CreateQuranGroupDto) {
    const user = request.user as JwtPayload;
    return this.quranGroupService.createGroup(user.id, dto);
  }

  @Roles(Role.USER, Role.ADMIN)
  @Get('mine')
  @ApiOperation({ summary: 'Get all Quran groups for the current user (adminGroups + memberGroups)' })
  async getMyGroups(@Req() request: Request) {
    const user = request.user as JwtPayload;
    return this.quranGroupService.getMyGroups(user.id);
  }

  @Roles(Role.USER, Role.ADMIN)
  @Get(':id')
  @ApiOperation({ summary: 'Get Quran group details by ID' })
  async getGroupById(@Param('id') id: string) {
    return this.quranGroupService.getGroupById(id);
  }

  @Roles(Role.USER, Role.ADMIN)
  @Patch(':id')
  @ApiOperation({ summary: 'Update a Quran group by ID (admin only)' })
  async updateGroup(@Req() request: Request, @Param('id') id: string, @Body() dto: UpdateQuranGroupDto) {
    const user = request.user as JwtPayload;
    return this.quranGroupService.updateGroup(id, dto, user.id);
  }
}
