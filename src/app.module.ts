import { Module } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { EventsModule } from './events/events.module';
import { NfcTagsModule } from './nfc-tags/nfc-tags.module';
import { ScansModule } from './scans/scans.module';
import { ChatModule } from './chat/chat.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UsersModule,
    EventsModule,
    NfcTagsModule,
    ScansModule,
    ChatModule,
  ],

  providers: [PrismaService],
})
export class AppModule {}
