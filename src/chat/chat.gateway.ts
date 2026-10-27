import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import type { Namespace, Socket } from 'socket.io';
import { PrismaService } from '../prisma/prisma.service';
import { ChatService } from './chat.service';

interface UsuarioSocket {
  id: string;
  role: string;
}

// Respuesta (ack) de cada evento: el cliente sabe si su acción pasó y por qué no
type Ack<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };

const mensajeDeError = (error: unknown) =>
  error instanceof Error ? error.message : 'No se pudo completar la acción.';

// Chat en vivo sobre socket.io, en el namespace /chat.
// La conexión se autentica con el mismo JWT del API (handshake.auth.token).
// Eventos del cliente: join, leave, send. Eventos del servidor: message, deleted.
@WebSocketGateway({ namespace: '/chat', cors: { origin: '*' } })
export class ChatGateway implements OnGatewayConnection {
  @WebSocketServer()
  server!: Namespace;

  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    private readonly chat: ChatService,
  ) {}

  async handleConnection(socket: Socket) {
    try {
      const payload = this.jwt.verify<{ sub: string }>(socket.handshake.auth?.token);
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, role: true },
      });
      if (!user) {
        throw new Error('Usuario no encontrado');
      }
      socket.data.user = user satisfies UsuarioSocket;
    } catch {
      socket.emit('session_error', { message: 'Tu sesión no es válida. Vuelve a ingresar.' });
      socket.disconnect(true);
    }
  }

  @SubscribeMessage('join')
  async join(@ConnectedSocket() socket: Socket, @MessageBody() body: { room?: string }): Promise<Ack> {
    try {
      const sala = await this.chat.validarSala(body?.room);
      await socket.join(sala);
      return { ok: true };
    } catch (error) {
      return { ok: false, error: mensajeDeError(error) };
    }
  }

  @SubscribeMessage('leave')
  async leave(@ConnectedSocket() socket: Socket, @MessageBody() body: { room?: string }): Promise<Ack> {
    if (typeof body?.room === 'string') {
      await socket.leave(body.room);
    }
    return { ok: true };
  }

  @SubscribeMessage('send')
  async send(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: { room?: string; content?: string },
  ): Promise<Ack<unknown>> {
    try {
      const usuario = socket.data.user as UsuarioSocket;
      const mensaje = await this.chat.send(usuario.id, body?.room, body?.content);
      // A toda la sala, incluido quien lo envió: así todos lo ven igual
      this.server.to(mensaje.room).emit('message', mensaje);
      return { ok: true, data: mensaje };
    } catch (error) {
      return { ok: false, error: mensajeDeError(error) };
    }
  }

  // Lo usa ChatController al moderar, para que el mensaje desaparezca en vivo
  notificarBorrado(id: string, room: string) {
    this.server.to(room).emit('deleted', { id, room });
  }
}
