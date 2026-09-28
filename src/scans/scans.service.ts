import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateScanDto } from './dto/create-scan.dto';

// Radio en metros dentro del cual se acepta un escaneo. Configurable por .env
// para poder aflojarlo en pruebas de campo sin recompilar.
const RADIO_ESCANEO_METROS = Number(process.env.SCAN_RADIUS_METERS ?? 50);

// Los mensajes de error los muestra la app tal cual: fechas legibles, no ISO.
const fechaLegible = (fecha: Date) =>
  fecha.toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Bogota' });

export interface EscaneoRegistrado {
  id: string;
  pointsEarned: number;
  scannedAt: Date;
  distanciaMetros: number;
  totalPoints: number;
  tag: {
    id: string;
    code: string;
    name: string;
    cardTitle: string | null;
    cardImageUrl: string | null;
    cardFunFact: string | null;
  };
}

@Injectable()
export class ScansService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateScanDto): Promise<EscaneoRegistrado> {
    const tag = await this.prisma.nfcTag.findUnique({ where: { code: dto.code } });

    if (!tag) {
      throw new NotFoundException(`No existe un tag con el código ${dto.code}.`);
    }

    await this.validarEventoVigente(tag.eventId);

    // Un tag da puntos una sola vez por jugador
    const previo = await this.prisma.scansHistory.findFirst({
      where: { userId, tagId: tag.id },
    });

    if (previo) {
      throw new ConflictException(
        `Ya habías escaneado "${tag.name}" el ${fechaLegible(previo.scannedAt)}`,
      );
    }

    const distanciaMetros = await this.calcularDistancia(
      tag.id,
      dto.latitude,
      dto.longitude,
    );

    if (distanciaMetros > RADIO_ESCANEO_METROS) {
      throw new BadRequestException(
        `Estás a ${Math.round(distanciaMetros)} m del tag. Debes acercarte a menos de ${RADIO_ESCANEO_METROS} m.`,
      );
    }

    // El insert del escaneo y la suma de puntos van juntos o no van
    const registrar = () => this.prisma.$transaction(async (tx) => {
      const filas = await tx.$queryRaw<{ id: string; scannedAt: Date }[]>`
        INSERT INTO scans_history (id, user_id, tag_id, user_location, points_earned)
        VALUES (
          gen_random_uuid(),
          ${userId}::uuid,
          ${tag.id}::uuid,
          ST_SetSRID(ST_MakePoint(${dto.longitude}, ${dto.latitude}), 4326)::geography,
          ${tag.pointsReward}
        )
        RETURNING id, scanned_at AS "scannedAt"
      `;

      const usuario = await tx.user.update({
        where: { id: userId },
        data: { totalPoints: { increment: tag.pointsReward } },
        select: { totalPoints: true },
      });

      return { escaneo: filas[0], totalPoints: usuario.totalPoints };
    });

    // La consulta de duplicados de arriba no protege de dos escaneos que
    // lleguen a la vez: el indice unico (user_id, tag_id) es el que decide.
    // Al venir de un $queryRaw, la violacion llega como P2010 con el codigo
    // 23505 de Postgres adentro (no como el P2002 del cliente tipado).
    let resultado: Awaited<ReturnType<typeof registrar>>;
    try {
      resultado = await registrar();
    } catch (error) {
      if (this.esViolacionDeUnicidad(error)) {
        throw new ConflictException(`Ya habías escaneado "${tag.name}".`);
      }
      throw error;
    }

    return {
      id: resultado.escaneo.id,
      pointsEarned: tag.pointsReward,
      scannedAt: resultado.escaneo.scannedAt,
      distanciaMetros: Math.round(distanciaMetros * 100) / 100,
      totalPoints: resultado.totalPoints,
      tag: {
        id: tag.id,
        code: tag.code,
        name: tag.name,
        cardTitle: tag.cardTitle,
        cardImageUrl: tag.cardImageUrl,
        cardFunFact: tag.cardFunFact,
      },
    };
  }

  // Historial del jugador autenticado: su álbum de cartas
  findMine(userId: string) {
    return this.prisma.scansHistory.findMany({
      where: { userId },
      orderBy: { scannedAt: 'desc' },
      select: {
        id: true,
        pointsEarned: true,
        scannedAt: true,
        tag: {
          select: {
            id: true,
            code: true,
            name: true,
            cardTitle: true,
            cardImageUrl: true,
            cardFunFact: true,
          },
        },
      },
    });
  }

  // Vista de administración: todos los escaneos, con el jugador que los hizo
  findAll(userId?: string, tagId?: string) {
    return this.prisma.scansHistory.findMany({
      where: {
        ...(userId !== undefined && { userId }),
        ...(tagId !== undefined && { tagId }),
      },
      orderBy: { scannedAt: 'desc' },
      select: {
        id: true,
        pointsEarned: true,
        scannedAt: true,
        user: { select: { id: true, nickname: true, totalPoints: true } },
        tag: { select: { id: true, code: true, name: true } },
      },
    });
  }

  private esViolacionDeUnicidad(error: unknown): boolean {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
      return false;
    }

    if (error.code === 'P2002') {
      return true;
    }

    const codigoPostgres = (error.meta as { code?: string } | undefined)?.code;
    return error.code === 'P2010' && codigoPostgres === '23505';
  }

  private async calcularDistancia(
    tagId: string,
    latitude: number,
    longitude: number,
  ): Promise<number> {
    const filas = await this.prisma.$queryRaw<{ distancia: number }[]>`
      SELECT ST_Distance(
        location,
        ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography
      ) AS distancia
      FROM nfc_tags
      WHERE id = ${tagId}::uuid
    `;

    return Number(filas[0].distancia);
  }

  private async validarEventoVigente(eventId: number | null) {
    if (eventId === null) {
      return;
    }

    const evento = await this.prisma.event.findUnique({ where: { id: eventId } });

    if (!evento) {
      return;
    }

    if (!evento.isActive) {
      throw new BadRequestException(`El evento "${evento.name}" no está activo.`);
    }

    const ahora = new Date();
    if (ahora < evento.startDate || ahora > evento.endDate) {
      throw new BadRequestException(
        `El evento "${evento.name}" está fuera de fechas: va del ${fechaLegible(evento.startDate)} al ${fechaLegible(evento.endDate)}`,
      );
    }
  }
}
