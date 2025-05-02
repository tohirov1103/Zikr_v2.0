// src/module/booked-poralar/booked-poralar.module.ts
import { Module } from '@nestjs/common';
import { BookedPoralarService } from './booked-poralar.service';
import { BookedPoralarController } from './booked-poralar.controller';
import { PrismaService } from '@prisma';
import { JwtService } from '@nestjs/jwt';
import { WebsocketModule } from '../websocket/websocket.module';

@Module({
  imports: [WebsocketModule],
  controllers: [BookedPoralarController],
  providers: [BookedPoralarService, PrismaService, JwtService],
})
export class BookedPoralarModule {}