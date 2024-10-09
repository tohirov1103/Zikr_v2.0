import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { BookedPoralarService } from './booked-poralar.service';
import { CreateBookedPoralarDto, UpdateBookedPoralarDto } from './dto';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { RolesGuard, Roles, JwtPayload } from '@common';
import { Role } from '@prisma/client';
import { Request } from 'express';

@ApiTags('BookedPoralar')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller('booked-poralar')
export class BookedPoralarController {
  constructor(private readonly bookedPoralarService: BookedPoralarService) {}

  @Roles(Role.USER, Role.ADMIN)
  @Post()
  @ApiOperation({ summary: 'Create a new booking' })
  async createBookedPoralar(@Req() request: Request, @Body() createBookedPoralarDto: CreateBookedPoralarDto) {
    const user = request.user as JwtPayload;
    return this.bookedPoralarService.createBookedPoralar(createBookedPoralarDto, user.id); // Pass userId from token
  }

  @Roles(Role.USER, Role.ADMIN)
  @Get(':id')
  @ApiOperation({ summary: 'Get booking by ID' })
  async getBookedPoralarById(@Param('id') id: string) {
    return this.bookedPoralarService.getBookedPoralarById(id);
  }

  @Roles(Role.ADMIN, Role.USER)
  @Get()
  @ApiOperation({ summary: 'Get all bookings' })
  async getAllBookedPoralar() {
    return this.bookedPoralarService.getAllBookedPoralar();
  }

  @Roles(Role.USER)
  @Patch(':id')
  @ApiOperation({ summary: 'Update a booking by ID' })
  async updateBookedPoralar(@Req() request: Request, @Param('id') id: string, @Body() updateBookedPoralarDto: UpdateBookedPoralarDto) {
    const user = request.user as JwtPayload;
    return this.bookedPoralarService.updateBookedPoralar(id, updateBookedPoralarDto, user.id);
  }

  @Roles(Role.USER, Role.ADMIN)
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a booking by ID' })
  async deleteBookedPoralar(@Req() request: Request, @Param('id') id: string) {
    const user = request.user as JwtPayload;
    return this.bookedPoralarService.deleteBookedPoralar(id, user.id);
  }
}
