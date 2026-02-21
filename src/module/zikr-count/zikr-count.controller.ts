import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { AddCount, UpdateZikrCountDto } from './dto';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { RolesGuard, Roles, JwtPayload } from '@common';
import { Role } from '@prisma/client';
import { Request } from 'express';
import { ZikrCountsService } from './zikr-count.service';

@ApiTags('ZikrCounts')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller('zikr-counts')
export class ZikrCountsController {
  constructor(private readonly zikrCountsService: ZikrCountsService) {}

  @Roles(Role.GroupAdmin, Role.USER)
  @Get('/user/:groupId')
  @ApiOperation({ summary: 'Get Zikr counts for a specific user in a group' })
  async getZikrCountForUser(@Req() request: Request, @Param('groupId') groupId: string) {
    const user = request.user as JwtPayload;
    return this.zikrCountsService.getZikrCountForUser(user.id, groupId);
  }

  @Roles(Role.ADMIN)
  @Get()
  @ApiOperation({ summary: 'Get all ZikrCounts (admin only)' })
  async getAllZikrCounts() {
    return this.zikrCountsService.getAllZikrCounts();
  }

  @Roles(Role.ADMIN, Role.USER)
  @Patch(':id')
  @ApiOperation({ summary: 'Update a ZikrCount by ID' })
  async updateZikrCount(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() updateZikrCountDto: UpdateZikrCountDto,
  ) {
    const user = request.user as JwtPayload;
    return this.zikrCountsService.updateZikrCount(id, updateZikrCountDto, user.id);
  }

  @Roles(Role.USER, Role.ADMIN)
  @Post('/add-zikr-count')
  @ApiOperation({ summary: 'Add zikr count for a group (server auto-finds zikrId)' })
  async addZikrCountForGroup(@Req() request: Request, @Body() addZikrCountDto: AddCount) {
    const user = request.user as JwtPayload;
    const { groupId, count } = addZikrCountDto;
    return this.zikrCountsService.addZikrCountForGroup(groupId, count, user.id);
  }

  @Roles(Role.ADMIN, Role.USER)
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a ZikrCount by ID' })
  async deleteZikrCount(@Req() request: Request, @Param('id') id: string) {
    const user = request.user as JwtPayload;
    return this.zikrCountsService.deleteZikrCount(id, user.id);
  }
}
