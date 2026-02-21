import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '@prisma';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { Role } from '@prisma/client';

@Injectable()
export class NotificationService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly websocketGateway: WebsocketGateway,
  ) {}

  async createInvite(senderId: string, dto: CreateNotificationDto) {
    // Guard: prevent duplicate PENDING invites
    const existing = await this.prismaService.notifications.findFirst({
      where: {
        receiverId: dto.receiverId,
        groupId: dto.groupId,
        status: 'PENDING',
      },
    });

    if (existing) {
      throw new ConflictException('A pending invitation to this group already exists for this user');
    }

    const notification = await this.prismaService.notifications.create({
      data: {
        isInvite: true,
        isRead: false,
        status: 'PENDING',
        time: new Date(),
        sender: { connect: { userId: senderId } },
        receiver: { connect: { userId: dto.receiverId } },
        group: { connect: { idGroup: dto.groupId } },
      },
      include: {
        sender: { select: { name: true, surname: true, image_url: true } },
        group: { select: { name: true } },
      },
    });

    this.websocketGateway.server
      .to(`user:${dto.receiverId}`)
      .emit('new_invitation', {
        id: notification.id,
        senderId: notification.senderId,
        senderName: `${notification.sender.name} ${notification.sender.surname}`,
        groupId: notification.groupId,
        groupName: notification.group?.name,
        time: notification.time,
      });

    return notification;
  }

  async getPendingInvitesForUser(userId: string) {
    return this.prismaService.notifications.findMany({
      where: { receiverId: userId, status: 'PENDING' },
      orderBy: { time: 'desc' },
      include: {
        sender: { select: { name: true, surname: true, image_url: true } },
        group: { select: { name: true } },
      },
    });
  }

  async acceptInvite(notificationId: string, userId: string) {
    const notification = await this.prismaService.notifications.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (notification.receiverId !== userId) {
      throw new ForbiddenException('You are not the recipient of this invitation');
    }

    if (notification.status !== 'PENDING') {
      throw new ConflictException('This invitation is no longer pending');
    }

    // Check if user is already a member
    const existingMembership = await this.prismaService.groupMembers.findUnique({
      where: {
        group_id_user_id: { group_id: notification.groupId, user_id: userId },
      },
    });

    if (!existingMembership) {
      await this.prismaService.groupMembers.create({
        data: {
          group_id: notification.groupId,
          user_id: userId,
          role: Role.USER,
          joined_at: new Date(),
        },
      });
    }

    const updated = await this.prismaService.notifications.update({
      where: { id: notificationId },
      data: { status: 'ACCEPTED', isRead: true },
    });

    this.websocketGateway.server
      .to(`group:${notification.groupId}`)
      .emit('invite_accepted', { groupId: notification.groupId, userId });

    return updated;
  }

  async ignoreInvite(notificationId: string, userId: string) {
    const notification = await this.prismaService.notifications.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (notification.receiverId !== userId) {
      throw new ForbiddenException('You are not the recipient of this invitation');
    }

    return this.prismaService.notifications.update({
      where: { id: notificationId },
      data: { status: 'IGNORED', isRead: true },
    });
  }

  async deleteNotification(id: string): Promise<void> {
    const notification = await this.prismaService.notifications.findUnique({
      where: { id },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    await this.prismaService.notifications.delete({ where: { id } });
  }
}
