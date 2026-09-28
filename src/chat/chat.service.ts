import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export const SALA_GENERAL = 'general';
const LARGO_MAXIMO = 500;
// Un mensaje por segundo por usuario: suficiente para conversar, corta el spam
const ESPERA_ENTRE_MENSAJES_MS = 1000;

// Lo que viaja de cada mensaje: el autor con lo necesario para pintarlo
const SELECCION_MENSAJE = {
  id: true,
  room: true,
  content: true,
  createdAt: true,
  user: { select: { id: true, nickname: true, avatarUrl: true, role: true } },
} as const;

@Injectable()
export class ChatService {
  private ultimoMensaje = new Map<string, number>();

  constructor(private readonly prisma: PrismaService) {}

  // Salas disponibles: la general y una por cada evento activo que no haya terminado
  async listRooms() {
    const eventos = await this.prisma.event.findMany({
      where: { isActive: true, endDate: { gte: new Date() } },
      orderBy: { startDate: 'asc' },
      select: { id: true, name: true, startDate: true, endDate: true },
    });

    return [
      { room: SALA_GENERAL, name: 'General', eventId: null },
      ...eventos.map((evento) => ({ room: `event:${evento.id}`, name: evento.name, eventId: evento.id })),
    ];
  }

  // "general" o "event:<id>" de un evento que exista. Cualquier otra cosa se rechaza
  async validarSala(room: unknown): Promise<string> {
    if (room === SALA_GENERAL) {
      return SALA_GENERAL;
    }

    const coincidencia = typeof room === 'string' ? /^event:(\d+)$/.exec(room) : null;
    if (!coincidencia) {
      throw new BadRequestException('Sala de chat inválida.');
    }

    const evento = await this.prisma.event.findUnique({ where: { id: Number(coincidencia[1]) } });
    if (!evento) {
      throw new NotFoundException('Ese evento ya no existe.');
    }
    return room as string;
  }

  // Del más nuevo al más viejo; `before` pagina hacia atrás
  async history(room: string, before?: Date, limit = 50) {
    const sala = await this.validarSala(room);
    return this.prisma.chatMessage.findMany({
      where: { room: sala, ...(before && { createdAt: { lt: before } }) },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 100),
      select: SELECCION_MENSAJE,
    });
  }

  async send(userId: string, room: unknown, content: unknown) {
    const sala = await this.validarSala(room);
    const texto = typeof content === 'string' ? content.trim() : '';

    if (!texto) {
      throw new BadRequestException('El mensaje está vacío.');
    }
    if (texto.length > LARGO_MAXIMO) {
      throw new BadRequestException(`El mensaje no puede pasar de ${LARGO_MAXIMO} caracteres.`);
    }

    const ahora = Date.now();
    if (ahora - (this.ultimoMensaje.get(userId) ?? 0) < ESPERA_ENTRE_MENSAJES_MS) {
      throw new BadRequestException('Vas muy rápido: espera un segundo entre mensajes.');
    }
    this.ultimoMensaje.set(userId, ahora);

    return this.prisma.chatMessage.create({
      data: { room: sala, userId, content: texto },
      select: SELECCION_MENSAJE,
    });
  }

  // Moderación: solo lo llama un ADMIN (ver ChatController)
  async remove(id: string) {
    const mensaje = await this.prisma.chatMessage.findUnique({ where: { id } });
    if (!mensaje) {
      throw new NotFoundException('El mensaje no existe.');
    }
    await this.prisma.chatMessage.delete({ where: { id } });
    return { id: mensaje.id, room: mensaje.room };
  }
}
