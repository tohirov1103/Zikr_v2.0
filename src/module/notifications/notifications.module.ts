import { Module } from '@nestjs/common';
import { PrismaModule, PrismaService } from '@prisma';
import { NotificationController } from './notifications.controller';
import { NotificationService } from './notifications.service';
import { JwtService } from '@nestjs/jwt';
import { RolesGuard } from '@common';
import { NotificationsGateway } from './notifications.gateway';

@Module({
  imports: [PrismaModule],
  controllers: [NotificationController],
  providers: [NotificationService, NotificationsGateway, JwtService, RolesGuard],
})
export class NotificationModule {}
