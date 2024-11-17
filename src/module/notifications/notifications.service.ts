import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@prisma';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { Prisma } from '@prisma/client';
import { NotificationsGateway } from './notifications.gateway';


@Injectable()
export class NotificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsGateway: NotificationsGateway,  // Inject gateway
  ) {}

  async createNotification(senderId: string, createNotificationDto: CreateNotificationDto) {
    const notification = await this.prisma.notifications.create({
      data: {
        isInvite: createNotificationDto.isInvite,
        isRead: createNotificationDto.isRead ?? false,
        time: new Date(),
        sender: { connect: { userId: senderId } },
        receiver: { connect: { userId: createNotificationDto.receiverId } },
        group: createNotificationDto.groupId ? { connect: { idGroup: createNotificationDto.groupId } } : undefined,
      },
    });

    // Emit the notification to the receiver in real-time
    this.notificationsGateway.sendNotificationToUser(createNotificationDto.receiverId, notification);

    return notification;
  }

  async getNotificationsForUser(userId: string) {
    return this.prisma.notifications.findMany({
      where: {
        receiverId: userId,
      },
      orderBy: {
        time: 'desc',
      },
    });
  }

  async markAsRead(id: string, updateNotificationDto: UpdateNotificationDto) {
    const notification = await this.prisma.notifications.findUnique({
      where: { id },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return this.prisma.notifications.update({
      where: { id },
      data: updateNotificationDto,
    });
  }

  async deleteNotification(id: string): Promise<void> {
    const notification = await this.prisma.notifications.findUnique({
      where: { id },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    await this.prisma.notifications.delete({
      where: { id },
    });
  }
}

