import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@prisma';
import { Role } from '@prisma/client';
import { CreateZikrGroupDto, UpdateZikrGroupDto } from './dto';

@Injectable()
export class ZikrGroupService {
  constructor(private readonly prisma: PrismaService) {}

  async createGroup(adminId: string, dto: CreateZikrGroupDto) {
    const group = await this.prisma.group.create({
      data: {
        name: dto.name,
        guruhImg: dto.guruhImg,
        isPublic: dto.isPublic,
        kimga: dto.kimga,
        hatmSoni: 0,
        groupType: 'ZIKR',
        admin: { connect: { userId: adminId } },
      },
    });

    await this.prisma.groupMembers.create({
      data: {
        group_id: group.idGroup,
        user_id: adminId,
        role: Role.GroupAdmin,
        joined_at: new Date(),
      },
    });

    const zikr = await this.prisma.zikr.create({
      data: {
        name: dto.zikrName,
        desc: dto.zikrDesc ?? '',
        hint: dto.zikrHint,
        body: dto.zikrBody,
        goal: dto.goalZikrCount,
        group: { connect: { idGroup: group.idGroup } },
      },
    });

    await this.prisma.groupZikrActivities.create({
      data: {
        group_id: group.idGroup,
        zikr_id: zikr.id,
        zikr_count: 0,
        last_updated: new Date(),
      },
    });

    return { group, zikr };
  }

  async getMyGroups(userId: string) {
    const groups = await this.prisma.group.findMany({
      where: {
        groupType: 'ZIKR',
        OR: [
          { adminId: userId },
          { members: { some: { user_id: userId } } },
        ],
      },
      include: {
        admin: { select: { userId: true, name: true, phone: true } },
        zikr: { select: { name: true, goal: true } },
        zikrActivities: { select: { zikr_count: true } },
      },
    });

    const mapGroup = (g: any) => {
      const zikr = g.zikr?.[0];
      const activity = g.zikrActivities?.[0];
      const totalCount = activity?.zikr_count ?? 0;
      const goal = zikr?.goal ?? 1;
      return {
        id: g.idGroup,
        name: g.name,
        guruhImg: g.guruhImg,
        isPublic: g.isPublic,
        admin: g.admin,
        zikrName: zikr?.name ?? null,
        goalZikrCount: goal,
        currentZikrCount: totalCount % goal,
        created_at: g.created_at,
      };
    };

    return {
      adminGroups: groups.filter(g => g.adminId === userId).map(mapGroup),
      memberGroups: groups.filter(g => g.adminId !== userId).map(mapGroup),
    };
  }

  async getGroupById(groupId: string) {
    const group = await this.prisma.group.findUnique({
      where: { idGroup: groupId },
      include: {
        admin: { select: { userId: true, name: true, surname: true, phone: true } },
        members: {
          include: {
            user: { select: { userId: true, image_url: true, name: true, surname: true, phone: true } },
          },
        },
        zikr: { select: { id: true, name: true, goal: true } },
        zikrActivities: { select: { zikr_count: true } },
      },
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    const zikr = group.zikr?.[0];
    const activity = group.zikrActivities?.[0];
    const totalCount = activity?.zikr_count ?? 0;
    const goal = zikr?.goal ?? 1;
    const memberCount = group.members.length || 1;

    const cycleCount = Math.floor(totalCount / goal);
    const currentZikrCount = totalCount % goal;
    const userZikrCount = Math.ceil(goal / memberCount);

    // Get per-user ZikrCounts
    const userCounts = await this.prisma.zikrCounts.groupBy({
      by: ['userId'],
      where: { groupId },
      _sum: { count: true },
    });

    const userCountMap = new Map<string, number>();
    for (const uc of userCounts) {
      userCountMap.set(uc.userId, uc._sum.count ?? 0);
    }

    const members = group.members.map(m => ({
      userId: m.user.userId,
      image_url: m.user.image_url,
      name: m.user.name,
      surname: m.user.surname,
      phone: m.user.phone,
      isAdmin: m.role === Role.GroupAdmin,
      userZikrCount,
      userCurrentZikrCount: userCountMap.get(m.user_id) ?? 0,
    }));

    return {
      id: group.idGroup,
      name: group.name,
      isPublic: group.isPublic,
      admin: group.admin,
      zikrName: zikr?.name ?? null,
      goalZikrCount: goal,
      currentZikrCount,
      cycleCount,
      userZikrCount,
      members,
    };
  }

  async updateGroup(groupId: string, dto: UpdateZikrGroupDto, userId: string) {
    const isAuthorized = await this.isGroupAdmin(groupId, userId);
    if (!isAuthorized) {
      throw new ForbiddenException('You are not authorized to update this group');
    }

    const groupFields: any = {};
    if (dto.name !== undefined) groupFields.name = dto.name;
    if (dto.guruhImg !== undefined) groupFields.guruhImg = dto.guruhImg;
    if (dto.isPublic !== undefined) groupFields.isPublic = dto.isPublic;
    if (dto.kimga !== undefined) groupFields.kimga = dto.kimga;

    const zikrFields: any = {};
    if (dto.zikrName !== undefined) zikrFields.name = dto.zikrName;
    if (dto.zikrDesc !== undefined) zikrFields.desc = dto.zikrDesc;
    if (dto.zikrHint !== undefined) zikrFields.hint = dto.zikrHint;
    if (dto.zikrBody !== undefined) zikrFields.body = dto.zikrBody;
    if (dto.goalZikrCount !== undefined) zikrFields.goal = dto.goalZikrCount;

    const [group, zikr] = await Promise.all([
      Object.keys(groupFields).length
        ? this.prisma.group.update({ where: { idGroup: groupId }, data: groupFields })
        : this.prisma.group.findUnique({ where: { idGroup: groupId } }),
      Object.keys(zikrFields).length
        ? this.prisma.zikr.updateMany({ where: { groupId }, data: zikrFields })
        : Promise.resolve(null),
    ]);

    return { group, zikrUpdated: zikr };
  }

  private async isGroupAdmin(groupId: string, userId: string): Promise<boolean> {
    const group = await this.prisma.group.findUnique({ where: { idGroup: groupId } });
    if (!group) return false;
    if (group.adminId === userId) return true;

    const member = await this.prisma.groupMembers.findUnique({
      where: { group_id_user_id: { group_id: groupId, user_id: userId } },
      select: { role: true },
    });
    return member?.role === Role.GroupAdmin;
  }
}
