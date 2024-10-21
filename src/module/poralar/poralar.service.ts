// src/module/poralar/poralar.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@prisma';
import { CreatePoraDto, UpdatePoraDto } from './dto';

@Injectable()
export class PoralarService {
  constructor(private readonly prisma: PrismaService) {}

  // Create a new pora
  async create(createPoraDto: CreatePoraDto) {
    return await this.prisma.poralar.create({
      data: { ...createPoraDto },
    });
  }

  async getPoralarWithBookingStatusForGroup(groupId: string): Promise<any[]> {
    // Step 1: Fetch all Poralar (30 Juz)
    const poralar = await this.prisma.poralar.findMany({
      orderBy: { created_at: 'asc' },
    });

    // Step 2: Fetch all booked poralar for the group
    const bookedPoralar = await this.prisma.bookedPoralar.findMany({
      where: {
        idGroup: groupId,
      },
    });

    // Step 3: Map through poralar and check if they are booked
    const poralarWithStatus = poralar.map((pora) => {
      const isBooked = bookedPoralar.find(
        (bookedPora) => bookedPora.poraId === pora.id
      );

      return {
        poraId: pora.id,
        poraName: pora.name,
        isBooked: !!isBooked, // true if booked, false if not
        bookedBy: isBooked ? isBooked.userId : null, // who booked the pora
      };
    });

    return poralarWithStatus;
  }

  // Find all poralar
  async findAll() {
    return await this.prisma.poralar.findMany();
  }

  // Find a pora by ID
  async findOne(id: string) {
    const pora = await this.prisma.poralar.findUnique({ where: { id } });
    if (!pora) {
      throw new NotFoundException(`Pora with ID ${id} not found`);
    }
    return pora;
  }

  // Update a pora by ID
  async update(id: string, updatePoraDto: UpdatePoraDto) {
    const pora = await this.findOne(id); // Ensure the pora exists
    return this.prisma.poralar.update({
      where: { id },
      data: { ...updatePoraDto },
    });
  }

  // Delete a pora by ID
  async remove(id: string) {
    const pora = await this.findOne(id); // Ensure the pora exists
    return this.prisma.poralar.delete({ where: { id } });
  }
}
