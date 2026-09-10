import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    // se conecta al postgress al arrancar el proyecto
    await this.$connect();
  }

  async onModuleDestroy() {
    // se desconecta del postgress al cerrar el proyecto
    await this.$disconnect();
  }
}