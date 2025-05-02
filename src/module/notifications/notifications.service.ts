import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@prisma';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { Prisma } from '@prisma/client';
import { WebsocketGateway } from '../websocket/websocket.gateway';

@Injectable()
export class NotificationService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly websocketGateway: WebsocketGateway
  ) {}

  // async createNotification(senderId: string, createNotificationDto: CreateNotificationDto) {
  //   const notification = await this.prisma.notifications.create({
  //     data: {
  //       isInvite: createNotificationDto.isInvite,
  //       isRead: createNotificationDto.isRead ?? false,
  //       time: new Date(),
  //       sender: { connect: { userId: senderId } },
  //       receiver: { connect: { userId: createNotificationDto.receiverId } },
  //       group: createNotificationDto.groupId ? { connect: { idGroup: createNotificationDto.groupId } } : undefined,
  //     },
  //   });

  //   // Emit the notification to the receiver in real-time
  //   this.notificationsGateway.sendNotificationToUser(createNotificationDto.receiverId, notification);

  //   return notification;
  // }

  async createNotification(senderId: string, createNotificationDto: CreateNotificationDto) {
    const notification = await this.prismaService.notifications.create({
      data: {
        isInvite: createNotificationDto.isInvite,
        isRead: createNotificationDto.isRead ?? false,
        time: new Date(),
        sender: { connect: { userId: senderId } },
        receiver: { connect: { userId: createNotificationDto.receiverId } },
        group: createNotificationDto.groupId ? { connect: { idGroup: createNotificationDto.groupId } } : undefined,
      },
      include: {
        sender: {
          select: { name: true, surname: true }
        },
        group: {
          select: { name: true }
        }
      }
    });

    // Get information for WebSocket notification
    const notificationData = {
      id: notification.id,
      type: notification.isInvite ? 'invitation' : 'notification',
      senderId: notification.senderId,
      senderName: `${notification.sender.name} ${notification.sender.surname}`,
      groupId: notification.groupId,
      groupName: notification.group?.name,
      time: notification.time
    };

    // Emit the notification to the receiver in real-time
    this.websocketGateway.server.to(`user:${createNotificationDto.receiverId}`).emit(
      notification.isInvite ? 'new_invitation' : 'new_notification', 
      notificationData
    );

    return notification;
  }

  async getNotificationsForUser(userId: string) {
    return this.prismaService.notifications.findMany({
      where: {
        receiverId: userId,
      },
      orderBy: {
        time: 'desc',
      },
    });
  }

  async markAsRead(id: string, updateNotificationDto: UpdateNotificationDto) {
    const notification = await this.prismaService.notifications.findUnique({
      where: { id },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return this.prismaService.notifications.update({
      where: { id },
      data: updateNotificationDto,
    });
  }

  async deleteNotification(id: string): Promise<void> {
    const notification = await this.prismaService.notifications.findUnique({
      where: { id },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    await this.prismaService.notifications.delete({
      where: { id },
    });
  }

  async sendNotification(userId: string, notification: any) {
    // Use the main WebSocket gateway to send notifications
    this.websocketGateway.server.to(`user:${userId}`).emit('notification', notification);
  }
}

