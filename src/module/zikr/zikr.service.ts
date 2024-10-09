import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@prisma';
import { CreateZikrDto, UpdateZikrDto } from './dto';
import { Zikr, Role } from '@prisma/client';

@Injectable()
export class ZikrService {
  constructor(private readonly prisma: PrismaService) {}

  async createZikr(adminId: string, createZikrDto: CreateZikrDto): Promise<Zikr> {
    return this.prisma.zikr.create({
      data: createZikrDto,
    });
  }

  async updateZikr(id: string, updateZikrDto: UpdateZikrDto, userId: string): Promise<Zikr> {
    const zikr = await this.prisma.zikr.findUnique({ where: { id } });

    if (!zikr) {
      throw new NotFoundException('Zikr not found');
    }

    // Check if the user is the group admin or an admin
    const isAuthorized = await this.isUserGroupAdminOrAdmin(zikr.groupId, userId);
    if (!isAuthorized) {
      throw new ForbiddenException('You are not authorized to update this Zikr');
    }

    return this.prisma.zikr.update({
      where: { id },
      data: updateZikrDto,
    });
  }

  async getZikrById(id: string): Promise<Zikr> {
    const zikr = await this.prisma.zikr.findUnique({ where: { id } });

    if (!zikr) {
      throw new NotFoundException('Zikr not found');
    }

    return zikr;
  }

  async getAllZikrsForGroup(groupId: string): Promise<Zikr[]> {
    return this.prisma.zikr.findMany({
      where: {
        groupId: groupId,  // Filter by groupId
      },
    });
  }


  async deleteZikr(id: string, userId: string): Promise<void> {
    const zikr = await this.prisma.zikr.findUnique({ where: { id } });

    if (!zikr) {
      throw new NotFoundException('Zikr not found');
    }

    // Check if the user is the group admin or an admin
    const isAuthorized = await this.isUserGroupAdminOrAdmin(zikr.groupId, userId);
    if (!isAuthorized) {
      throw new ForbiddenException('You are not authorized to delete this Zikr');
    }

    await this.prisma.zikr.delete({
      where: { id },
    });
  }

  // Helper function to check if a user is an Admin or GroupAdmin
  private async isUserGroupAdminOrAdmin(groupId: string, userId: string): Promise<boolean> {
    const group = await this.prisma.group.findUnique({
      where: { idGroup: groupId },
    });

    if (!group) {
      return false;
    }

    // Check if the user is the group admin
    if (group.adminId === userId) {
      return true;
    }

    // Check if the user is an admin
    const user = await this.prisma.user.findUnique({
      where: { userId },
      select: { role: true },
    });

    return user?.role === Role.ADMIN;
  }
}
