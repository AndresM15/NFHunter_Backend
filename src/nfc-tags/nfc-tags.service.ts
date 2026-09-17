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

  async findAll() {
    // Al pedir los datos, convertimos la ubicación binaria a texto para poder leerla
    return this.prisma.$queryRaw`
      SELECT id, code, name, description, points_reward,
             ST_X(location::geometry) as longitude, ST_Y(location::geometry) as latitude,
             is_hidden, clue_text, card_title, card_image_url, card_fun_fact, event_id
      FROM "nfc_tags"
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