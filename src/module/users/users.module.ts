import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PrismaModule } from '@prisma';
import { JwtService } from '@nestjs/jwt';
import { RolesGuard } from '@common';

@Module({
  imports: [PrismaModule],
  controllers: [UsersController],
  providers: [UsersService, JwtService, RolesGuard],
  exports: [UsersService],
})
export class UsersModule {}
