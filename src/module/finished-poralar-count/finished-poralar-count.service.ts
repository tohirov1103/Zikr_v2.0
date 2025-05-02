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

  async createFinishedPoralarCount(
    createFinishedPoralarCountDto: CreateFinishedPoralarCountDto,
    userId: string,
  ): Promise<FinishedPoralarCount> {
    // Check if the user is part of the group
    const isMember = await this.prisma.groupMembers.findFirst({
      where: {
        group_id: createFinishedPoralarCountDto.idGroup,
        user_id: userId,
      },
    });

    if (!isMember) {
      throw new ForbiddenException('You are not a member of this group');
    }

    return this.prisma.finishedPoralarCount.create({
      data: {
        ...createFinishedPoralarCountDto,
      },
    });
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

    // Check if the user is a member of the group
    const isMember = await this.prisma.groupMembers.findFirst({
      where: {
        group_id: finishedPoralarCount.idGroup,
        user_id: userId,
      },
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
    const finishedPoralarCount = await this.prisma.finishedPoralarCount.findUnique({
      where: { id },
    });
  
    if (!finishedPoralarCount) {
      throw new NotFoundException('Finished Poralar Count not found');
    }
  
    // Check if the user is a member of the group
    const isMember = await this.prisma.groupMembers.findFirst({
      where: {
        group_id: finishedPoralarCount.idGroup,
        user_id: userId,
      },
    });
  
    if (!isMember) {
      throw new ForbiddenException('You are not authorized to delete this finished poralar count');
    }
  
    await this.prisma.finishedPoralarCount.delete({
      where: { id },
    });
  }

  // Method to finish a Juz and update counts
  // async finishJuz(poraId: string, userId: string, idGroup: string): Promise<{ hatmCompleted: boolean }> {
  //   return this.prisma.$transaction(async (prisma) => {
  //     // Step 1: Mark the Pora as done
  //     const bookedPora = await prisma.bookedPoralar.updateMany({
  //       where: {
  //         poraId,
  //         userId,
  //         idGroup,
  //         isBooked: true,
  //         isDone: false, // Only update if it's not done
  //       },
  //       data: {
  //         isDone: true, // Mark as done
  //       },
  //     });

  //     // If no rows were updated, throw an error
  //     if (bookedPora.count === 0) {
  //       throw new NotFoundException(`No active booking found for ${poraId} with user ID ${userId} in group ID ${idGroup}`);
  //     }

  //     // Step 2: Increment the finished Juz count
  //     await prisma.finishedPoralarCount.updateMany({
  //       where: { idGroup },
  //       data: {
  //         juzCount: { increment: 1 },
  //       },
  //     });

  //     // Step 3: Get the Quran goal for the group
  //     const groupGoal = await prisma.zikr.findFirst({
  //       where: {
  //         groupId: idGroup,
  //         goal: { not: null }, // Assuming it's Quran if the goal is present
  //       },
  //       select: {
  //         goal: true,
  //       },
  //     });

  //     if (!groupGoal) {
  //       throw new NotFoundException('No Quran goal found for this group');
  //     }

  //     const quranGoal = groupGoal.goal;

  //     // Step 4: Fetch the current juzCount
  //     const finishedCount = await prisma.finishedPoralarCount.findFirst({
  //       where: { idGroup },
  //       select: {
  //         juzCount: true,
  //       },
  //     });

  //     if (!finishedCount) {
  //       throw new NotFoundException('Finished count not found');
  //     }

  //     const { juzCount } = finishedCount;

  //     // Step 5: If the finished count reaches the goal, reset and increment the hatm count
  //     let hatmCompleted = false;
  //     if (juzCount >= quranGoal) {
  //       await prisma.finishedPoralarCount.updateMany({
  //         where: { idGroup },
  //         data: {
  //           juzCount: 0, // Reset the count
  //         },
  //       });

  //       // Increment the hatmSoni for the group
  //       await prisma.group.update({
  //         where: { idGroup },
  //         data: {
  //           hatmSoni: { increment: 1 },
  //         },
  //       });

  //       hatmCompleted = true;
  //     }

  //     return { hatmCompleted };
  //   });
  // }

  async finishJuz(poraId: string, userId: string, idGroup: string): Promise<{ hatmCompleted: boolean }> {
    return this.prisma.$transaction(async (prisma) => {
      // Step 1: Mark the Pora as done
      const bookedPora = await prisma.bookedPoralar.updateMany({
        where: {
          poraId,
          userId,
          idGroup,
          isBooked: true,
          isDone: false, // Only update if it's not done
        },
        data: {
          isDone: true, // Mark as done
        },
      });

      // If no rows were updated, throw an error
      if (bookedPora.count === 0) {
        throw new NotFoundException(`No active booking found for ${poraId} with user ID ${userId} in group ID ${idGroup}`);
      }

      // Step 2: Increment the finished Juz count
      await prisma.finishedPoralarCount.updateMany({
        where: { idGroup },
        data: {
          juzCount: { increment: 1 },
        },
      });

      // Step 3: Get the Quran goal for the group
      const groupGoal = await prisma.zikr.findFirst({
        where: {
          groupId: idGroup,
          goal: { not: null }, // Assuming it's Quran if the goal is present
        },
        select: {
          goal: true,
        },
      });

      if (!groupGoal) {
        throw new NotFoundException('No Quran goal found for this group');
      }

      const quranGoal = groupGoal.goal;

      // Step 4: Fetch the current juzCount
      const finishedCount = await prisma.finishedPoralarCount.findFirst({
        where: { idGroup },
        select: {
          juzCount: true,
        },
      });

      if (!finishedCount) {
        throw new NotFoundException('Finished count not found');
      }

      const { juzCount } = finishedCount;

      // Step 5: If the finished count reaches the goal, reset and increment the hatm count
      let hatmCompleted = false;
      if (juzCount >= quranGoal) {
        await prisma.finishedPoralarCount.updateMany({
          where: { idGroup },
          data: {
            juzCount: 0, // Reset the count
          },
        });

        // Increment the hatmSoni for the group
        await prisma.group.update({
          where: { idGroup },
          data: {
            hatmSoni: { increment: 1 },
          },
        });

        hatmCompleted = true;
      }

      // Get additional information for WebSocket notification
      const user = await prisma.user.findUnique({
        where: { userId },
        select: { name: true, surname: true }
      });

      const pora = await prisma.poralar.findUnique({
        where: { id: poraId },
        select: { name: true }
      });

      const group = await prisma.group.findUnique({
        where: { idGroup },
        select: { name: true }
      });

      // Send WebSocket notification
      this.websocketGateway.server.to(`group:${idGroup}`).emit('pora_completed', {
        poraId,
        poraName: pora?.name,
        groupId: idGroup,
        groupName: group?.name,
        userId,
        userName: `${user?.name} ${user?.surname}`,
        totalFinished: hatmCompleted ? 0 : juzCount,
        hatmCompleted,
        timestamp: new Date()
      });

      if (hatmCompleted) {
        // Send special hatm completed notification
        this.websocketGateway.server.to(`group:${idGroup}`).emit('hatm_completed', {
          groupId: idGroup,
          groupName: group?.name,
          hatmCount: (await prisma.group.findUnique({
            where: { idGroup },
            select: { hatmSoni: true }
          }))?.hatmSoni,
          timestamp: new Date()
        });
      }

      return { hatmCompleted };
    });
  }

}
