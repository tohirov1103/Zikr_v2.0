import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { Request } from 'express';
import { RolesGuard, Roles, JwtPayload } from '@common';
import { Role } from '@prisma/client';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationService } from './notifications.service';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Roles(Role.USER, Role.ADMIN)
  @Post()
  @ApiOperation({ summary: 'Send a group invitation to a user' })
  async createInvite(@Req() request: Request, @Body() dto: CreateNotificationDto) {
    const user = request.user as JwtPayload;
    return this.notificationService.createInvite(user.id, dto);
  }

  @Roles(Role.USER)
  @Get()
  @ApiOperation({ summary: 'Get all pending invitations for the current user' })
  async getPendingInvites(@Req() request: Request) {
    const user = request.user as JwtPayload;
    return this.notificationService.getPendingInvitesForUser(user.id);
  }

  @Roles(Role.USER)
  @Patch(':id/accept')
  @ApiOperation({ summary: 'Accept a group invitation' })
  async acceptInvite(@Req() request: Request, @Param('id') id: string) {
    const user = request.user as JwtPayload;
    return this.notificationService.acceptInvite(id, user.id);
  }

  @Roles(Role.USER)
  @Patch(':id/ignore')
  @ApiOperation({ summary: 'Ignore a group invitation' })
  async ignoreInvite(@Req() request: Request, @Param('id') id: string) {
    const user = request.user as JwtPayload;
    return this.notificationService.ignoreInvite(id, user.id);
  }

  @Roles(Role.USER)
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a notification' })
  async deleteNotification(@Param('id') id: string) {
    return this.notificationService.deleteNotification(id);
  }
}
