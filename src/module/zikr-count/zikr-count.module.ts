import { Module } from '@nestjs/common';
import { PrismaService } from '@prisma';
import { ZikrCountsController } from './zikr-count.controller';
import { ZikrCountsService } from './zikr-count.service';
import { JwtService } from '@nestjs/jwt';
import { WebsocketModule } from '../websocket/websocket.module';

@Module({
  imports: [WebsocketModule],
  controllers: [ZikrCountsController],
  providers: [ZikrCountsService, PrismaService,JwtService],
})
export class ZikrCountsModule {}
