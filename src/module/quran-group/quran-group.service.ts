import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@prisma';
import { Role } from '@prisma/client';
import { CreateQuranGroupDto, UpdateQuranGroupDto } from './dto';

@Injectable()
export class QuranGroupService {
  constructor(private readonly prisma: PrismaService) {}

  async createGroup(adminId: string, dto: CreateQuranGroupDto) {
    const group = await this.prisma.group.create({
      data: {
        name: dto.name,
        guruhImg: dto.guruhImg,
        isPublic: dto.isPublic,
        kimga: dto.kimga,
        hatmSoni: dto.hatmSoni,
        groupType: 'QURAN',
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

    await this.prisma.finishedPoralarCount.create({
      data: {
        idGroup: group.idGroup,
        juzCount: 0,
      },
    });

    return group;
  }

  async getMyGroups(userId: string) {
    const groups = await this.prisma.group.findMany({
      where: {
        groupType: 'QURAN',
        OR: [
          { adminId: userId },
          { members: { some: { user_id: userId } } },
        ],
      },
      include: {
        admin: { select: { userId: true, name: true, phone: true } },
        finishedPoralarCounts: { select: { juzCount: true } },
      },
    });

    const mapGroup = (g: any) => ({
      id: g.idGroup,
      name: g.name,
      guruhImg: g.guruhImg,
      isPublic: g.isPublic,
      admin: g.admin,
      kimga: g.kimga,
      hatmSoni: g.hatmSoni,
      completedHatmCount: g.finishedPoralarCounts?.[0]?.juzCount ?? 0,
      created_at: g.created_at,
    });

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
        finishedPoralarCounts: { select: { juzCount: true } },
      },
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    // Fetch all poralar and booked poralar for this group
    const [poralar, bookedPoralar] = await Promise.all([
      this.prisma.poralar.findMany({ orderBy: { created_at: 'asc' } }),
      this.prisma.bookedPoralar.findMany({
        where: { idGroup: groupId },
        include: {
          user: { select: { userId: true, name: true, image_url: true, phone: true } },
        },
      }),
    ]);

    const bookedMap = new Map<string, any>();
    for (const b of bookedPoralar) {
      bookedMap.set(b.poraId, b);
    }

    const poralarWithStatus = poralar.map(p => {
      const booking = bookedMap.get(p.id);
      let status = 'Available';
      if (booking) {
        status = booking.isDone ? 'Completed' : 'Booked';
      }
      return {
        id: p.id,
        name: p.name,
        isBooked: !!booking,
        isDone: booking?.isDone ?? false,
        bookedBy: booking?.user ?? null,
        bookId: booking?.id ?? null,
        status,
      };
    });

    // Build member list with their booked poralar
    const memberIds = group.members.map(m => m.user_id);
    const memberBookings = await this.prisma.bookedPoralar.findMany({
      where: { idGroup: groupId, userId: { in: memberIds } },
      include: { pora: { select: { id: true, name: true } } },
    });

    const memberBookingsMap = new Map<string, { poraId: string; poraName: string }[]>();
    for (const b of memberBookings) {
      if (!memberBookingsMap.has(b.userId)) {
        memberBookingsMap.set(b.userId, []);
      }
      memberBookingsMap.get(b.userId).push({ poraId: b.poraId, poraName: b.pora.name });
    }

    const members = group.members.map(m => ({
      userId: m.user.userId,
      image_url: m.user.image_url,
      name: m.user.name,
      surname: m.user.surname,
      phone: m.user.phone,
      isAdmin: m.role === Role.GroupAdmin,
      bookedPoras: memberBookingsMap.get(m.user_id) ?? [],
    }));

    return {
      id: group.idGroup,
      name: group.name,
      isPublic: group.isPublic,
      kimga: group.kimga,
      hatmSoni: group.hatmSoni,
      completedHatmCount: group.finishedPoralarCounts?.[0]?.juzCount ?? 0,
      admin: group.admin,
      members,
      poralar: poralarWithStatus,
    };
  }

  async updateGroup(groupId: string, dto: UpdateQuranGroupDto, userId: string) {
    const isAuthorized = await this.isGroupAdmin(groupId, userId);
    if (!isAuthorized) {
      throw new ForbiddenException('You are not authorized to update this group');
    }

    return this.prisma.group.update({
      where: { idGroup: groupId },
      data: { ...dto },
    });
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
