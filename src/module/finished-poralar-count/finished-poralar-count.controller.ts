import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { FinishedPoralarCountService } from './finished-poralar-count.service';
import { CreateFinishedPoralarCountDto, UpdateFinishedPoralarCountDto } from './dto';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { RolesGuard, Roles, JwtPayload } from '@common';
import { Role } from '@prisma/client';
import { Request } from 'express';

@ApiTags('FinishedPoralarCount')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller('finished-poralar-count')
export class FinishedPoralarCountController {
  constructor(private readonly finishedPoralarCountService: FinishedPoralarCountService) {}

  @Roles(Role.USER, Role.ADMIN)
  @Post()
  @ApiOperation({ summary: 'Create a new Finished Poralar Count' })
  async createFinishedPoralarCount(@Req() request: Request, @Body() createFinishedPoralarCountDto: CreateFinishedPoralarCountDto) {
    const user = request.user as JwtPayload;
    return this.finishedPoralarCountService.createFinishedPoralarCount(createFinishedPoralarCountDto, user.id);
  }

  @Roles(Role.USER, Role.ADMIN)
  @Get(':id')
  @ApiOperation({ summary: 'Get Finished Poralar Count by ID' })
  async getFinishedPoralarCountById(@Param('id') id: string) {
    return this.finishedPoralarCountService.getFinishedPoralarCountById(id);
  }

  @Roles(Role.ADMIN, Role.USER)
  @Get()
  @ApiOperation({ summary: 'Get all Finished Poralar Counts' })
  async getAllFinishedPoralarCounts() {
    return this.finishedPoralarCountService.getAllFinishedPoralarCounts();
  }

  @Roles(Role.USER)
  @Patch(':id')
  @ApiOperation({ summary: 'Update Finished Poralar Count by ID' })
  async updateFinishedPoralarCount(@Req() request: Request, @Param('id') id: string, @Body() updateFinishedPoralarCountDto: UpdateFinishedPoralarCountDto) {
    const user = request.user as JwtPayload;
    return this.finishedPoralarCountService.updateFinishedPoralarCount(id, updateFinishedPoralarCountDto, user.id);
  }

  @Roles(Role.USER)
  @Delete(':id')
  @ApiOperation({ summary: 'Delete Finished Poralar Count by ID' })
  async deleteFinishedPoralarCount(@Req() request: Request, @Param('id') id: string) {
    const user = request.user as JwtPayload;
    return this.finishedPoralarCountService.deleteFinishedPoralarCount(id, user.id);
  }

  @Roles(Role.USER)
  @Post(':poraId/finish')
  @ApiOperation({ summary: 'Finish a juz (pora)' })
  async finishJuz(@Req() request: Request, @Param('poraId') poraId: string, @Body() body: { idGroup: string }) {
    const user = request.user as JwtPayload;
    return this.finishedPoralarCountService.finishJuz(poraId, user.id, body.idGroup);
  }
  
}
