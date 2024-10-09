import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@prisma';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';


@Injectable()
export class NotificationService {
  constructor(private readonly prisma: PrismaService) {}

  async createNotification(createNotificationDto: CreateNotificationDto): Promise<Notification> {
    return this.prisma.notification.create({
      data: {
        ...createNotificationDto,
        time: new Date(),  // Set the current time
      },
    });
  }

  async getNotificationsForUser(userId: string): Promise<Notification[]> {
    return this.prisma.notification.findMany({
      where: {
        receiverId: userId,
      },
      orderBy: {
        time: 'desc',
      },
    });
  }

  async markAsRead(id: string, updateNotificationDto: UpdateNotificationDto): Promise<Notification> {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return this.prisma.notification.update({
      where: { id },
      data: updateNotificationDto,
    });
  }

  async deleteNotification(id: string): Promise<void> {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    await this.prisma.notification.delete({
      where: { id },
    });
  }
}
