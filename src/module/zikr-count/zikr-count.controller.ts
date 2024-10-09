import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { AddCount, CreateZikrCountDto, UpdateZikrCountDto } from './dto';
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
  constructor(private readonly zikrCountsService: ZikrCountsService) { }

  // @Roles(Role.ADMIN, Role.USER)
  // @Post()
  // @ApiOperation({ summary: 'Create a new ZikrCount' })
  // async createZikrCount(@Req() request: Request, @Body() createZikrCountDto: CreateZikrCountDto) {
  //   const user = request.user as JwtPayload;
  //   return this.zikrCountsService.createZikrCount(createZikrCountDto);
  // }

  @Roles(Role.ADMIN, Role.USER) // for this one GroupAdmin can do it
  @Get(':id')
  @ApiOperation({ summary: 'Get ZikrCount by ID' })
  async getZikrCountById(@Param('id') id: string) {
    return this.zikrCountsService.getZikrCountById(id);
  }

  @Roles(Role.ADMIN)
  @Get()
  @ApiOperation({ summary: 'Get all ZikrCounts(Only for admin)' })
  async getAllZikrCounts() {
    return this.zikrCountsService.getAllZikrCounts();
  }

  @Roles(Role.ADMIN, Role.USER)
  @Patch(':id')
  @ApiOperation({ summary: 'Update a ZikrCount by ID (Obly for admin and for group admin)' })
  async updateZikrCount(@Req() request: Request, @Param('id') id: string, @Body() updateZikrCountDto: UpdateZikrCountDto) {
    const user = request.user as JwtPayload;
    return this.zikrCountsService.updateZikrCount(id, updateZikrCountDto, user.id);
  }

  @Roles(Role.USER, Role.ADMIN)
  @Post('/add-zikr-count')
  @ApiOperation({ summary: 'Add zikr count for a group' })
  async addZikrCountForGroup(
    @Req() request: Request,
    @Body() addZikrCountDto: AddCount
  ) {
    const user = request.user as JwtPayload;
    const { groupId, zikrId, count } = addZikrCountDto; // Extract groupId, zikrId, count from DTO

    // Pass the extracted values and user.id to the service
    return this.zikrCountsService.addZikrCountForGroup(groupId, zikrId, count, user.id);
  }

  @Roles(Role.ADMIN, Role.USER)
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a ZikrCount by ID (Only for Admin and GroupAdmin)' })
  async deleteZikrCount(@Req() request: Request, @Param('id') id: string) {
    const user = request.user as JwtPayload;
    return this.zikrCountsService.deleteZikrCount(id, user.id);
  }
}
