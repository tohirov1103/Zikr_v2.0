import { Module } from '@nestjs/common';
import { ZikrGroupService } from './zikr-group.service';
import { ZikrGroupController } from './zikr-group.controller';
import { PrismaService } from '@prisma';
import { JwtService } from '@nestjs/jwt';

@Module({
  controllers: [ZikrGroupController],
  providers: [ZikrGroupService, PrismaService, JwtService],
})
export class ZikrGroupModule {}
