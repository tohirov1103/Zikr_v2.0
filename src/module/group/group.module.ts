import { Module } from '@nestjs/common';
import { GroupService } from './group.service';
import { GroupController } from './group.controller';
import { PrismaModule } from '@prisma';
import { JwtService } from '@nestjs/jwt';
import { WebsocketModule } from '../websocket/websocket.module';

@Module({
  imports: [PrismaModule,WebsocketModule],
  controllers: [GroupController],
  providers: [GroupService,JwtService],
})
export class GroupModule {}
