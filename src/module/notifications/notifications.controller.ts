import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards, Req } from '@nestjs/common';

import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { Request } from 'express';
import { RolesGuard, Roles, JwtPayload } from '@common';
import { Role } from '@prisma/client';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { NotificationService } from './notifications.service';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Roles(Role.USER, Role.ADMIN)
  @Post()
  @ApiOperation({ summary: 'Create a new notification' })
  async createNotification(@Req() request: Request, @Body() createNotificationDto: CreateNotificationDto) {
    const user = request.user as JwtPayload;
    return this.notificationService.createNotification(user.id, createNotificationDto);
  }

  @Roles(Role.USER)
  @Get()
  @ApiOperation({ summary: 'Get all notifications for the current user' })
  async getNotificationsForUser(@Req() request: Request) {
    const user = request.user as JwtPayload;
    return this.notificationService.getNotificationsForUser(user.id);
  }

  @Roles(Role.USER)
  @Patch(':id')
  @ApiOperation({ summary: 'Mark a notification as read' })
  async markAsRead(@Param('id') id: string, @Body() updateNotificationDto: UpdateNotificationDto) {
    return this.notificationService.markAsRead(id, updateNotificationDto);
  }

  @Roles(Role.USER)
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a notification' })
  async deleteNotification(@Param('id') id: string) {
    return this.notificationService.deleteNotification(id);
  }
}
