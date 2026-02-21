import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@prisma';
import { CreateBookedPoralarDto, UpdateBookedPoralarDto } from './dto';
import { WebsocketGateway } from '../websocket/websocket.gateway';

@Injectable()
export class BookedPoralarService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly websocketGateway: WebsocketGateway
  ) {}

  async createBookedPoralar(createBookedPoralarDto: CreateBookedPoralarDto, userId: string) {
    const booking = await this.prisma.bookedPoralar.create({
      data: {
        ...createBookedPoralarDto,
        userId,
        isBooked: true,
        isDone: false,
      },
      include: {
        pora: true,
        user: {
          select: {
            userId: true,
            name: true,
            surname: true,
            image_url: true,
            phone: true,
          },
        },
      },
    });

    this.websocketGateway.server.to(`group:${booking.idGroup}`).emit('pora_booked', {
      bookingId: booking.id,
      poraId: booking.poraId,
      poraName: booking.pora.name,
      groupId: booking.idGroup,
      userId: booking.userId,
      userName: `${booking.user.name} ${booking.user.surname}`,
      timestamp: new Date(),
    });

    return booking;
  }

  async updateBookedPoralar(id: string, updateBookedPoralarDto: UpdateBookedPoralarDto, userId: string) {
    const bookedPoralar = await this.prisma.bookedPoralar.findUnique({
      where: { id },
      include: { pora: true },
    });

    if (!bookedPoralar) {
      throw new NotFoundException('BookedPoralar not found');
    }

    if (bookedPoralar.userId !== userId) {
      throw new ForbiddenException('You are not authorized to update this booking');
    }

    const updatedBooking = await this.prisma.bookedPoralar.update({
      where: { id },
      data: updateBookedPoralarDto,
    });

    if (updateBookedPoralarDto.isDone === true && bookedPoralar.isDone === false) {
      const finishedCount = await this.prisma.finishedPoralarCount.findFirst({
        where: { idGroup: bookedPoralar.idGroup },
      });

      const user = await this.prisma.user.findUnique({
        where: { userId },
        select: { name: true, surname: true },
      });

      const group = await this.prisma.group.findUnique({
        where: { idGroup: bookedPoralar.idGroup },
        select: { name: true },
      });

      this.websocketGateway.server.to(`group:${bookedPoralar.idGroup}`).emit('pora_completed', {
        bookingId: bookedPoralar.id,
        poraId: bookedPoralar.poraId,
        poraName: bookedPoralar.pora.name,
        groupId: bookedPoralar.idGroup,
        groupName: group?.name,
        userId,
        userName: `${user?.name} ${user?.surname}`,
        totalFinished: finishedCount?.juzCount || 0,
        hatmCompleted: false,
        timestamp: new Date(),
      });
    }

    return updatedBooking;
  }

  async getBookedPoralarById(id: string) {
    const bookedPoralar = await this.prisma.bookedPoralar.findUnique({
      where: { id },
      include: {
        user: { select: { userId: true, name: true, image_url: true, phone: true } },
      },
    });

    if (!bookedPoralar) {
      throw new NotFoundException('BookedPoralar not found');
    }

    return bookedPoralar;
  }

  async getAllBookedPoralar(groupId?: string) {
    return this.prisma.bookedPoralar.findMany({
      where: { idGroup: groupId },
      include: { pora: true },
    });
  }

  async deleteBookedPoralar(id: string, userId: string): Promise<void> {
    const bookedPoralar = await this.prisma.bookedPoralar.findUnique({ where: { id } });

    if (!bookedPoralar) {
      throw new NotFoundException('BookedPoralar not found');
    }

    if (bookedPoralar.userId === userId) {
      await this.prisma.bookedPoralar.delete({ where: { id } });
      return;
    }

    const groupMember = await this.prisma.groupMembers.findUnique({
      where: {
        group_id_user_id: {
          group_id: bookedPoralar.idGroup,
          user_id: userId,
        },
      },
      select: { role: true },
    });

    if (groupMember?.role === 'GroupAdmin') {
      await this.prisma.bookedPoralar.delete({ where: { id } });
    } else {
      throw new ForbiddenException('You are not authorized to delete this booking');
    }
  }
}
