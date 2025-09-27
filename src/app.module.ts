import { OrderModule } from './modules/oder/oder.module';
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { mongoAsyncConfig } from './config/db.config.ts';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { NotificationModule } from './modules/notication/notification.module';
import { AppGateway } from './app.gateway';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ChatModule } from './modules/chat/chat.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      useFactory: mongoAsyncConfig,
    }),
    AuthModule,
    UserModule,
    NotificationModule,
    OrderModule,
    ChatModule,
    EventEmitterModule.forRoot(),
  ],
  controllers: [AppController],
  providers: [AppService, AppGateway],
})
export class AppModule {}
