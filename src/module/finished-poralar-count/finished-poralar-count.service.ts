import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@prisma';
import { FinishedPoralarCount } from '@prisma/client';
import { CreateFinishedPoralarCountDto, UpdateFinishedPoralarCountDto } from './dto';
import { WebsocketGateway } from '../websocket/websocket.gateway';

@Injectable()
export class FinishedPoralarCountService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly websocketGateway: WebsocketGateway
  ) {}

  /**
   * Complete a hatm for a group:
   * 1. Verifies user is a member
   * 2. Increments juzCount (completedHatmCount) by 1 on the existing record
   * 3. Resets all BookedPoralar for the group (all poralar become Available)
   * 4. Emits WebSocket event
   */
  async createFinishedPoralarCount(
    dto: CreateFinishedPoralarCountDto,
    userId: string,
  ): Promise<FinishedPoralarCount> {
    const isMember = await this.prisma.groupMembers.findFirst({
      where: { group_id: dto.idGroup, user_id: userId },
    });

    if (!isMember) {
      throw new ForbiddenException('You are not a member of this group');
    }

    const existing = await this.prisma.finishedPoralarCount.findFirst({
      where: { idGroup: dto.idGroup },
    });

    if (!existing) {
      throw new NotFoundException('FinishedPoralarCount record not found for this group');
    }

    const updated = await this.prisma.finishedPoralarCount.update({
      where: { id: existing.id },
      data: { juzCount: { increment: 1 } },
    });

    // Reset all BookedPoralar for this group
    await this.prisma.bookedPoralar.deleteMany({ where: { idGroup: dto.idGroup } });

    const group = await this.prisma.group.findUnique({
      where: { idGroup: dto.idGroup },
      select: { name: true },
    });

    this.websocketGateway.server.to(`group:${dto.idGroup}`).emit('hatm_completed', {
      groupId: dto.idGroup,
      groupName: group?.name,
      completedHatmCount: updated.juzCount,
      timestamp: new Date(),
    });

    return updated;
  }

  async updateFinishedPoralarCount(
    id: string,
    updateFinishedPoralarCountDto: UpdateFinishedPoralarCountDto,
    userId: string,
  ): Promise<FinishedPoralarCount> {
    const finishedPoralarCount = await this.prisma.finishedPoralarCount.findUnique({ where: { id } });

    if (!finishedPoralarCount) {
      throw new NotFoundException('Finished Poralar Count not found');
    }

    const isMember = await this.prisma.groupMembers.findFirst({
      where: { group_id: finishedPoralarCount.idGroup, user_id: userId },
    });

    if (!isMember) {
      throw new ForbiddenException('You are not authorized to update this finished poralar count');
    }

    return this.prisma.finishedPoralarCount.update({
      where: { id },
      data: updateFinishedPoralarCountDto,
    });
  }

  async getFinishedPoralarCountById(id: string): Promise<FinishedPoralarCount> {
    const finishedPoralarCount = await this.prisma.finishedPoralarCount.findUnique({ where: { id } });

    if (!finishedPoralarCount) {
      throw new NotFoundException('Finished Poralar Count not found');
    }

    return finishedPoralarCount;
  }

  async getAllFinishedPoralarCounts(): Promise<FinishedPoralarCount[]> {
    return this.prisma.finishedPoralarCount.findMany();
  }

  async deleteFinishedPoralarCount(id: string, userId: string): Promise<void> {
    const finishedPoralarCount = await this.prisma.finishedPoralarCount.findUnique({ where: { id } });

    if (!finishedPoralarCount) {
      throw new NotFoundException('Finished Poralar Count not found');
    }

    const isMember = await this.prisma.groupMembers.findFirst({
      where: { group_id: finishedPoralarCount.idGroup, user_id: userId },
    });

    if (!isMember) {
      throw new ForbiddenException('You are not authorized to delete this finished poralar count');
    }

    await this.prisma.finishedPoralarCount.delete({ where: { id } });
  }

  async finishJuz(poraId: string, userId: string, idGroup: string): Promise<{ hatmCompleted: boolean }> {
    return this.prisma.$transaction(async (prisma) => {
      const bookedPora = await prisma.bookedPoralar.updateMany({
        where: { poraId, userId, idGroup, isBooked: true, isDone: false },
        data: { isDone: true },
      });

      if (bookedPora.count === 0) {
        throw new NotFoundException(`No active booking found for pora ${poraId} in group ${idGroup}`);
      }

      await prisma.finishedPoralarCount.updateMany({
        where: { idGroup },
        data: { juzCount: { increment: 1 } },
      });

      const finishedCount = await prisma.finishedPoralarCount.findFirst({
        where: { idGroup },
        select: { juzCount: true },
      });

      const group = await prisma.group.findUnique({
        where: { idGroup },
        select: { name: true, hatmSoni: true },
      });

      const user = await prisma.user.findUnique({
        where: { userId },
        select: { name: true, surname: true },
      });

      const pora = await prisma.poralar.findUnique({
        where: { id: poraId },
        select: { name: true },
      });

      const juzCount = finishedCount?.juzCount ?? 0;
      // 30 juz = one full hatm
      const hatmCompleted = juzCount >= 30;

      if (hatmCompleted) {
        await prisma.finishedPoralarCount.updateMany({
          where: { idGroup },
          data: { juzCount: 0 },
        });

        await prisma.group.update({
          where: { idGroup },
          data: { completedHatmCount: { increment: 1 } },
        });
      }

      this.websocketGateway.server.to(`group:${idGroup}`).emit('pora_completed', {
        poraId,
        poraName: pora?.name,
        groupId: idGroup,
        groupName: group?.name,
        userId,
        userName: `${user?.name} ${user?.surname}`,
        totalFinished: hatmCompleted ? 0 : juzCount,
        hatmCompleted,
        timestamp: new Date(),
      });

      if (hatmCompleted) {
        this.websocketGateway.server.to(`group:${idGroup}`).emit('hatm_completed', {
          groupId: idGroup,
          groupName: group?.name,
          completedHatmCount: (group?.hatmSoni ?? 0) + 1,
          timestamp: new Date(),
        });
      }

      return { hatmCompleted };
    });
  }
}
