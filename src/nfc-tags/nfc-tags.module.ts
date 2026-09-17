import { Module } from '@nestjs/common';
import { NfcTagsService } from './nfc-tags.service';
import { NfcTagsController } from './nfc-tags.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],  
  controllers: [NfcTagsController],
  providers: [NfcTagsService],
})
export class NfcTagsModule {}