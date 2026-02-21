import { Module } from '@nestjs/common';
import { QuranGroupService } from './quran-group.service';
import { QuranGroupController } from './quran-group.controller';
import { PrismaService } from '@prisma';
import { JwtService } from '@nestjs/jwt';

@Module({
  controllers: [QuranGroupController],
  providers: [QuranGroupService, PrismaService, JwtService],
})
export class QuranGroupModule {}
