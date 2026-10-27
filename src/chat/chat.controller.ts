import { Controller, Delete, Get, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';

// Lo que no es tiempo real: salas, historial y moderación.
// Los mensajes nuevos se envían y reciben por el socket (ver ChatGateway).
@ApiTags('Chat')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('chat')
export class ChatController {
  constructor(
    private readonly chat: ChatService,
    private readonly gateway: ChatGateway,
  ) {}

  @ApiOperation({ summary: 'Salas disponibles: general y una por evento activo' })
  @Get('rooms')
  listRooms() {
    return this.chat.listRooms();
  }

  @ApiOperation({ summary: 'Historial de una sala, del más nuevo al más viejo' })
  @ApiQuery({ name: 'before', required: false, description: 'Fecha ISO: trae los mensajes anteriores a ella' })
  @Get(':room/messages')
  history(@Param('room') room: string, @Query('before') before?: string) {
    const antes = before ? new Date(before) : undefined;
    return this.chat.history(room, antes && !Number.isNaN(antes.getTime()) ? antes : undefined);
  }

  @ApiOperation({ summary: 'Borrar un mensaje (moderación)' })
  @Roles('ADMIN')
  @Delete('messages/:id')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    const borrado = await this.chat.remove(id);
    this.gateway.notificarBorrado(borrado.id, borrado.room);
    return borrado;
  }
}
