import { Controller, Get, Post, Delete, Param, Body, Patch, UseGuards, Req, Query } from '@nestjs/common';
import { GroupService } from './group.service';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiBody } from '@nestjs/swagger';
import { GroupType, Role } from '@prisma/client';
import { Request } from 'express';
import { RolesGuard, Roles, JwtPayload } from '@common';
import { CreateGroupDto, SubscribeUserDto, UpdateGroupDto } from './dto';
import { UsersService } from '@module';

@ApiTags('Groups (Qura\'n, Zikr)')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller('groups')
export class GroupController {
  constructor(private readonly groupService: GroupService) { }
  private readonly userService: UsersService

  @Roles(Role.USER, Role.ADMIN)
  @Post()
  @ApiOperation({ summary: 'Create a new group' })
  async createGroup(@Req() request: Request, @Body() createGroupDto: CreateGroupDto) {
    const admin = request.user as JwtPayload;
    return this.groupService.createGroup(admin.id, createGroupDto);
  }

  @Roles(Role.ADMIN, Role.USER)
  @Get(':id')
  @ApiOperation({ summary: 'Get group by ID (admin and user)' })
  async getGroup(@Param('id') idGroup: string) {
    return this.groupService.getGroupById(idGroup);
  }

  @Roles(Role.ADMIN)
  @Get()
  @ApiOperation({ summary: 'Get all groups (admin only)' })
  async getAllGroups() {
    return this.groupService.getAllGroups();
  }

  @Roles(Role.ADMIN, Role.USER)
  @Patch(':id')
  @ApiOperation({ summary: 'Update group by ID (admin and group admin)' })
  async updateGroup(@Req() request: Request, @Param('id') idGroup: string, @Body() updateGroupDto: UpdateGroupDto) {
    const user = request.user as JwtPayload;
    return this.groupService.updateGroup(idGroup, updateGroupDto, user.id);
  }

  @Roles(Role.ADMIN, Role.USER)
  @Delete(':id')
  @ApiOperation({ summary: 'Delete group by ID (GroupAdmin deletes the group, users remove themselves)' })
  async deleteGroup(@Req() request: Request, @Param('id') idGroup: string) {
    const user = request.user as JwtPayload;
    return this.groupService.deleteGroup(idGroup, user.id);
  }

  // // Get user's public groups
  // @Roles(Role.USER, Role.ADMIN)
  // @Get('/public/mine')
  // @ApiOperation({ summary: 'Get user\'s public groups (admin and user)' })
  // async getUserPublicGroups(@Req() request: Request) {
  //   const user = request.user as JwtPayload;
  //   return this.groupService.getUserPublicGroups(user.id);
  // }

  // // Get user's private groups
  // @Roles(Role.USER, Role.ADMIN)
  // @Get('/private/mine')
  // @ApiOperation({ summary: 'Get user\'s private groups (admin and user)' })
  // async getUserPrivateGroups(@Req() request: Request) {
  //   const user = request.user as JwtPayload;
  //   return this.groupService.getUserPrivateGroups(user.id);
  // }

  @Roles(Role.USER, Role.ADMIN)
  @Post('subscribe')
  @ApiOperation({ summary: 'Subscribe a user to a group' })
  async subscribeUser(@Req() request: Request, @Body() subscribeUserDto: SubscribeUserDto) {
    const user = request.user as JwtPayload;
    return this.groupService.subscribeUser(user.id, subscribeUserDto.groupId);
  }

  // @Roles(Role.USER, Role.ADMIN)
  // @Get('/type/:groupType')
  // @ApiOperation({ summary: 'Get groups by type (Quran or Zikr) for a specific user' })
  // async getGroupsByTypeForUser(
  //   @Req() request: Request,
  //   @Param('groupType') groupType: GroupType
  // ) {
  //   const user = request.user as JwtPayload;
  //   return this.groupService.getGroupsByTypeForUser(user.id, groupType);
  // }

  @Roles(Role.USER, Role.ADMIN)
  @Get('/public/mine')
  @ApiOperation({ summary: "Get user's public groups (admin and user)" })
  async getUserPublicGroups(@Req() request: Request, @Query('groupType') groupType?: GroupType) {
    const user = request.user as JwtPayload;
    return this.groupService.getUserPublicGroups(user.id, groupType);
  }

  @Roles(Role.USER, Role.ADMIN)
  @Get('/private/mine')
  @ApiOperation({ summary: "Get user's private groups (admin and user)" })
  async getUserPrivateGroups(@Req() request: Request, @Query('groupType') groupType?: GroupType) {
    const user = request.user as JwtPayload;
    return this.groupService.getUserPrivateGroups(user.id, groupType);
  }




  @Roles(Role.USER, Role.ADMIN)
  @Get(':id/details')
  @ApiOperation({ summary: 'Get group details including profile and members' })
  async showGroupDetails(@Param('id') id: string) {
    return this.groupService.showGroupDetails(id);
  }
}
