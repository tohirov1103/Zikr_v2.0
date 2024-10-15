// UsersController.ts
import { Controller, Get, Post, Delete, Param, Body, UseGuards, Put, Req, Query } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto } from './dto';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtPayload, Roles, RolesGuard, successResponse } from '@common';
import { Request } from 'express';

@ApiTags("USERS")
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @Roles(Role.ADMIN, Role.USER)
  @Get('me')
  @ApiOperation({ summary: 'Get the current user\'s profile' })
  async getMe(@Req() request: Request) {
    const user = request.user as JwtPayload;
    const userProfile = await this.usersService.getUserById(user.id);
    return successResponse(userProfile, 'User profile fetched successfully');
  }

  @Roles(Role.USER)
  @Put('me')
  @ApiOperation({ summary: 'Update the current user\'s profile' })
  async updateMe(
    @Req() request: Request,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    const user = request.user as JwtPayload;
    const updatedUser = await this.usersService.updateUser(user.id, updateUserDto);
    return successResponse(updatedUser, 'User profile updated successfully');
  }

  @Roles(Role.ADMIN)
  @Post()
  @ApiOperation({ summary: 'Create a new user (admin only)' })
  async createUser(@Body() createUserDto: CreateUserDto) {
    const newUser = await this.usersService.createUser(createUserDto);
    return successResponse(newUser, 'User created successfully');
  }

  @Roles(Role.ADMIN)
  @Get(':id')
  @ApiOperation({ summary: 'Get a user by ID (admin only)' })
  async getUser(@Param('id') id: string) {
    const user = await this.usersService.getUserById(id);
    return successResponse(user, 'User found successfully');
  }

  @Roles(Role.ADMIN)
  @Put(':id')
  @ApiOperation({ summary: 'Update a user by ID (admin only)' })
  async updateUser(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    const updatedUser = await this.usersService.updateUser(id, updateUserDto);
    return successResponse(updatedUser, 'User updated successfully');
  }

  @Roles(Role.ADMIN)
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a user by ID (admin only)' })
  async deleteUser(@Param('id') id: string) {
    await this.usersService.deleteUser(id);
    return successResponse(null, 'User deleted successfully');
  }

  @Roles(Role.USER, Role.ADMIN)
  @Get('find')
  @ApiOperation({ summary: 'Find user by phone number' })
  async findUser(@Query('phone') phone: string) {
    return this.usersService.findUserByPhone(phone);
  }
}
