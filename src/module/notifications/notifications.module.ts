import { Module } from '@nestjs/common';
import { PrismaService } from '@prisma';
import { NotificationController } from './notifications.controller';
import { NotificationService } from './notifications.service';
import { JwtService } from '@nestjs/jwt';

@Module({
  controllers: [NotificationController],
  providers: [NotificationService, PrismaService, JwtService],
})
export class NotificationModule {}
