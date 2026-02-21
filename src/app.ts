import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '@prisma'
import { AuthModule, UploadModule, UsersModule } from '@module'
import { AppConfig, DbConfig, JwtConfig, MailConfig, R2Config, SwaggerConfig } from '@config';
import { CacheModule } from '@nestjs/cache-manager';
import { GroupModule } from './module/group/group.module';
import { NotificationModule } from './module/notifications/notifications.module';
import { ZikrModule } from './module/zikr/zikr.module';
import { ZikrCountsModule } from './module/zikr-count/zikr-count.module';
import { BookedPoralarModule } from './module/booked-poralar/booked-poralar.module';
import { FinishedPoralarCountModule } from './module/finished-poralar-count/finished-poralar-count.module';
import { PoralarModule } from './module/poralar/poralar.module';
import { WebsocketModule } from './module/websocket/websocket.module';
import { HealthModule } from './module/health/health.module';
import { QuranGroupModule } from './module/quran-group/quran-group.module';
import { ZikrGroupModule } from './module/zikr-group/zikr-group.module';

@Module({
  imports: [
    CacheModule.register({
      ttl: 300000,
      isGlobal: true,
    }),
    ConfigModule.forRoot({
      load: [
        AppConfig,
        DbConfig,
        JwtConfig,
        R2Config,
        SwaggerConfig,
        MailConfig
      ],
      isGlobal: true
    }),
    UploadModule,
    AuthModule,
    UsersModule,
    PrismaModule,
    GroupModule,
    NotificationModule,
    ZikrModule,
    ZikrCountsModule,
    BookedPoralarModule,
    FinishedPoralarCountModule,
    PoralarModule,
    WebsocketModule,
    HealthModule,
    QuranGroupModule,
    ZikrGroupModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule { }
