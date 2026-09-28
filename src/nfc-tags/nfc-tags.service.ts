import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateNfcTagDto } from './dto/create-nfc-tag.dto';
import { UpdateNfcTagDto } from './dto/update-nfc-tag.dto';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class NfcTagsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createNfcTagDto: CreateNfcTagDto) {
    const id = crypto.randomUUID(); // Generamos el UUID para el ID
    const {
      code, name, description, pointsReward, latitude, longitude,
      isHidden, clueText, cardTitle, cardImageUrl, cardFunFact, eventId
    } = createNfcTagDto;

    // Ejecutamos SQL crudo para poder guardar la latitud y longitud correctamente
    const result = await this.prisma.$queryRaw<any[]>`
      INSERT INTO "nfc_tags" (
        "id", "code", "name", "description", "points_reward", 
        "location", "is_hidden", "clue_text", "card_title", 
        "card_image_url", "card_fun_fact", "event_id", "created_at"
      ) VALUES (
        ${id}::uuid, ${code}, ${name}, ${description ?? null}, ${pointsReward ?? 10},
        ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography, 
        ${isHidden ?? false}, ${clueText ?? null}, ${cardTitle ?? null}, 
        ${cardImageUrl ?? null}, ${cardFunFact ?? null}, ${eventId ?? null}, NOW()
      ) RETURNING id, code, name;
    `;
    
    return result[0];
  }

  async findAll(eventId?: number) {
    // Al pedir los datos, convertimos la ubicación binaria a texto para poder leerla
    return this.prisma.$queryRaw`
      SELECT id, code, name, description, points_reward,
             ST_X(location::geometry) as longitude, ST_Y(location::geometry) as latitude,
             is_hidden, clue_text, card_title, card_image_url, card_fun_fact, event_id
      FROM "nfc_tags"
      WHERE (${eventId ?? null}::int IS NULL OR event_id = ${eventId ?? null}::int)
    `;
  }

  async findOne(id: string) {
    const result: any = await this.prisma.$queryRaw`
      SELECT id, code, name, description, points_reward,
             ST_X(location::geometry) as longitude, ST_Y(location::geometry) as latitude,
             is_hidden, clue_text, card_title, card_image_url, card_fun_fact, event_id
      FROM "nfc_tags" WHERE id = ${id}::uuid
    `;

    if (!result || result.length === 0) {
      throw new NotFoundException(`NfcTag con ID ${id} no encontrado`);
    }
    return result[0];
  }

  // Vista del jugador: lo que puede saber de un tag sin haberlo encontrado.
  // - Los ocultos llegan sin coordenadas: solo con la pista.
  // - Nunca llega el código: es lo que se lee de la etiqueta física, y con él
  //   se podría registrar el escaneo sin haber ido.
  // - La carta es la recompensa: se revela cuando el jugador ya lo encontró.
  async findAllForPlayer(userId: string, eventId?: number) {
    return this.prisma.$queryRaw`
      SELECT t.id, t.name, t.description, t.points_reward,
             CASE WHEN t.is_hidden THEN NULL ELSE ST_X(t.location::geometry) END AS longitude,
             CASE WHEN t.is_hidden THEN NULL ELSE ST_Y(t.location::geometry) END AS latitude,
             t.is_hidden, t.clue_text, t.event_id,
             (s.id IS NOT NULL) AS found_by_me,
             s.scanned_at AS found_at,
             CASE WHEN s.id IS NULL THEN NULL ELSE t.card_title END AS card_title,
             CASE WHEN s.id IS NULL THEN NULL ELSE t.card_image_url END AS card_image_url,
             CASE WHEN s.id IS NULL THEN NULL ELSE t.card_fun_fact END AS card_fun_fact
      FROM "nfc_tags" t
      LEFT JOIN "scans_history" s ON s.tag_id = t.id AND s.user_id = ${userId}::uuid
      WHERE (${eventId ?? null}::int IS NULL OR t.event_id = ${eventId ?? null}::int)
      ORDER BY t.created_at
    `;
  }

  async findOneForPlayer(id: string, userId: string) {
    const rows = await this.prisma.$queryRaw<any[]>`
      SELECT t.id, t.name, t.description, t.points_reward,
             CASE WHEN t.is_hidden THEN NULL ELSE ST_X(t.location::geometry) END AS longitude,
             CASE WHEN t.is_hidden THEN NULL ELSE ST_Y(t.location::geometry) END AS latitude,
             t.is_hidden, t.clue_text, t.event_id,
             (s.id IS NOT NULL) AS found_by_me,
             s.scanned_at AS found_at,
             CASE WHEN s.id IS NULL THEN NULL ELSE t.card_title END AS card_title,
             CASE WHEN s.id IS NULL THEN NULL ELSE t.card_image_url END AS card_image_url,
             CASE WHEN s.id IS NULL THEN NULL ELSE t.card_fun_fact END AS card_fun_fact
      FROM "nfc_tags" t
      LEFT JOIN "scans_history" s ON s.tag_id = t.id AND s.user_id = ${userId}::uuid
      WHERE t.id = ${id}::uuid
    `;

    if (rows.length === 0) {
      throw new NotFoundException(`NfcTag con ID ${id} no encontrado`);
    }
    return rows[0];
  }

  // Para el update y remove, te dejo la estructura básica que luego podemos hacer Raw si se actualizan coordenadas
  remove(id: string) {
    return this.prisma.$executeRaw`DELETE FROM "nfc_tags" WHERE id = ${id}::uuid`;
  }

  async update(id: string, updateNfcTagDto: UpdateNfcTagDto) {
    const currentTag = await this.findOne(id);

    const code = updateNfcTagDto.code ?? currentTag.code;
    const name = updateNfcTagDto.name ?? currentTag.name;
    const description = updateNfcTagDto.description !== undefined ? updateNfcTagDto.description : currentTag.description;
    const pointsReward = updateNfcTagDto.pointsReward ?? currentTag.points_reward;
    const isHidden = updateNfcTagDto.isHidden ?? currentTag.is_hidden;
    const clueText = updateNfcTagDto.clueText !== undefined ? updateNfcTagDto.clueText : currentTag.clue_text;
    const cardTitle = updateNfcTagDto.cardTitle !== undefined ? updateNfcTagDto.cardTitle : currentTag.card_title;
    const cardImageUrl = updateNfcTagDto.cardImageUrl !== undefined ? updateNfcTagDto.cardImageUrl : currentTag.card_image_url;
    const cardFunFact = updateNfcTagDto.cardFunFact !== undefined ? updateNfcTagDto.cardFunFact : currentTag.card_fun_fact;
    const eventId = updateNfcTagDto.eventId !== undefined ? updateNfcTagDto.eventId : currentTag.event_id;
    
    const latitude = updateNfcTagDto.latitude ?? currentTag.latitude;
    const longitude = updateNfcTagDto.longitude ?? currentTag.longitude;

    const result = await this.prisma.$queryRaw<any[]>`
      UPDATE "nfc_tags" SET
        "code" = ${code},
        "name" = ${name},
        "description" = ${description},
        "points_reward" = ${pointsReward},
        "location" = ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography,
        "is_hidden" = ${isHidden},
        "clue_text" = ${clueText},
        "card_title" = ${cardTitle},
        "card_image_url" = ${cardImageUrl},
        "card_fun_fact" = ${cardFunFact},
        "event_id" = ${eventId}
      WHERE "id" = ${id}::uuid
      RETURNING id, code, name;
    `;

    return result[0];
  }
  
}