import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@prisma';
import { CreateZikrCountDto, UpdateZikrCountDto } from './dto';
import { ZikrCounts, Role } from '@prisma/client';

@Injectable()
export class ZikrCountsService {
  constructor(private readonly prisma: PrismaService) {}

  async createZikrCount(createZikrCountDto: CreateZikrCountDto): Promise<ZikrCounts> {
    return this.prisma.zikrCounts.create({
      data: createZikrCountDto,
    });
  }

  async updateZikrCount(id: string, updateZikrCountDto: UpdateZikrCountDto, userId: string): Promise<ZikrCounts> {
    const zikrCount = await this.prisma.zikrCounts.findUnique({ where: { id } });

    if (!zikrCount) {
      throw new NotFoundException('ZikrCount not found');
    }

    // Authorization: Only the user or GroupAdmin can update ZikrCount
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
      where: {
        userId,
        groupId,
      },
    });
  
    if (zikrCounts.length === 0) {
      throw new NotFoundException('No Zikr counts found for the user in this group');
    }
  
    return zikrCounts;
  }
  

  async getAllZikrCounts(): Promise<ZikrCounts[]> { // for a specific gruop
    return this.prisma.zikrCounts.findMany();
  }

  async deleteZikrCount(id: string, userId: string): Promise<void> {
    const zikrCount = await this.prisma.zikrCounts.findUnique({ where: { id } });

    if (!zikrCount) {
      throw new NotFoundException('ZikrCount not found');
    }

    // Authorization: Only the user or GroupAdmin can delete ZikrCount
    const isAuthorized = await this.isUserGroupAdminOrUser(zikrCount.groupId, userId);
    if (!isAuthorized) {
      throw new ForbiddenException('You are not authorized to delete this ZikrCount');
    }

    await this.prisma.zikrCounts.delete({
      where: { id },
    });
  }

  async addZikrCountForGroup(groupId: string, zikrId: string, count: number, userId: string): Promise<{ totalCount: number; goalReached: boolean }> {
    if (!groupId || !zikrId || !count) {
      throw new NotFoundException('Missing required parameters');
    }

    // Step 1: Retrieve the current goal for the zikr in the group
    const zikrData = await this.prisma.zikr.findUnique({
      where: {
        id: zikrId,
      },
      select: {
        goal: true,
      },
    });

    if (!zikrData) {
      throw new NotFoundException('No Zikr found for this group');
    }

    const goal = zikrData.goal;

    // Step 2: Check if a record exists in group_zikr_activities for the combination of groupId and zikrId
    const existingRecord = await this.prisma.groupZikrActivities.findFirst({
      where: {
        group_id: groupId,
        zikr_id: zikrId,
      },
    });

    let totalCount: number;

    if (existingRecord) {
      // Step 3: If the record exists, update the zikr_count
      totalCount = existingRecord.zikr_count + count;
      await this.prisma.groupZikrActivities.update({
        where: {
          id: existingRecord.id,
        },
        data: {
          zikr_count: totalCount,
          last_updated: new Date(),
        },
      });
    } else {
      // Step 4: If the record does not exist, insert a new row
      totalCount = count;
      await this.prisma.groupZikrActivities.create({
        data: {
          group_id: groupId,
          zikr_id: zikrId,
          zikr_count: count,
          last_updated: new Date(),
        },
      });
    }

    // Step 5: Check if the updated total count has reached or exceeded the goal
    const goalReached = totalCount >= goal;

    return {
      totalCount,
      goalReached,
    };
  }

  // Helper function to check if a user is an Admin or GroupAdmin or the user himself
  private async isUserGroupAdminOrUser(groupId: string, userId: string): Promise<boolean> {
    const group = await this.prisma.group.findUnique({
      where: { idGroup: groupId },
    });

    if (!group) {
      return false;
    }

    if (group.adminId === userId) {
      return true; // User is the GroupAdmin
    }

    const user = await this.prisma.user.findUnique({
      where: { userId },
      select: { role: true },
    });

    return user?.role === Role.ADMIN;
  }
}
