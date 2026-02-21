import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@prisma';
import { UpdateZikrCountDto } from './dto';
import { ZikrCounts, Role } from '@prisma/client';
import { WebsocketGateway } from '../websocket/websocket.gateway';

@Injectable()
export class ZikrCountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly websocketGateway: WebsocketGateway
  ) {}

  async updateZikrCount(id: string, updateZikrCountDto: UpdateZikrCountDto, userId: string): Promise<ZikrCounts> {
    const zikrCount = await this.prisma.zikrCounts.findUnique({ where: { id } });

    if (!zikrCount) {
      throw new NotFoundException('ZikrCount not found');
    }

    const isAuthorized = await this.isUserGroupAdminOrUser(zikrCount.groupId, userId);
    if (!isAuthorized) {
      throw new ForbiddenException('You are not authorized to update this ZikrCount');
    }

    return this.prisma.zikrCounts.update({
      where: { id },
      data: updateZikrCountDto,
    });
  }

  async getZikrCountForUser(userId: string, groupId: string): Promise<ZikrCounts[]> {
    const zikrCounts = await this.prisma.zikrCounts.findMany({
      where: { userId, groupId },
    });

    if (zikrCounts.length === 0) {
      throw new NotFoundException('No Zikr counts found for the user in this group');
    }

    return zikrCounts;
  }

  async getAllZikrCounts(): Promise<ZikrCounts[]> {
    return this.prisma.zikrCounts.findMany();
  }

  async deleteZikrCount(id: string, userId: string): Promise<void> {
    const zikrCount = await this.prisma.zikrCounts.findUnique({ where: { id } });

    if (!zikrCount) {
      throw new NotFoundException('ZikrCount not found');
    }

    const isAuthorized = await this.isUserGroupAdminOrUser(zikrCount.groupId, userId);
    if (!isAuthorized) {
      throw new ForbiddenException('You are not authorized to delete this ZikrCount');
    }

    await this.prisma.zikrCounts.delete({ where: { id } });
  }

  async addZikrCountForGroup(
    groupId: string,
    count: number,
    userId: string,
  ): Promise<{ totalCount: number; goalReached: boolean }> {
    // Auto-find the zikr for this group
    const zikr = await this.prisma.zikr.findFirst({
      where: { groupId },
      select: { id: true, goal: true, name: true },
    });

    if (!zikr) {
      throw new NotFoundException('No Zikr found for this group');
    }

    const goal = zikr.goal;

    // Upsert today's ZikrCounts record for this user+group
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existing = await this.prisma.zikrCounts.findFirst({
      where: {
        userId,
        groupId,
        sessionDate: { gte: today },
      },
    });

    if (existing) {
      await this.prisma.zikrCounts.update({
        where: { id: existing.id },
        data: { count: { increment: count } },
      });
    } else {
      await this.prisma.zikrCounts.create({
        data: {
          groupId,
          userId,
          count,
          sessionDate: new Date(),
          zikr_goal_id: zikr.id,
        },
      });
    }

    // Update GroupZikrActivities
    const existingActivity = await this.prisma.groupZikrActivities.findFirst({
      where: { group_id: groupId, zikr_id: zikr.id },
    });

    let totalCount: number;

    if (existingActivity) {
      totalCount = existingActivity.zikr_count + count;
      await this.prisma.groupZikrActivities.update({
        where: { id: existingActivity.id },
        data: { zikr_count: totalCount, last_updated: new Date() },
      });
    } else {
      totalCount = count;
      await this.prisma.groupZikrActivities.create({
        data: {
          group_id: groupId,
          zikr_id: zikr.id,
          zikr_count: count,
          last_updated: new Date(),
        },
      });
    }

    const goalReached = totalCount >= goal;

    const user = await this.prisma.user.findUnique({
      where: { userId },
      select: { name: true, surname: true },
    });

    this.websocketGateway.server.to(`group:${groupId}`).emit('zikr_count_updated', {
      groupId,
      zikrId: zikr.id,
      zikrName: zikr.name,
      userId,
      userName: `${user?.name} ${user?.surname}`,
      count,
      totalCount,
      progress: Math.min(100, (totalCount / goal) * 100).toFixed(2),
      goalReached,
      timestamp: new Date(),
    });

    return { totalCount, goalReached };
  }

  private async isUserGroupAdminOrUser(groupId: string, userId: string): Promise<boolean> {
    const group = await this.prisma.group.findUnique({ where: { idGroup: groupId } });

    if (!group) return false;
    if (group.adminId === userId) return true;

    const user = await this.prisma.user.findUnique({
      where: { userId },
      select: { role: true },
    });

    return user?.role === Role.ADMIN;
  }
}
