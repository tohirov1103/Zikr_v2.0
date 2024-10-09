import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@prisma';
import { BookedPoralar } from '@prisma/client';
import { CreateBookedPoralarDto, UpdateBookedPoralarDto } from './dto';

@Injectable()
export class BookedPoralarService {
  constructor(private readonly prisma: PrismaService) {}

  async createBookedPoralar(createBookedPoralarDto: CreateBookedPoralarDto, userId: string): Promise<BookedPoralar> {
    return this.prisma.bookedPoralar.create({
      data: {
        ...createBookedPoralarDto,
      },
    });
  }

  async updateBookedPoralar(id: string, updateBookedPoralarDto: UpdateBookedPoralarDto, userId: string): Promise<BookedPoralar> {
    const bookedPoralar = await this.prisma.bookedPoralar.findUnique({ where: { id } });

    if (!bookedPoralar) {
      throw new NotFoundException('BookedPoralar not found');
    }

    // Only the user who booked the pora can update the booking status
    if (bookedPoralar.userId !== userId) {
      throw new ForbiddenException('You are not authorized to update this booking');
    }

    return this.prisma.bookedPoralar.update({
      where: { id },
      data: updateBookedPoralarDto,
    });
  }

  async getBookedPoralarById(id: string): Promise<BookedPoralar> {
    const bookedPoralar = await this.prisma.bookedPoralar.findUnique({ where: { id } });

    if (!bookedPoralar) {
      throw new NotFoundException('BookedPoralar not found');
    }

    return bookedPoralar;
  }

  async getAllBookedPoralar(): Promise<BookedPoralar[]> {
    return this.prisma.bookedPoralar.findMany();
  }

  async deleteBookedPoralar(id: string, userId: string): Promise<void> {
    const bookedPoralar = await this.prisma.bookedPoralar.findUnique({ where: { id } });

    if (!bookedPoralar) {
      throw new NotFoundException('BookedPoralar not found');
    }

    // Check if the user is the one who booked the pora
    if (bookedPoralar.userId === userId) {
      await this.prisma.bookedPoralar.delete({
        where: { id },
      });
      return;
    }

    // Check if the user is a GroupAdmin for the group associated with this booking
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
      await this.prisma.bookedPoralar.delete({
        where: { id },
      });
    } else {
      throw new ForbiddenException('You are not authorized to delete this booking');
    }
  }
}
