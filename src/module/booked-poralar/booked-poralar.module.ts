import { Module } from '@nestjs/common';
import { BookedPoralarService } from './booked-poralar.service';
import { BookedPoralarController } from './booked-poralar.controller';
import { PrismaService } from '@prisma';
import { JwtService } from '@nestjs/jwt';

@Module({
  controllers: [BookedPoralarController],
  providers: [BookedPoralarService, PrismaService,JwtService],
})
export class BookedPoralarModule {}
