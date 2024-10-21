// src/module/poralar/poralar.module.ts
import { Module } from '@nestjs/common';
import { PoralarService } from './poralar.service';
import { PoralarController } from './poralar.controller';
import { PrismaService } from '@prisma';
import { JwtService } from '@nestjs/jwt';

@Module({
  controllers: [PoralarController],
  providers: [PoralarService, PrismaService, JwtService],
})
export class PoralarModule {}
