import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
// 👇 Importamos el módulo de autenticación
import { AuthModule } from '../auth/auth.module'; 
import { PassportModule } from '@nestjs/passport';

@Module({
  // 👇 Lo inyectamos en los imports de este módulo
  imports: [AuthModule, PassportModule],  
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}