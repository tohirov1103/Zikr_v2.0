import { Module } from '@nestjs/common';
import { ZikrService } from './zikr.service';
import { ZikrController } from './zikr.controller';
import { PrismaService } from '@prisma';
import { JwtService } from '@nestjs/jwt';

@Module({
  controllers: [ZikrController],
  providers: [ZikrService, PrismaService ,JwtService],
})
export class ZikrModule {}
