import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { mkdir, unlink, writeFile } from 'fs/promises';
import { join } from 'path';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

// Carpeta servida en /uploads (ver main.ts). En la base se guarda la ruta
// relativa, así la URL no depende de la IP en la que corra el servidor.
export const CARPETA_AVATARES = join(process.cwd(), 'uploads', 'avatars');

export interface PuestoRanking {
  id: string;
  nickname: string;
  avatarUrl: string | null;
  levelTitle: string | null;
  points: number;
  tagsFound: number;
  position: number;
}

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto) {
    // 1. Validar que el email o nickname no existan previamente
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: createUserDto.email }, { nickname: createUserDto.nickname }],
      },
    });

    if (existingUser) {
      throw new ConflictException('El correo o el apodo ya están registrados.');
    }

    // 2. Encriptar la contraseña
    const passwordHash = await bcrypt.hash(createUserDto.password, 10);
    
    // 3. Extraer el password plano para no enviarlo a Prisma y guardar el resto
    const { password, ...userData } = createUserDto;

    const newUser = await this.prisma.user.create({
      data: {
        ...userData,
        passwordHash,
      },
    });

    // 4. Retornar el usuario sin exponer el hash de la contraseña
    return this.sanitizeUser(newUser);
  }

  async findAll() {
    // Retornamos todos los usuarios, pero seleccionamos qué campos mostrar
    // para no filtrar los passwordHash de toda la base de datos por accidente.
    return this.prisma.user.findMany({
      select: {
        id: true,
        nickname: true,
        email: true,
        role: true,
        levelTitle: true,
        totalPoints: true,
        avatarUrl: true,
        createdAt: true,
      },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado.`);
    }

    return this.sanitizeUser(user);
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    // 1. Verificar que el usuario existe antes de actualizar
    await this.findOne(id); 

    // 2. Preparar los datos a actualizar
    const dataToUpdate: any = { ...updateUserDto };

    // 3. Si el admin envió una nueva contraseña, hay que encriptarla
    if (updateUserDto.password) {
      dataToUpdate.passwordHash = await bcrypt.hash(updateUserDto.password, 10);
      delete dataToUpdate.password; // Borramos la clave en texto plano
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: dataToUpdate,
    });

    return this.sanitizeUser(updatedUser);
  }

  async remove(id: string) {
    // Verificar que existe antes de intentar borrar
    await this.findOne(id);

    const deletedUser = await this.prisma.user.delete({
      where: { id },
    });

    return this.sanitizeUser(deletedUser);
  }

  // Perfil del usuario autenticado, con sus números de juego
  async findMe(id: string) {
    const user = await this.findOne(id);
    const tagsFound = await this.prisma.scansHistory.count({ where: { userId: id } });
    const { me } = await this.ranking(id);
    return { ...user, tagsFound, position: me?.position ?? null };
  }

  // Ranking de jugadores (los ADMIN no compiten). Sin evento, por los puntos
  // totales; con evento, por los puntos ganados en los tags de ese evento.
  // Devuelve el top y, aparte, el puesto de quien pregunta aunque no esté en él.
  async ranking(userId: string, eventId?: number, limit = 50) {
    const filas = await this.prisma.$queryRaw<PuestoRanking[]>`
      WITH puntos AS (
        SELECT u.id, u.nickname, u.avatar_url AS "avatarUrl", u.level_title AS "levelTitle",
               CASE WHEN ${eventId ?? null}::int IS NULL
                    THEN u.total_points
                    ELSE COALESCE(SUM(s.points_earned), 0)::int END AS points,
               COUNT(s.id)::int AS "tagsFound",
               u.created_at
        FROM users u
        -- Con evento, solo cuentan los escaneos de tags de ese evento
        LEFT JOIN (
          scans_history s
          JOIN nfc_tags t ON t.id = s.tag_id
            AND (${eventId ?? null}::int IS NULL OR t.event_id = ${eventId ?? null}::int)
        ) ON s.user_id = u.id
        WHERE u.role = 'USER'
        GROUP BY u.id
      ),
      puestos AS (
        SELECT *, RANK() OVER (ORDER BY points DESC)::int AS position
        FROM puntos
        -- En el ranking de un evento solo aparece quien ha jugado en él
        WHERE ${eventId ?? null}::int IS NULL OR "tagsFound" > 0
      )
      SELECT id, nickname, "avatarUrl", "levelTitle", points, "tagsFound", position
      FROM puestos
      WHERE position <= ${limit} OR id = ${userId}::uuid
      ORDER BY position, created_at
    `;

    return {
      top: filas.filter((fila) => fila.position <= limit),
      me: filas.find((fila) => fila.id === userId) ?? null,
    };
  }

  // Guarda la foto (ya recortada y comprimida por la app) y reemplaza la anterior
  async updateAvatar(id: string, archivo: Express.Multer.File) {
    const user = await this.findOne(id);
    await mkdir(CARPETA_AVATARES, { recursive: true });

    // Nombre nuevo en cada subida: si fuera siempre el mismo, las apps
    // seguirían mostrando la foto vieja desde su caché.
    const extension = archivo.mimetype === 'image/png' ? 'png' : 'jpg';
    const nombre = `${id}-${Date.now()}.${extension}`;
    await writeFile(join(CARPETA_AVATARES, nombre), archivo.buffer);

    if (user.avatarUrl?.startsWith('/uploads/avatars/')) {
      await unlink(join(process.cwd(), user.avatarUrl)).catch(() => undefined);
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: { avatarUrl: `/uploads/avatars/${nombre}` },
    });
    return this.sanitizeUser(updated);
  }

  // Método auxiliar privado para limpiar el hash de la contraseña de las respuestas
  private sanitizeUser(user: any) {
    const { passwordHash, ...result } = user;
    return result;
  }
}